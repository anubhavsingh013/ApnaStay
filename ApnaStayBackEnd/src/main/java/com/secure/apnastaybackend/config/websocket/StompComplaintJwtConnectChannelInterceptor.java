package com.secure.apnastaybackend.config.websocket;

import com.secure.apnastaybackend.security.jwt.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * SockJS often opens {@code /chat/{server}/{session}/websocket} without the original {@code ?token=} query
 * string, so HTTP handshake auth fails or leaves no {@link java.security.Principal}. STOMP always sends a
 * CONNECT frame; we authenticate with JWT in the {@value #STOMP_TOKEN_HEADER} header (or {@code Authorization: Bearer ...}).
 */
@Component
@RequiredArgsConstructor
public class StompComplaintJwtConnectChannelInterceptor implements ChannelInterceptor {

    public static final String STOMP_TOKEN_HEADER = "token";

    private final JwtUtils jwtUtils;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }
        String jwt = firstNativeHeader(accessor, STOMP_TOKEN_HEADER);
        if (jwt == null) {
            jwt = bearerFromAuthorization(firstNativeHeader(accessor, "Authorization"));
        }
        if (jwt == null) {
            jwt = bearerFromAuthorization(firstNativeHeader(accessor, "authorization"));
        }
        if (jwt == null || !jwtUtils.validateJwtToken(jwt)) {
            throw new AccessDeniedException("Missing or invalid token on STOMP CONNECT");
        }
        String username = jwtUtils.getUserNameFromJwtToken(jwt);
        if (username == null || username.isBlank()) {
            throw new AccessDeniedException("Invalid token subject");
        }
        accessor.setUser(new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList()));
        return message;
    }

    private static String firstNativeHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        if (values == null || values.isEmpty()) {
            return null;
        }
        String v = values.get(0);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static String bearerFromAuthorization(String auth) {
        if (auth == null) {
            return null;
        }
        String t = auth.trim();
        if (t.length() > 7 && t.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return t.substring(7).trim();
        }
        return null;
    }
}
