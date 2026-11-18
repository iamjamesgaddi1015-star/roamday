package io.roamday;

import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import static io.roamday.ApiModels.*;

@Component
class ProviderClient {
    private static final String GEO = "https://api.geoapify.com";
    private static final String METEO = "https://api.open-meteo.com/v1/forecast";
    private static final String CATEGORIES = "catering.cafe,catering.restaurant,entertainment.museum,entertainment.culture,leisure.park,tourism.attraction,sport";
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final String key;
    private final boolean weatherEnabled;
    private final ProviderLimits geo, meteo;
    private final TimedCache<List<Candidate>> areas = new TimedCache<>(Duration.ofMinutes(15));
    private final TimedCache<JsonNode> forecasts = new TimedCache<>(Duration.ofMinutes(30));

    ProviderClient(ObjectMapper mapper, @Value("${GEOAPIFY_API_KEY:}") String key,
                   @Value("${ROAMDAY_WEATHER_ENABLED:false}") boolean weatherEnabled,
                   @Value("${ROAMDAY_QUOTA_DIR:./.roamday-quota}") String directory,
                   @Value("${ROAMDAY_GEO_DAILY_BUDGET:2000}") int geoBudget) {
        this.mapper = mapper;
        this.key = key;
        this.weatherEnabled = weatherEnabled;
        geo = new ProviderLimits(Path.of(directory, "geo"), Math.clamp(geoBudget, 0, 2500), 275, Clock.systemUTC());
        meteo = new ProviderLimits(Path.of(directory, "weather"), 1000, 1200, Clock.systemUTC());
    }

    boolean configured() { return !key.isBlank(); }

    List<Location> geocode(String text) {
        JsonNode response = geo("/v1/geocode/search", Map.of("text",text,"limit","5","format","json"), 1);
        List<Location> out = new ArrayList<>();
        for (JsonNode item : response.path("results")) {
            if (coords(item)) {
                out.add(new Location(item.path("formatted").asText(), item.get("lat").asDouble(), item.get("lon").asDouble(),
                    item.path("country_code").asText("").toUpperCase(Locale.ROOT), item.at("/timezone/name").textValue()));
            }
        }
        return out;
    }

    List<Candidate> nearby(Search q) {
        // Snap the upstream area for reusable public results, then apply the user's exact radius locally.
        String center = rounded(q.lon()) + "," + rounded(q.lat());
        int meters = (int)Math.ceil(q.radiusKm() * 1000) + 850;
        return areas.get(center + ":" + meters, () -> {
            JsonNode response = geo("/v2/places", Map.of("categories", CATEGORIES, "filter","circle:" + center + "," + meters,
                "bias","proximity:" + center,"limit","60"), 3);
            List<Candidate> result = new ArrayList<>();
            for (JsonNode item : response.path("features")) {
                Candidate p = candidate(item.path("properties"));
                if (p != null) result.add(p);
            }
            return List.copyOf(result);
        });
    }

