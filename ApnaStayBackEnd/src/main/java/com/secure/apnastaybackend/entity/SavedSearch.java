package com.secure.apnastaybackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_searches")
@Data
@NoArgsConstructor
public class SavedSearch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, referencedColumnName = "user_id")
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String city;

    @Column(length = 6)
    private String pinCode;

    private Integer minBedrooms;
    private Integer minBathrooms;

    @Column(precision = 12, scale = 2)
    private BigDecimal minPrice;

    @Column(precision = 12, scale = 2)
    private BigDecimal maxPrice;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private FurnishingType furnishing;

    @Column(nullable = false)
    private boolean alertsEnabled = true;

    private LocalDateTime lastAlertCheckedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
