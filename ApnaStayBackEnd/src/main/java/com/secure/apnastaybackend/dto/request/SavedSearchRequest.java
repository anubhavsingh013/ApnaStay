package com.secure.apnastaybackend.dto.request;

import com.secure.apnastaybackend.entity.FurnishingType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SavedSearchRequest {
    @NotBlank
    private String name;
    private String city;
    private String pinCode;
    private Integer minBedrooms;
    private Integer minBathrooms;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private FurnishingType furnishing;
    private boolean alertsEnabled = true;
}
