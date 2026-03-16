package com.secure.apnastaybackend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Handles CORS preflight (OPTIONS) requests immediately with 200 OK and CORS headers.
 * This runs first so OPTIONS never hits JWT or authorization — preventing "Full authentication
 * required" on profile update, property create, admin actions, etc.
 * Registered in SecurityConfig to avoid circular dependency with CorsConfigurationSource.
 */
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
        if (config == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader("Origin");
        if (origin != null && config.getAllowedOrigins() != null && (config.getAllowedOrigins().contains("*") || config.getAllowedOrigins().contains(origin))) {
            response.setHeader("Access-Control-Allow-Origin", config.getAllowedOrigins().contains("*") ? "*" : origin);
        } else if (origin != null && config.getAllowedOrigins() != null && !config.getAllowedOrigins().isEmpty()) {
            response.setHeader("Access-Control-Allow-Origin", config.getAllowedOrigins().iterator().next());
        }

        if (config.getAllowCredentials() != null && config.getAllowCredentials()) {
            response.setHeader("Access-Control-Allow-Credentials", "true");
        }
        if (config.getAllowedMethods() != null) {
            response.setHeader("Access-Control-Allow-Methods", String.join(", ", config.getAllowedMethods()));
        }
        if (config.getAllowedHeaders() != null) {
            response.setHeader("Access-Control-Allow-Headers", String.join(", ", config.getAllowedHeaders()));
        }
        if (config.getMaxAge() != null) {
            response.setHeader("Access-Control-Max-Age", String.valueOf(config.getMaxAge()));
        }

        response.setStatus(HttpServletResponse.SC_OK);
    }
}
