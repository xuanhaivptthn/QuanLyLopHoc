package com.attendance.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory sliding window rate limiter filter protecting authentication
 * and high-frequency roll-call endpoints against brute force attacks.
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final int authLimitPerMinute;
    private final int checkinLimitPerMinute;
    private final ObjectMapper objectMapper;

    // IP + route category -> Request Counter with expiration timestamp
    private final Map<String, RequestBucket> buckets = new ConcurrentHashMap<>();

    public RateLimitingFilter(
            @Value("${app.security.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.security.rate-limit.auth-limit-per-minute:15}") int authLimitPerMinute,
            @Value("${app.security.rate-limit.checkin-limit-per-minute:30}") int checkinLimitPerMinute) {
        this.enabled = enabled;
        this.authLimitPerMinute = authLimitPerMinute;
        this.checkinLimitPerMinute = checkinLimitPerMinute;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        int limit = getLimitForPath(method, path);
        if (limit > 0) {
            String clientIp = getClientIp(request);
            String category = getCategoryForPath(path);
            String key = clientIp + ":" + category;

            long now = System.currentTimeMillis();
            RequestBucket bucket = buckets.compute(key, (k, existing) -> {
                if (existing == null || now > existing.windowExpiresAt) {
                    return new RequestBucket(now + 60_000L, new AtomicInteger(1));
                }
                existing.counter.incrementAndGet();
                return existing;
            });

            if (bucket.counter.get() > limit) {
                long retryAfterSec = Math.max(1, (bucket.windowExpiresAt - now) / 1000);
                log.warn("Rate limit exceeded for IP {} on path {} (limit: {}/min)", clientIp, path, limit);

                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                response.setHeader("Retry-After", String.valueOf(retryAfterSec));

                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many requests from this IP address. Please try again after " + retryAfterSec + " seconds."
                );
                problem.setTitle("Too Many Requests");
                problem.setType(URI.create("https://api.attendance.local/errors/rate-limit-exceeded"));
                problem.setProperty("timestamp", Instant.now());
                problem.setProperty("retryAfterSeconds", retryAfterSec);

                objectMapper.writeValue(response.getOutputStream(), problem);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private int getLimitForPath(String method, String path) {
        if ("POST".equalsIgnoreCase(method)) {
            if (path.contains("/auth/login") ||
                path.contains("/auth/register-teacher") ||
                path.contains("/auth/register-center") ||
                path.contains("/auth/accept-invite")) {
                return authLimitPerMinute;
            }
            if (path.matches(".*/sessions/[^/]+/check-in.*")) {
                return checkinLimitPerMinute;
            }
        }
        return 0;
    }

    private String getCategoryForPath(String path) {
        if (path.contains("/auth/")) {
            return "auth";
        }
        if (path.contains("/check-in")) {
            return "check-in";
        }
        return "general";
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public void clearBuckets() {
        buckets.clear();
    }

    private static class RequestBucket {
        final long windowExpiresAt;
        final AtomicInteger counter;

        RequestBucket(long windowExpiresAt, AtomicInteger counter) {
            this.windowExpiresAt = windowExpiresAt;
            this.counter = counter;
        }
    }
}
