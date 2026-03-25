package com.secure.apnastaybackend.dto.socket;

import lombok.Data;

@Data
public class ComplaintReadSocketPayload {

    private Long complaintId;
    private Long lastReadMessageId;
}
