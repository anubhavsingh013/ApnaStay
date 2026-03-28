package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.LeasePaymentMode;
import com.secure.apnastaybackend.entity.LeasePaymentStatus;
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
public class LeasePaymentDTO {
    private Long id;
    private Long leaseId;
    private String periodMonth;
    private BigDecimal amountDue;
    private BigDecimal amountPaid;
    private LocalDate dueDate;
    private LocalDateTime paidAt;
    private LeasePaymentStatus status;
    private LeasePaymentMode paymentMode;
    private String referenceNote;
    private Long recordedByUserId;
    private String recordedByUserName;
}

