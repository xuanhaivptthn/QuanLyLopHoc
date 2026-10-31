package com.attendance.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitingFilterTest {

    private RateLimitingFilter rateLimitingFilter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        // limit 3 auth requests per minute for easy testing
        rateLimitingFilter = new RateLimitingFilter(true, 3, 5);
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("Should allow requests under the rate limit")
    void shouldAllowRequestsUnderLimit() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should block requests exceeding rate limit with HTTP 429 Too Many Requests")
    void shouldBlockWhenExceedingLimit() throws ServletException, IOException {
        String clientIp = "10.0.0.55";

        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr(clientIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            rateLimitingFilter.doFilterInternal(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 4th request should be blocked
        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedReq.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();

        rateLimitingFilter.doFilterInternal(blockedReq, blockedRes, filterChain);

        assertThat(blockedRes.getStatus()).isEqualTo(429);
        assertThat(blockedRes.getHeader("Retry-After")).isNotNull();
        assertThat(blockedRes.getContentAsString()).contains("Too Many Requests");
        // filterChain should only have been called 3 times, not for the 4th
        verify(filterChain, times(3)).doFilter(any(), any());
    }

    @Test
    @DisplayName("Should not rate limit non-targeted endpoints")
    void shouldNotRateLimitOtherEndpoints() throws ServletException, IOException {
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/classrooms");
            req.setRemoteAddr("10.0.0.60");
            MockHttpServletResponse res = new MockHttpServletResponse();
            rateLimitingFilter.doFilterInternal(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        verify(filterChain, times(10)).doFilter(any(), any());
    }
}
