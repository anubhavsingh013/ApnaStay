package com.secure.apnastaybackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "lease_payments", indexes = {
        @Index(name = "idx_lease_payment_lease", columnList = "lease_id"),
        @Index(name = "idx_lease_payment_status", columnList = "status"),
        @Index(name = "idx_lease_payment_period", columnList = "period_month")
})
@Data
@NoArgsConstructor
public class LeasePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lease_id", nullable = false)
    private Lease lease;

    @Column(name = "period_month", nullable = false, length = 7)
    private String periodMonth;

    @Column(name = "amount_due", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "amount_paid", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeasePaymentStatus status = LeasePaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode", length = 15)
    private LeasePaymentMode paymentMode;

    @Column(name = "reference_note", length = 500)
    private String referenceNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by_user_id", referencedColumnName = "user_id")
    private User recordedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}

