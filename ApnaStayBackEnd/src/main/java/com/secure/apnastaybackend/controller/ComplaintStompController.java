package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.ComplaintMessageRequest;
import com.secure.apnastaybackend.dto.socket.ComplaintChatSendPayload;
import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.dto.socket.ComplaintReadSocketPayload;
import com.secure.apnastaybackend.dto.socket.ComplaintTypingPayload;
import com.secure.apnastaybackend.security.jwt.JwtUtils;
import com.secure.apnastaybackend.services.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.LinkedHashMap;
import java.util.Map;

@Controller
@ConditionalOnBean(SimpMessagingTemplate.class)
@RequiredArgsConstructor
@Slf4j
public class ComplaintStompController {

    private static final int MESSAGE_MAX_LEN = 2000;

    private final ComplaintService complaintService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtils jwtUtils;

    private String stompUserName(SimpMessageHeaderAccessor headers) {
        if (headers == null) {
            return null;
        }
        if (headers.getUser() != null && headers.getUser().getName() != null && !headers.getUser().getName().isBlank()) {
            return headers.getUser().getName();
        }
        String token = headers.getFirstNativeHeader("token");
        if (token == null || token.isBlank()) {
            token = headers.getFirstNativeHeader("login");
        }
        if (token == null || token.isBlank()) {
            String auth = headers.getFirstNativeHeader("Authorization");
            if (auth != null && auth.regionMatches(true, 0, "Bearer ", 0, 7)) {
                token = auth.substring(7).trim();
            }
        }
        if (token == null || token.isBlank() || !jwtUtils.validateJwtToken(token)) {
            return null;
        }
        String userName = jwtUtils.getUserNameFromJwtToken(token);
        return (userName == null || userName.isBlank()) ? null : userName;
    }

    @MessageMapping("/complaint/{complaintId}/send")
    public void sendMessage(
            @DestinationVariable Long complaintId,
            @Payload ComplaintMessageRequest payload,
            SimpMessageHeaderAccessor headerAccessor) {
        String userName = stompUserName(headerAccessor);
        if (userName == null || complaintId == null || payload == null) {
            return;
        }
        String raw = payload.getMessageText();
        if (raw == null) {
            return;
        }
        String text = raw.trim();
        if (text.isEmpty() || text.length() > MESSAGE_MAX_LEN) {
            return;
        }
        if (!complaintService.canUserAccessComplaint(userName, complaintId)) {
            return;
        }
        try {
            complaintService.addMessage(userName, complaintId, new ComplaintMessageRequest(text));
        } catch (Exception e) {
            log.warn("STOMP complaint.send failed for user {} complaint {}: {}", userName, complaintId, e.getMessage());
        }
    }

    /** Compatibility mapping for clients that publish to /app/complaint.send with complaintId in payload. */
    @MessageMapping("/complaint.send")
    public void sendMessageCompat(@Payload ComplaintChatSendPayload payload, SimpMessageHeaderAccessor headerAccessor) {
        String userName = stompUserName(headerAccessor);
        if (userName == null || payload == null || payload.getComplaintId() == null) {
            return;
        }
        String raw = payload.getMessageText();
        if (raw == null) {
            return;
        }
        String text = raw.trim();
        if (text.isEmpty() || text.length() > MESSAGE_MAX_LEN) {
            return;
        }
        if (!complaintService.canUserAccessComplaint(userName, payload.getComplaintId())) {
            return;
        }
        try {
            complaintService.addMessage(userName, payload.getComplaintId(), new ComplaintMessageRequest(text));
        } catch (Exception e) {
            log.warn("STOMP complaint.send compat failed for user {} complaint {}: {}", userName, payload.getComplaintId(), e.getMessage());
        }
    }

    @MessageMapping("/complaint.typing")
    public void typing(@Payload ComplaintTypingPayload payload, SimpMessageHeaderAccessor headerAccessor) {
        String userName = stompUserName(headerAccessor);
        if (userName == null || payload == null || payload.getComplaintId() == null || payload.getTyping() == null) {
            return;
        }
        if (!complaintService.canUserAccessComplaint(userName, payload.getComplaintId())) {
            return;
        }
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "typing");
        envelope.put("complaintId", payload.getComplaintId());
        envelope.put("userName", userName);
        envelope.put("typing", Boolean.TRUE.equals(payload.getTyping()));
        messagingTemplate.convertAndSend("/topic/complaint/" + payload.getComplaintId(), (Object) envelope);
    }

    @MessageMapping("/complaint.read")
    public void read(@Payload ComplaintReadSocketPayload payload, SimpMessageHeaderAccessor headerAccessor) {
        String userName = stompUserName(headerAccessor);
        if (userName == null || payload == null || payload.getComplaintId() == null || payload.getLastReadMessageId() == null) {
            return;
        }
        try {
            complaintService.markThreadRead(userName, payload.getComplaintId(), payload.getLastReadMessageId());
        } catch (Exception e) {
            log.debug("markThreadRead from STOMP ignored: {}", e.getMessage());
        }
    }
}
