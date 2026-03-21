package com.secure.apnastaybackend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;


public class CorsPreflightFilter extends OncePerRequestFilter {

    private final CorsConfigurationSource corsConfigurationSource;

    public CorsPreflightFilter(CorsConfigurationSource corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!"OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);
        String origin = request.getHeader("Origin");

        if (config != null) {
            String allowOrigin = resolveAllowOrigin(config, origin);
            if (StringUtils.hasText(allowOrigin)) {
                response.setHeader("Access-Control-Allow-Origin", allowOrigin);
            }
            if (Boolean.TRUE.equals(config.getAllowCredentials())) {
                response.setHeader("Access-Control-Allow-Credentials", "true");
            }
            if (config.getAllowedMethods() != null) {
                response.setHeader("Access-Control-Allow-Methods", String.join(", ", config.getAllowedMethods()));
            }
            if (config.getAllowedHeaders() != null) {
                response.setHeader("Access-Control-Allow-Headers", String.join(", ", config.getAllowedHeaders()));
            } else {
                response.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-xsrf-token, x-requested-with");
            }
            if (config.getMaxAge() != null) {
                response.setHeader("Access-Control-Max-Age", String.valueOf(config.getMaxAge()));
            }
        } else if (StringUtils.hasText(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-xsrf-token, x-requested-with");
            response.setHeader("Access-Control-Max-Age", "3600");
        }

        response.setStatus(HttpServletResponse.SC_OK);
    }

    private static String resolveAllowOrigin(CorsConfiguration config, String origin) {
        if (!StringUtils.hasText(origin)) {
            return null;
        }
        List<String> origins = config.getAllowedOrigins();
        if (origins != null && (origins.contains("*") || origins.contains(origin))) {
            return origins.contains("*") ? "*" : origin;
        }
        List<String> patterns = config.getAllowedOriginPatterns();
        if (patterns != null) {
            for (String pattern : patterns) {
                if (pattern != null && originMatchesPattern(origin, pattern)) {
                    return origin;
                }
            }
        }
        if (origins != null && !origins.isEmpty()) {
            return origins.iterator().next();
        }
        return null;
    }

    private static boolean originMatchesPattern(String origin, String pattern) {
        if ("*".equals(pattern)) {
            return true;
        }
        if (pattern.contains("*")) {
            String prefix = pattern.substring(0, pattern.indexOf('*'));
            String suffix = pattern.substring(pattern.indexOf('*') + 1);
            return origin.startsWith(prefix) && origin.endsWith(suffix);
        }
        return origin.equals(pattern);
    }
}
