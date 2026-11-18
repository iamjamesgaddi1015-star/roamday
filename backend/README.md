# Optional provider gateway

Java 21 and Maven 3.9 are required.

```sh
mvn test
mvn package
java -jar target/roamday-api-0.1.0.jar
```

The gateway listens on PORT (default 8080). Set GEOAPIFY_API_KEY using the deployment's secret mechanism. Set ROAMDAY_ALLOWED_ORIGINS to comma-separated exact frontend origins. Set NEXT_PUBLIC_API_BASE_URL when building the frontend to point at this gateway.

GET /api/health is a liveness endpoint. GET /api/geocode?q= searches origins. POST /api/search accepts the contract in ApiModels.java. Missing provider configuration produces an unavailable response.

ROAMDAY_GEO_DAILY_BUDGET defaults to 2000 credits. ROAMDAY_QUOTA_DIR defaults to ./.roamday-quota and must persist across restarts. Requests reserve quota before use and fail closed if state cannot be persisted. Use a single outbound gateway. Multiple instances require a centralized quota and request-spacing mechanism.

ROAMDAY_WEATHER_ENABLED defaults to false. Enable it only for an eligible noncommercial evaluation or replace with a suitable weather provider. Do not use a billed Geoapify project for the zero-spend pilot.

The API applies JSON body size limits, exact origin checks, input validation, bounded provider responses and timeouts. Network/request logging must continue to omit keys, coordinates and raw requests.
