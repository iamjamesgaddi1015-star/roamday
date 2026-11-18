package io.roamday;

import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;

final class ApiModels {
    private ApiModels() {}

    record Search(
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lon,
        @NotNull LocalDate date, @NotNull LocalTime time, @NotBlank @Size(max=64) String timeZone,
        @NotNull @DecimalMin("0.1") @DecimalMax("50") Double radiusKm,
        @NotNull @Min(1) @Max(1440) Integer minutes,
        @PositiveOrZero @Max(100000000) Double budgetMin, @PositiveOrZero @Max(100000000) Double budgetMax,
        @NotBlank @Pattern(regexp="[A-Z]{3}") String currency, @NotBlank @Pattern(regexp="walk|bicycle|drive") String mode,
        @Size(max=16) List<@NotBlank @Size(max=64) String> interests, Boolean indoor
    ) {
        ZonedDateTime start() {
            try {
                var zone = ZoneId.of(timeZone);
                var local = date.atTime(time);
                var offsets = zone.getRules().getValidOffsets(local);
                if (offsets.size() != 1) throw new IllegalArgumentException("Choose a time outside the daylight-saving clock change.");
                return ZonedDateTime.ofStrict(local, offsets.getFirst(), zone);
            } catch (DateTimeException e) {
                throw new IllegalArgumentException("Choose a valid destination time zone.");
            }
        }
        void verify() {
            start();
            if (budgetMin != null && budgetMax != null && budgetMax < budgetMin)
                throw new IllegalArgumentException("Maximum spend must cover the minimum spend.");
            try { Currency.getInstance(currency); }
            catch (IllegalArgumentException e) { throw new IllegalArgumentException("Choose a valid currency."); }
        }
        boolean hasBudget() { return budgetMax != null || (budgetMin != null && budgetMin > 0); }
    }

    record Location(String name, double lat, double lon, String countryCode, String timeZone) {}
    record Locations(List<Location> places, String message) {}
    record Weather(String summary, int precipitationProbability, double temperatureC, Instant checkedAt) {}
    record Legs(int outbound, int inbound, boolean fareUnknown) {}
    record Candidate(String id, String name, double lat, double lon, String category, Boolean indoor,
                     int visit, Double price, String priceCurrency, String hours, String website, String menu,
                     String booking, String address, Instant checkedAt) {}
    record Place(String id, String name, double lat, double lon, String category, Boolean indoor, double distanceKm,
                 Double priceMin, Double priceMax, String currency, Integer outboundMin, int visitMin, Integer returnMin,
                 String fit, List<String> reasons, String hours, String website, String menuUrl, String bookingUrl,
                 String address, String source, Instant checkedAt) {}
    record Results(List<Place> places, Weather weather, String message) {}
}
