package io.roamday;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.server.ResponseStatusException;
import static io.roamday.ApiModels.*;

@RestController
@RequestMapping("/api")
class ApiController {
    private final DiscoveryService discovery;
    private final ProviderClient provider;

    ApiController(DiscoveryService discovery, ProviderClient provider) {
        this.discovery = discovery;
        this.provider = provider;
    }

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/geocode")
    Locations geocode(@RequestParam String q) {
        String query = q.strip();
        if (query.length() < 2 || query.length() > 160 || query.codePoints().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Enter a location between 2 and 160 characters.");
        return new Locations(provider.geocode(query), "Geoapify geocoding");
    }

    @PostMapping(value = "/search", consumes = MediaType.APPLICATION_JSON_VALUE)
    Results search(@Valid @RequestBody Search request) {
        return discovery.search(request);
    }
}

@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> providerError(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).header("Cache-Control", "no-store")
            .body(Map.of("message", error.getReason() == null ? "Live search is unavailable." : error.getReason()));
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class,
        HttpMessageNotReadableException.class, HandlerMethodValidationException.class,
        org.springframework.web.bind.MissingServletRequestParameterException.class})
    ResponseEntity<Map<String, String>> invalid(Exception ignored) {
        return ResponseEntity.badRequest().header("Cache-Control", "no-store")
            .body(Map.of("message", "Check your location, local time, currency and filter ranges."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> unexpected(Exception ignored) {
        return ResponseEntity.status(500).header("Cache-Control", "no-store")
            .body(Map.of("message", "Search is temporarily unavailable. Please try again."));
    }
}
