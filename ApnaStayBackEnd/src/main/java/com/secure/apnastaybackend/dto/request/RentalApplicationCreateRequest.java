package com.secure.apnastaybackend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RentalApplicationCreateRequest {

    @NotNull
    private Long propertyId;

    @NotNull
    private BigDecimal proposedRent;

    @NotNull
    private LocalDate moveInDate;

    @NotNull
    @Min(1)
    @Max(60)
    private Integer leaseMonths;

    private BigDecimal securityDeposit;

    private String message;
}

