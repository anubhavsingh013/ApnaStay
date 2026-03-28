package com.secure.apnastaybackend.dto.request;

import com.secure.apnastaybackend.entity.LeasePaymentMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LeasePaymentRecordRequest {

    @NotNull
    private Long paymentId;

    @NotNull
    private BigDecimal amountPaid;

    private LeasePaymentMode paymentMode;

    private String referenceNote;
}

