package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.RentalApplicationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalApplicationDTO {
    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private Long tenantId;
    private String tenantUserName;
    private Long ownerId;
    private String ownerUserName;
    private BigDecimal proposedRent;
    private LocalDate moveInDate;
    private Integer leaseMonths;
    private BigDecimal securityDeposit;
    private String message;
    private RentalApplicationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

