package com.secure.apnastaybackend.dto.socket;

import lombok.Data;

@Data
public class ComplaintChatSendPayload {

    private Long complaintId;
    private String messageText;
}
