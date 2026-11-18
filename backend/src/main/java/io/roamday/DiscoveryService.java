package io.roamday;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static io.roamday.ApiModels.*;

@Service
class DiscoveryService {
    private final ProviderClient provider;
    private final Semaphore active = new Semaphore(6);

    DiscoveryService(ProviderClient provider) { this.provider = provider; }

    Results search(Search q) {
        q.verify();
        if(!active.tryAcquire()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many active searches. Try again shortly.");
        try {
            return find(q);
        } finally { active.release(); }
    }

    private Results find(Search q) {
        List<Candidate> nearby = provider.nearby(q);
        Set<String> ids = new HashSet<>(), names = new HashSet<>();
        var sorted = nearby.stream().filter(c->distance(q,c)<=q.radiusKm())
            .filter(c->ids.add(c.id()) && names.add(c.name().toLowerCase(Locale.ROOT)+"|"+Math.round(c.lat()*10000)+"|"+Math.round(c.lon()*10000)))
            .filter(c->c.visit()<=q.minutes() && matchesInterest(q.interests(),c))
            .filter(c->!Boolean.TRUE.equals(q.indoor()) || !Boolean.FALSE.equals(c.indoor()))
            .sorted(Comparator.comparingDouble(c->distance(q,c))).toList();
        var candidates = diverse(sorted,8);
        try(var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<Weather> forecast = executor.submit(()->provider.weather(q));
            var futures = new LinkedHashMap<Candidate,Future<Legs>>();
            for(var c:candidates) futures.put(c,executor.submit(()->provider.route(q,c)));
            var weather = partial(forecast);
            List<Place> matches = new ArrayList<>();
            for(var pair : futures.entrySet()) {
                var place = evaluate(q,pair.getKey(),partial(pair.getValue()),weather);
                if(place!=null) matches.add(place);
            }
            matches.sort(Comparator.comparing((Place p)->!"match".equals(p.fit()))
                    .thenComparingInt(p->weather!=null && weather.precipitationProbability()>=50 && !Boolean.TRUE.equals(p.indoor()) ? 1:0)
                    .thenComparingDouble(Place::distanceKm));
            String message = matches.isEmpty() ? "No places with enough available time were found for these filters. Try a wider radius or a longer visit."
                : "Geoapify and OpenStreetMap listings. Visit durations are planning estimates.";
            if (matches.stream().anyMatch(p->"uncertain".equals(p.fit()))) message += " Some details need confirmation.";
            return new Results(matches,weather,message);
        }
    }

    private static List<Candidate> diverse(List<Candidate> sorted,int limit) {
        var top = new LinkedHashSet<Candidate>();
        Set<String> categories = new HashSet<>();
        for (Candidate c: sorted) if(categories.add(c.category()) && top.size()<limit) top.add(c);
        for (Candidate c: sorted) {
            if(top.size()==limit) break;
            top.add(c);
        }
        return List.copyOf(top);
    }

    private static <T> T partial(Future<T> future) {
        try {
            return future.get();
        } catch(ExecutionException e) {
            if(e.getCause() instanceof ResponseStatusException) return null;
            throw new IllegalStateException("Unable to evaluate provider response.");
        } catch(InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Search was interrupted.");
        }
    }

    static Place evaluate(Search q,Candidate c,Legs route,Weather weather) {
        List<String> reasons = new ArrayList<>();
        if (route == null) reasons.add("Round-trip route unavailable.");
        if (route != null && route.outbound()+c.visit()+route.inbound()>q.minutes()) return null;
        Boolean open = route==null?null:OpeningHours.covers(c.hours(),q.start().plusMinutes(route.outbound()),c.visit());
        if(Boolean.FALSE.equals(open)) return null;
        if(open==null) reasons.add("Opening hours for the whole visit need confirmation.");
        boolean sameCurrency = c.price()!=null && (c.price()==0 || q.currency().equals(c.priceCurrency()));
        if(q.hasBudget()) {
            if(!sameCurrency) reasons.add("Total price in your selected currency is unknown.");
            if(sameCurrency && q.budgetMax()!=null && c.price()>q.budgetMax()) return null;
            boolean travelPriceUnknown = route == null || route.fareUnknown();
            if(travelPriceUnknown) reasons.add("Travel or parking costs need confirmation.");
            if(sameCurrency && !travelPriceUnknown && q.budgetMin()!=null && c.price()<q.budgetMin()) return null;
        }
        if(Boolean.TRUE.equals(q.indoor()) && c.indoor()==null) reasons.add("Indoor access needs confirmation.");
        boolean fits = reasons.isEmpty();
        if(fits) reasons.add("Published hours and estimated round-trip time fit your window.");
        if(weather!=null && weather.precipitationProbability()>=50 && Boolean.TRUE.equals(c.indoor()))
            reasons.add("Indoor activity. Travel to the venue may be exposed to rain.");
        if(c.price()!=null) reasons.add("Mapped admission price per person. Optional purchases are extra.");
        return new Place(c.id(),c.name(),c.lat(),c.lon(),c.category(),c.indoor(),distance(q,c),c.price(),c.price(),
            c.priceCurrency()==null?q.currency():c.priceCurrency(),route==null?null:route.outbound(),c.visit(),route==null?null:route.inbound(),
            fits?"match":"uncertain",List.copyOf(reasons),c.hours(),c.website(),c.menu(),c.booking(),c.address(),"Geoapify · OpenStreetMap contributors",c.checkedAt());
    }

    private static boolean matchesInterest(List<String> interests,Candidate candidate) {
        if(interests==null || interests.isEmpty()) return true;
        var text = fold(candidate.category()+" "+candidate.name());
        for(var term:interests) {
            var key=fold(term);
            List<String> words = switch (key) {
                case "cafes","coffee" -> List.of("cafe","coffee");
                case "food" -> List.of("restaurant","food","market");
                case "art & culture" -> List.of("art","museum","culture","gallery");
                case "outdoors" -> List.of("park","garden","trail","outdoor");
                case "fitness" -> List.of("sport","fitness","gym");
                case "shopping" -> List.of("shop","mall","market");
                default -> List.of(key);
            };
            if(words.stream().anyMatch(text::contains))return true;
        }
        return false;
    }

    private static String fold(String s) {
        return Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}+","").toLowerCase(Locale.ROOT);
    }

    static double distance(Search q,Candidate c) {
        double lat=Math.toRadians(c.lat()-q.lat()),lon=Math.toRadians(c.lon()-q.lon());
        double h=Math.pow(Math.sin(lat/2),2)+Math.cos(Math.toRadians(q.lat()))*Math.cos(Math.toRadians(c.lat()))*Math.pow(Math.sin(lon/2),2);
        return 12742*Math.asin(Math.sqrt(Math.clamp(h,0,1)));
    }
}
