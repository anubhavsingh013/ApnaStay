package com.secure.apnastaybackend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ComplaintMarkReadRequest {

    @NotNull
    private Long lastReadMessageId;
}
