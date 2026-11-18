package io.roamday;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Bounded body buffering before JSON parsing; no logging or request-payload persistence. */
@Component
@Order(1)
class ApiBoundary extends OncePerRequestFilter {
    static final int MAX_BODY = 8192;
    private final Set<String> origins;

    ApiBoundary(@Value("${ROAMDAY_ALLOWED_ORIGINS:http://localhost:3000}") String origins) {
        this.origins = Set.copyOf(Arrays.stream(origins.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "no-referrer");
        String origin = request.getHeader("Origin");
        if (origin != null) {
            if (!origins.contains(origin)) {
                reject(response, 403, "This app origin is not allowed.");
                return;
            }
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Vary", "Origin");
            response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        }
        if ("OPTIONS".equals(request.getMethod())) {
            response.setStatus(204);
            return;
        }
        if ("POST".equals(request.getMethod())) {
            if (request.getContentLengthLong() > MAX_BODY) {
                reject(response, 413, "Request is too large.");
                return;
            }
            byte[] bytes = request.getInputStream().readNBytes(MAX_BODY + 1);
            if (bytes.length > MAX_BODY) {
                reject(response, 413, "Request is too large.");
                return;
            }
            chain.doFilter(new HttpServletRequestWrapper(request) {
                @Override
                public ServletInputStream getInputStream() {
                    var data = new ByteArrayInputStream(bytes);
                    return new ServletInputStream() {
                        public int read() { return data.read(); }
                        public boolean isFinished() { return data.available() == 0; }
                        public boolean isReady() { return true; }
                        public void setReadListener(ReadListener listener) {
                            throw new UnsupportedOperationException("Synchronous body only.");
                        }
                    };
                }
                @Override
                public BufferedReader getReader() {
                    return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
                }
            }, response);
            return;
        }
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
