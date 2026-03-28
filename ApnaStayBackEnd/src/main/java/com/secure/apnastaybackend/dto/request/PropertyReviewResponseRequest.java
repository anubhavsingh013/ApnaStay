package com.secure.apnastaybackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PropertyReviewResponseRequest {
    @NotBlank
    private String ownerResponse;
}
