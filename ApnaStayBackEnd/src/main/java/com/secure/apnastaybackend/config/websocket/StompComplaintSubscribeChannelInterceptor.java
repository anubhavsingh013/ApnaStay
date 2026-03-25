package com.secure.apnastaybackend.config.websocket;

import com.secure.apnastaybackend.services.ComplaintService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class StompComplaintSubscribeChannelInterceptor implements ChannelInterceptor {

    private static final String TOPIC_PREFIX = "/topic/complaint/";

    private final ComplaintService complaintService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            if (accessor.getUser() == null) {
                throw new AccessDeniedException("STOMP CONNECT requires authenticated WebSocket session");
            }
            return message;
        }
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String dest = accessor.getDestination();
            if (dest != null && dest.startsWith(TOPIC_PREFIX)) {
                String suffix = dest.substring(TOPIC_PREFIX.length());
                long complaintId;
                try {
                    complaintId = Long.parseLong(suffix);
                } catch (NumberFormatException e) {
                    throw new AccessDeniedException("Invalid complaint topic");
                }
                Principal user = accessor.getUser();
                if (user == null || !complaintService.canUserAccessComplaint(user.getName(), complaintId)) {
                    throw new AccessDeniedException("Cannot subscribe to this complaint topic");
                }
            }
        }
        return message;
    }
}
