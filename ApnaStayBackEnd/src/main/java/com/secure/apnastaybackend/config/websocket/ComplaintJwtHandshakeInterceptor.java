package com.secure.apnastaybackend.config.websocket;

import com.secure.apnastaybackend.security.jwt.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Optionally attaches principal when {@code ?token=} is present on the HTTP handshake.
 * SockJS WebSocket URLs are usually {@code /chat/{server}/{session}/websocket} without query params, so
 * real auth is done on STOMP CONNECT via {@link StompComplaintJwtConnectChannelInterceptor}.
 */
@Component
@RequiredArgsConstructor
public class ComplaintJwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String WS_USERNAME_ATTR = "complaintWsUsername";

    private final JwtUtils jwtUtils;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            org.springframework.http.server.ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return false;
        }
        HttpServletRequest req = servletRequest.getServletRequest();
        String token = req.getParameter("token");
        if (token != null && jwtUtils.validateJwtToken(token)) {
            String username = jwtUtils.getUserNameFromJwtToken(token);
            if (username != null && !username.isBlank()) {
                attributes.put(WS_USERNAME_ATTR, username);
            }
        }
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            org.springframework.http.server.ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }
}
