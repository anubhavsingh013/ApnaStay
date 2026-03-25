package com.secure.apnastaybackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintReadReceiptDTO {

    private String userName;
    private Long lastReadMessageId;
}
