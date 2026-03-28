package com.secure.apnastaybackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaseDashboardDTO {
    private Long leaseId;
    private LocalDate nextDueDate;
    private BigDecimal nextDueAmount;
    private BigDecimal overdueAmount;
    private BigDecimal totalPaid;
    private BigDecimal totalDue;
    private List<LeasePaymentDTO> recentPayments;
}
