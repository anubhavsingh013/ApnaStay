package com.secure.apnastaybackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Single profile entity for Owner, Broker, and Tenant (User).
 * One user can have at most one profile per role (user_id + profile_role unique).
 * Type-specific fields are nullable when not applicable for that role.
 */
@Entity
@Table(name = "profiles", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "profile_role"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_role", nullable = false, length = 20)
    private AppRole profileRole;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(length = 20)
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "aadhar_number", length = 12)
    private String aadharNumber;

    @Column(length = 15)
    private String mobile;

    @Column(length = 100)
    @Email
    private String email;

    @Column(name = "firm_name", length = 150)
    private String firmName;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    @Column(name = "id_type", length = 50)
    private String idType;

    @Column(name = "id_number", length = 50)
    private String idNumber;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(name = "pin_code", length = 6)
    @Pattern(regexp = "^[0-9]{6}$", message = "Pin code must be 6 digits")
    private String pinCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProfileStatus status ;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

