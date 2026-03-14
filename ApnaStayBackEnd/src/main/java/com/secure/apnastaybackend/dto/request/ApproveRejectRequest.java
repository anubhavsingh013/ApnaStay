package com.secure.apnastaybackend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Optional body for approve/reject profile (adminNote). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRejectRequest {

    private String adminNote;
}

