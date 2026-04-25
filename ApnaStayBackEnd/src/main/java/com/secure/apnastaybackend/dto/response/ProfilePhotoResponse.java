package com.secure.apnastaybackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfilePhotoResponse {
    private Long userId;
    private String profilePictureUrl;
}
