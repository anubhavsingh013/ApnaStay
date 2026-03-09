package com.secure.homefinitybackend.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "properties")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Property {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @NotBlank(message = "Title is required")
    private String title;
    
    @Column(columnDefinition = "TEXT")
    @NotBlank(message = "Description is required")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", length = 20,nullable = false)
    private PropertyType propertyType;
    
    @Column(nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Price is required")
    private BigDecimal price;
    
    @Column
    private Integer bedrooms;
    
    @Column
    private Integer bathrooms;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal area;

    @Column
    private Double rating = 0.0;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private FurnishingType furnishing;

    @ElementCollection
    @CollectionTable(name = "property_amenities", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "amenity")
    private List<String> amenities = new ArrayList<>();

    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    @Column(name = "tenant_username")
    private String tenantUserName;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;
    
    @Column(nullable = false)
    @NotBlank(message = "Address is required")
    private String address;
    
    @Column(nullable = false)
    @NotBlank(message = "City is required")
    private String city;
    
    @Column(nullable = false)
    @NotBlank(message = "State is required")
    private String state;
    
    @Column(nullable = false)
    @Pattern(regexp = "^[0-9]{6}$", message = "Pin code must be 6 digits")
    private String pinCode;
    
    @ElementCollection
    @CollectionTable(name = "property_images", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "image_url")
    private List<String> images = new ArrayList<>();
    
    @Column(nullable = false)
    @NotBlank(message = "Owner username is required")
    private String ownerUserName;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", referencedColumnName = "user_id")
    private User owner;
    
    @Column
    @Enumerated(EnumType.STRING)
    private PropertyStatus status = PropertyStatus.AVAILABLE;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