    private static Candidate candidate(JsonNode p) {
        String id = field(p, "place_id"), name = field(p, "name");
        if (id == null || name == null || !coords(p)) return null;
        JsonNode raw = p.at("/datasource/raw");
        String tags = p.path("categories").toString();
        String category;
        if (tags.contains("catering.cafe")) category = "Café";
        else if (tags.contains("catering.restaurant")) category = "Restaurant";
        else if (tags.contains("leisure.park")) category = "Park";
        else if (tags.contains("museum")) category = "Museum";
        else if (tags.contains("gallery") || tags.contains("culture")) category = "Arts & culture";
        else if (tags.contains("sport")) category = "Sport";
        else category = "Attraction";
        Boolean indoor = switch (raw.path("indoor").asText("")) {
            case "yes" -> Boolean.TRUE; case "no" -> Boolean.FALSE; default -> null;
        };
        if ("Park".equals(category) && indoor == null) indoor = false;
        boolean admissionOnly = !Set.of("Café","Restaurant").contains(category);
        Double price = admissionOnly && "no".equals(raw.path("fee").asText()) ? 0d : null;
        String priceCurrency = null;
        String charge = field(raw,"charge");
        if (admissionOnly && charge != null && charge.matches("[0-9]{1,7}(?:[.][0-9]{1,2})? [A-Z]{3}")) {
            String[] parts = charge.split(" ");
            price = Double.valueOf(parts[0]);
            priceCurrency = parts[1];
        }
        return new Candidate(id,name,p.get("lat").doubleValue(),p.get("lon").doubleValue(),category,indoor,
            switch (category) { case "Café", "Park" -> 30; case "Restaurant", "Arts & culture" -> 45; default -> 60; },
            price,priceCurrency,first(field(p,"opening_hours"),field(raw,"opening_hours")),
            safeLink(first(field(p,"website"),field(raw,"website"),field(raw,"contact:website"))),
            safeLink(first(field(raw,"website:menu"),field(raw,"contact:menu"),field(raw,"menu:website"))),
            safeLink(first(field(raw,"reservation:website"),field(raw,"website:booking"),field(raw,"reservation"))),
            p.path("formatted").asText(""),Instant.now());
    }

    Legs route(Search q, Candidate c) {
        String start = q.lat() + "," + q.lon();
        JsonNode response = geo("/v1/routing", Map.of("waypoints", start + "|" + c.lat() + "," + c.lon() + "|" + start,
                "mode",q.mode(),"format","json"), 5);
        JsonNode route = response.at("/results/0"), legs = route.path("legs");
        if (legs.size() != 2) return null;
        JsonNode out = legs.get(0).path("time"), back = legs.get(1).path("time");
        if (!out.isNumber() || !back.isNumber() || out.asDouble() < 0 || back.asDouble() < 0) return null;
        return new Legs((int)Math.ceil(out.asDouble()/60), (int)Math.ceil(back.asDouble()/60),
            route.path("ferry").asBoolean() || route.path("toll").asBoolean() || "drive".equals(q.mode()));
    }

    Weather weather(Search q) {
        if (!weatherEnabled) return null;
        ZonedDateTime start = q.start(), end = start.plusMinutes(q.minutes());
        long firstHour = Math.floorDiv(start.toEpochSecond(),3600)*3600;
        long lastHour = Math.floorDiv(end.toEpochSecond()-1,3600)*3600;
        LocalDate utcDate = start.withZoneSameInstant(ZoneOffset.UTC).toLocalDate();
        String startDate = utcDate.toString(), endDate = Instant.ofEpochSecond(lastHour).atZone(ZoneOffset.UTC).toLocalDate().toString();
        if (utcDate.isBefore(LocalDate.now(ZoneOffset.UTC).minusDays(1)) || utcDate.isAfter(LocalDate.now(ZoneOffset.UTC).plusDays(15))) return null;
        String lat = rounded(q.lat()), lon = rounded(q.lon());
        JsonNode data = forecasts.get(String.join("/",lat,lon,startDate,endDate), () -> fetch(METEO,Map.of("latitude",lat,"longitude",lon,
            "start_date",startDate,"end_date",endDate,"timeformat","unixtime","timezone","GMT",
            "hourly","temperature_2m,precipitation_probability"),meteo,1));
        JsonNode hourly = data.path("hourly"), times = hourly.path("time");
        int maxRain = -1, count = 0;
        double hottest = -100;
        for (int i = 0; i < times.size(); i++) {
            long t = times.path(i).asLong();
            if (t < firstHour || t > lastHour) continue;
            JsonNode rain = hourly.path("precipitation_probability").path(i), temp = hourly.path("temperature_2m").path(i);
            if (!rain.isNumber() || !temp.isNumber()) return null;
            maxRain = Math.max(maxRain,rain.asInt());
            hottest = Math.max(hottest,temp.asDouble());
            count++;
        }
        if (count != (lastHour-firstHour)/3600 + 1 || maxRain < 0) return null;
        return new Weather(maxRain >= 50 ? "Rain likely during your outing" : maxRain >= 25 ? "A chance of showers" : "Low chance of rain",
            maxRain,hottest,Instant.now());
    }

