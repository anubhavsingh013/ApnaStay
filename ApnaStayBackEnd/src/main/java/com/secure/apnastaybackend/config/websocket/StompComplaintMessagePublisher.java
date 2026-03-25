package com.secure.apnastaybackend.config.websocket;

import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.services.ComplaintMessageRealtimePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Broadcasts complaint thread events on STOMP topic {@code /topic/complaint/{complaintId}}.
 * Envelope: {@code { "type": "message"|"typing"|"readReceipt"|"messageDeleted", ... }}.
 */
@RequiredArgsConstructor
public class StompComplaintMessagePublisher implements ComplaintMessageRealtimePublisher {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final SimpMessagingTemplate messagingTemplate;

    public static String topicForComplaint(long complaintId) {
        return "/topic/complaint/" + complaintId;
    }

    private static Map<String, Object> messagePayload(ComplaintMessageDTO dto) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", dto.getId());
        m.put("complaintId", dto.getComplaintId());
        m.put("senderId", dto.getSenderId());
        m.put("senderUserName", dto.getSenderUserName());
        m.put("messageText", dto.getMessageText());
        m.put("deleted", dto.getDeleted() != null && dto.getDeleted());
        if (dto.getCreatedAt() != null) {
            m.put("createdAt", dto.getCreatedAt().format(ISO));
        } else {
            m.put("createdAt", null);
        }
        return m;
    }

    @Override
    public void publishNewMessage(Long complaintId, ComplaintMessageDTO message) {
        if (complaintId == null || message == null) {
            return;
        }
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "message");
        envelope.put("payload", messagePayload(message));
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), (Object) envelope);
    }

    @Override
    public void publishTyping(Long complaintId, String userName, boolean typing) {
        if (complaintId == null || userName == null) {
            return;
        }
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "typing");
        envelope.put("complaintId", complaintId);
        envelope.put("userName", userName);
        envelope.put("typing", typing);
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), (Object) envelope);
    }

    @Override
    public void publishReadReceipt(Long complaintId, String readerUserName, Long lastReadMessageId) {
        if (complaintId == null || readerUserName == null || lastReadMessageId == null) {
            return;
        }
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "readReceipt");
        envelope.put("complaintId", complaintId);
        envelope.put("readerUserName", readerUserName);
        envelope.put("lastReadMessageId", lastReadMessageId);
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), (Object) envelope);
    }

    @Override
    public void publishMessageDeleted(Long complaintId, Long messageId) {
        if (complaintId == null || messageId == null) {
            return;
        }
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "messageDeleted");
        envelope.put("complaintId", complaintId);
        envelope.put("messageId", messageId);
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), (Object) envelope);
    }
}
