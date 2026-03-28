package com.secure.apnastaybackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavedPropertyDTO {
    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private java.math.BigDecimal price;
    private String city;
    private String state;
    private LocalDateTime savedAt;
}
