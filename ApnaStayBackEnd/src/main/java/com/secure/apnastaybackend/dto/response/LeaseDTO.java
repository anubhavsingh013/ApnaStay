package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.LeaseStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaseDTO {
    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private Long tenantId;
    private String tenantUserName;
    private Long ownerId;
    private String ownerUserName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal monthlyRent;
    private BigDecimal securityDeposit;
    private Integer dueDayOfMonth;
    private LeaseStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<LeasePaymentDTO> payments;
}

