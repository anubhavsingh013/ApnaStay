package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.ProfileStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalStatusResponse {
    private boolean approved;
    private ProfileStatus status;
}

