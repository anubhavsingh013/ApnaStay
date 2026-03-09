package com.secure.homefinitybackend.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.secure.homefinitybackend.models.FurnishingType;
import com.secure.homefinitybackend.models.PropertyStatus;
import com.secure.homefinitybackend.models.PropertyType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PropertyDTO {
    private Long id;
    private String title;
    private String description;
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
    private String tenantUserName;
    private Double latitude;
    private Double longitude;
    private String address;
    private String city;
    private String state;
    private String pinCode;
    private List<String> images;
    private String ownerUserName;
    private PropertyStatus status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}