    private JsonNode geo(String path, Map<String,String> args, int cost) {
        if (key.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Live place search is not configured.");
        var params = new HashMap<>(args);
        params.put("apiKey",key);
        return fetch(GEO + path, params,geo,cost);
    }

    private JsonNode fetch(String url, Map<String,String> params, ProviderLimits limits, int cost) {
        String query = params.entrySet().stream().map(e -> encode(e.getKey()) + "=" + encode(e.getValue())).collect(Collectors.joining("&"));
        HttpRequest request = HttpRequest.newBuilder(URI.create(url + "?" + query)).timeout(Duration.ofSeconds(5))
            .header("Accept","application/json").header("User-Agent","Roamday/0.1").GET().build();
        limits.acquire(cost);
        try {
            var response = http.send(request,HttpResponse.BodyHandlers.ofInputStream());
            try (var body = response.body()) {
            if (response.statusCode() == 429) {
                String header = response.headers().firstValue("Retry-After").orElse("60");
                Duration backoff = Duration.ofSeconds(60);
                try {
                    backoff = Duration.ofSeconds(Math.max(1,Integer.parseInt(header)));
                } catch (NumberFormatException ignored) {
                    try {
                        Duration interval = Duration.between(Instant.now(),ZonedDateTime.parse(header,java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME).toInstant());
                        if (interval.isPositive()) backoff = interval;
                    } catch (DateTimeException invalidDate) { /* use conservative default */ }
                }
                limits.backoff(backoff);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"The live data provider is busy. Please try later.");
            }
            if (response.statusCode() != 200) throw upstream();
            byte[] bytes = body.readNBytes(4_000_001);
            if (bytes.length > 4_000_000) throw upstream();
            return mapper.readTree(bytes);
            }
        } catch (java.io.IOException e) {
            throw upstream();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw upstream();
        } finally {
            limits.release();
        }
    }

    private static ResponseStatusException upstream() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,"The live data provider is unavailable.");
    }

    static String safeLink(String link) {
        if (link == null || link.length()>2048) return null;
        try {
            URI uri = URI.create(link);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost()!=null && uri.getRawUserInfo()==null ? uri.toASCIIString() : null;
        } catch (IllegalArgumentException e) { return null; }
    }

    private static boolean coords(JsonNode n) {
        return n.path("lat").isNumber() && n.path("lon").isNumber() && Math.abs(n.get("lat").asDouble()) <= 90 && Math.abs(n.get("lon").asDouble())<=180;
    }
    private static String encode(String s) { return URLEncoder.encode(s,StandardCharsets.UTF_8); }
    private static String rounded(double value) { return String.format(Locale.ROOT,"%.2f",value); }
    private static String field(JsonNode node, String key) {
        String s = node.path(key).textValue();
        return s == null || s.isBlank() ? null : s;
    }
    private static String first(String... choices) {
        for (var s: choices) if (s != null) return s;
        return null;
    }

    private static final class TimedCache<T> {
        private record Entry<T>(Instant expires,T value) {}
        private final LinkedHashMap<String,Entry<T>> entries = new LinkedHashMap<>(64,0.75f,true);
        private final Duration ttl;
        TimedCache(Duration ttl) { this.ttl=ttl; }
        T get(String key, Supplier<T> loader) {
            synchronized (entries) {
                Entry<T> e = entries.get(key);
                if (e != null && e.expires().isAfter(Instant.now())) return e.value();
            }
            T value = loader.get();
            synchronized (entries) {
                entries.put(key,new Entry<>(Instant.now().plus(ttl),value));
                while(entries.size()>256) entries.pollFirstEntry();
            }
            return value;
        }
    }
}
