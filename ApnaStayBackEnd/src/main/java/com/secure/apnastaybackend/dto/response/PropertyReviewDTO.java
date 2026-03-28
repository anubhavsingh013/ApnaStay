package com.secure.apnastaybackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PropertyReviewDTO {
    private Long id;
    private Long propertyId;
    private String reviewerUserName;
    private Integer rating;
    private String comment;
    private boolean verifiedStay;
    private String ownerResponse;
    private LocalDateTime createdAt;
}
