package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.socket.ComplaintReadSocketPayload;
import com.secure.apnastaybackend.dto.socket.ComplaintTypingPayload;
import com.secure.apnastaybackend.services.ComplaintMessageRealtimePublisher;
import com.secure.apnastaybackend.services.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@ConditionalOnBean(SimpMessagingTemplate.class)
@RequiredArgsConstructor
@Slf4j
public class ComplaintStompController {

    private final ComplaintService complaintService;
    private final ComplaintMessageRealtimePublisher complaintMessageRealtimePublisher;

    @MessageMapping("/complaint.typing")
    public void typing(@Payload ComplaintTypingPayload payload, Principal principal) {
        if (principal == null || payload == null || payload.getComplaintId() == null || payload.getTyping() == null) {
            return;
        }
        if (!complaintService.canUserAccessComplaint(principal.getName(), payload.getComplaintId())) {
            return;
        }
        complaintMessageRealtimePublisher.publishTyping(
                payload.getComplaintId(), principal.getName(), Boolean.TRUE.equals(payload.getTyping()));
    }

    @MessageMapping("/complaint.read")
    public void read(@Payload ComplaintReadSocketPayload payload, Principal principal) {
        if (principal == null || payload == null || payload.getComplaintId() == null || payload.getLastReadMessageId() == null) {
            return;
        }
        try {
            complaintService.markThreadRead(principal.getName(), payload.getComplaintId(), payload.getLastReadMessageId());
        } catch (Exception e) {
            log.debug("markThreadRead from STOMP ignored: {}", e.getMessage());
        }
    }
}
