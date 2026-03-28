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
@Table(name = "rental_applications", indexes = {
        @Index(name = "idx_rental_app_property", columnList = "property_id"),
        @Index(name = "idx_rental_app_tenant", columnList = "tenant_id"),
        @Index(name = "idx_rental_app_owner", columnList = "owner_id"),
        @Index(name = "idx_rental_app_status", columnList = "status")
})
@Data
@NoArgsConstructor
public class RentalApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false, referencedColumnName = "user_id")
    private User tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, referencedColumnName = "user_id")
    private User owner;

    @Column(name = "proposed_rent", nullable = false, precision = 12, scale = 2)
    private BigDecimal proposedRent;

    @Column(name = "move_in_date", nullable = false)
    private LocalDate moveInDate;

    @Column(name = "lease_months", nullable = false)
    private Integer leaseMonths;

    @Column(name = "security_deposit", precision = 12, scale = 2)
    private BigDecimal securityDeposit;

    @Column(name = "message_text", length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RentalApplicationStatus status = RentalApplicationStatus.PENDING;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}

