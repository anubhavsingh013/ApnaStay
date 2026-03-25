package com.secure.apnastaybackend.dto.socket;

import lombok.Data;

@Data
public class ComplaintTypingPayload {

    private Long complaintId;
    private Boolean typing;
}
