package com.secure.apnastaybackend.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PropertyAmenityId implements Serializable {

    private Long propertyId;
    private String amenity;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PropertyAmenityId that = (PropertyAmenityId) o;
        return Objects.equals(propertyId, that.propertyId) && Objects.equals(amenity, that.amenity);
    }

    @Override
    public int hashCode() {
        return Objects.hash(propertyId, amenity);
    }
}
