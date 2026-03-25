package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.services.ComplaintMessageRealtimePublisher;

/** No-op implementation when STOMP broker is disabled (e.g. tests). */
public class NoOpComplaintMessageRealtimePublisher implements ComplaintMessageRealtimePublisher {

    @Override
    public void publishNewMessage(Long complaintId, ComplaintMessageDTO message) {
        // no-op
    }
}
