package com.secure.apnastaybackend.config.websocket;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Collections;
import java.util.Map;

@Component
public class ComplaintPrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        Object u = attributes.get(ComplaintJwtHandshakeInterceptor.WS_USERNAME_ATTR);
        if (u instanceof String username && !username.isBlank()) {
            return new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());
        }
        return null;
    }
}
