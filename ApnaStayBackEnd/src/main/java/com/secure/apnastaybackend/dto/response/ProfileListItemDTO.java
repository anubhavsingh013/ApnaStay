package com.secure.apnastaybackend.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.ProfileStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Summary DTO for admin profile list (any profile role). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileListItemDTO {
    private AppRole profileRole;
    private Long id;
    private Long userId;
    private String userName;
    private String displayName;
    private ProfileStatus status;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime submittedAt;
}

