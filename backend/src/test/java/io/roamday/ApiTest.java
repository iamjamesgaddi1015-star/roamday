package io.roamday;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"GEOAPIFY_API_KEY=", "ROAMDAY_ALLOWED_ORIGINS=http://localhost:3000"})
@AutoConfigureMockMvc
class ApiTest {
    @Autowired MockMvc mvc;

    @Test void healthIsAvailableWithoutCredentials() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok"));
    }
    @Test void missingProviderFailsClearly() throws Exception {
        mvc.perform(get("/api/geocode").param("q", "Makati"))
            .andExpect(status().isServiceUnavailable());
    }
    @Test void foreignOriginIsRejected() throws Exception {
        mvc.perform(get("/api/health").header("Origin", "https://invalid.example"))
            .andExpect(status().isForbidden());
    }
    @Test void oversizedBodyIsRejectedBeforeParsing() throws Exception {
        mvc.perform(post("/api/search").contentType("application/json").content("x".repeat(8193)))
            .andExpect(status().isPayloadTooLarge());
    }
    @Test void missingSearchFieldsAreRejected() throws Exception {
        mvc.perform(post("/api/search").contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
    }
}
