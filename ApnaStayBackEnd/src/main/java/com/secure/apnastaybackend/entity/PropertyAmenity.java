package com.secure.apnastaybackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "property_amenities")
@IdClass(PropertyAmenityId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PropertyAmenity {

    @Id
    @Column(name = "property_id", insertable = false, updatable = false)
    private Long propertyId;

    @Id
    @Column(name = "amenity", length = 255)
    private String amenity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;
}
