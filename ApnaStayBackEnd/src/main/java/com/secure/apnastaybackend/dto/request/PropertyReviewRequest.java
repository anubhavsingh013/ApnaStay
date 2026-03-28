package com.secure.apnastaybackend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PropertyReviewRequest {
    @Min(1)
    @Max(5)
    private Integer rating;
    @NotBlank
    private String comment;
}
