package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.PropertyRequest;
import com.secure.apnastaybackend.dto.response.PropertyDTO;
import com.secure.apnastaybackend.dto.response.PropertyPublicDTO;
import com.secure.apnastaybackend.entity.PropertyStatus;

import java.util.List;

public interface PropertyService {
    PropertyDTO createPropertyForUser(String userName, PropertyRequest request);

    PropertyDTO updatePropertyForUser(Long propertyId, PropertyRequest request, String userName);

    List<PropertyDTO> getPropertyByOwnerUserName(String ownerUserName);

    PropertyDTO getPropertyById(Long propertyId, String userName);

    void deletePropertyForUser(Long propertyId, String userName);

    /** Admin only: fetch all properties, optionally filtered by status. */
    List<PropertyDTO> getAllPropertiesForAdmin(String userName, PropertyStatus statusFilter);

    /** Admin only: set property status to AVAILABLE. */
    PropertyDTO approveProperty(String userName, Long propertyId);

    /** Admin only: set property status to REJECTED. */
    PropertyDTO rejectProperty(String userName, Long propertyId);

    /** Admin only: update property status to given value. */
    PropertyDTO updatePropertyStatus(String userName, Long propertyId, PropertyStatus status);

    /** Public: list all AVAILABLE properties with minimal, non-confidential fields. */
    List<PropertyPublicDTO> getPublicPropertyListings();

    /** Public: list all AVAILABLE and featured properties with minimal, non-confidential fields. */
    List<PropertyPublicDTO> getPublicFeaturedPropertyListings();
}

