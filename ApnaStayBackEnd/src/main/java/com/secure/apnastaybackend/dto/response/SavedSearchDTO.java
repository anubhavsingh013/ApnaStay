package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.FurnishingType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavedSearchDTO {
    private Long id;
    private String name;
    private String city;
    private String pinCode;
    private Integer minBedrooms;
    private Integer minBathrooms;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private FurnishingType furnishing;
    private boolean alertsEnabled;
    private LocalDateTime lastAlertCheckedAt;
    private LocalDateTime createdAt;
}
