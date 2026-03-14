package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.FurnishingType;
import com.secure.apnastaybackend.entity.PropertyType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Minimal, non-confidential property data for public listing.
 * Excludes: owner name, exact address, pin code, coordinates, tenant info.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PropertyPublicDTO {
    private Long id;
    private String title;
    private PropertyType propertyType;
    private BigDecimal price;
    private Integer bedrooms;
    private Integer bathrooms;
    private BigDecimal area;
    private Double rating;
    private Integer reviewCount;
    private FurnishingType furnishing;
    private List<String> amenities;
    private Boolean isFeatured;
    private String city;
    private String state;
    private List<String> images;
}

