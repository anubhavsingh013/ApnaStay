package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.PropertyRequest;
import com.secure.apnastaybackend.dto.response.PropertyDTO;
import com.secure.apnastaybackend.dto.response.PropertyPublicDTO;
import com.secure.apnastaybackend.entity.PropertyImageFile;
import com.secure.apnastaybackend.entity.PropertyStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface PropertyService {
    PropertyDTO createPropertyForUser(String userName, PropertyRequest request);

    PropertyDTO updatePropertyForUser(Long propertyId, PropertyRequest request, String userName);

    /**
     * Create property and attach uploaded image files (stored as LONGBLOB). Also supports external URLs in {@code request.images}.
     *
     * @param imageFiles optional; each file validated (type, size, count).
     */
    PropertyDTO createPropertyWithUploadedImages(String userName, PropertyRequest request, List<MultipartFile> imageFiles);

    /**
     * Update property fields. If {@code imageFiles} is non-null, replaces all DB-stored images: empty list removes them;
     * omitted ({@code null}) leaves stored images unchanged. External URLs in {@code request.images} still apply to the element-collection field.
     */
    PropertyDTO updatePropertyWithUploadedImages(Long propertyId, PropertyRequest request, String userName, List<MultipartFile> imageFiles);

    /** Load stored image bytes if the requester may access this property’s image (AVAILABLE, or owner, or admin). */
    PropertyImageFile getImageFileForDownload(Long imageFileId, String authenticatedUsernameOrNull);

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

