package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.PropertyRequest;
import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.PropertyDTO;
import com.secure.apnastaybackend.dto.response.PropertyPublicDTO;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.PropertyStatus;
import com.secure.apnastaybackend.entity.User;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.AuditLogService;
import com.secure.apnastaybackend.services.PropertyService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/property")
@Slf4j
@Validated
public class PropertyController {
    @Autowired
    PropertyService propertyService;
    @Autowired
    AuditLogService auditLogService;
    @Autowired
    UserRepository userRepository;

    private void validateAdmin(UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        boolean isAdmin = userRepository.findByUserName(userDetails.getUsername())
                .map(u -> u.getRole() != null && u.getRole().getRoleName() == AppRole.ROLE_ADMIN)
                .orElse(false);
        if (!isAdmin) {
            throw new AccessDeniedException("Admin access required.");
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PropertyDTO>> createProperty(
            @Valid @RequestBody PropertyRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String userName = userDetails.getUsername();
        log.info("Creating property for user: {}", userName);

        PropertyDTO property = propertyService.createPropertyForUser(userName, request);
        auditLogService.logPropertyCreation(userName,property);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Property created successfully", property));
    }

    @PutMapping("/{propertyId}")
    public ResponseEntity<ApiResponse<PropertyDTO>> updateProperty(
            @PathVariable Long propertyId,
            @Valid @RequestBody PropertyRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String userName = userDetails.getUsername();
        log.info("Updating property ID: {} for user: {}", propertyId, userName);
        
        PropertyDTO property = propertyService.updatePropertyForUser(propertyId, request, userName);
        auditLogService.logPropertyUpdate(userName,property);
        return ResponseEntity.ok(
                ApiResponse.success("Property updated successfully", property)
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PropertyDTO>>> getPropertiesByOwner(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String userName = userDetails.getUsername();
        log.info("Getting properties for user: {}", userName);
        
        List<PropertyDTO> properties = propertyService.getPropertyByOwnerUserName(userName);
        return ResponseEntity.ok(
                ApiResponse.success(
                        String.format("Found %d properties", properties.size()),
                        properties
                )
        );
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<PropertyPublicDTO>>> getPublicProperties() {
        log.info("Public request for available properties");
        List<PropertyPublicDTO> properties = propertyService.getPublicPropertyListings();
        return ResponseEntity.ok(
                ApiResponse.success(
                        String.format("Found %d available properties", properties.size()),
                        properties
                )
        );
    }

    @GetMapping("/public/featured")
    public ResponseEntity<ApiResponse<List<PropertyPublicDTO>>> getPublicFeaturedProperties() {
        log.info("Public request for featured available properties");
        List<PropertyPublicDTO> properties = propertyService.getPublicFeaturedPropertyListings();
        return ResponseEntity.ok(
                ApiResponse.success(
                        String.format("Found %d featured properties", properties.size()),
                        properties
                )
        );
    }

    @GetMapping("/{propertyId}")
    public ResponseEntity<ApiResponse<PropertyDTO>> getPropertyById(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String userName = userDetails.getUsername();
        log.info("Getting property ID: {} for user: {}", propertyId, userName);
        
        PropertyDTO property = propertyService.getPropertyById(propertyId, userName);
        
        return ResponseEntity.ok(
                ApiResponse.success("Property retrieved successfully", property)
        );
    }

    @DeleteMapping("/{propertyId}")
    public ResponseEntity<ApiResponse<Void>> deleteProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userName = userDetails.getUsername();
        log.info("Deleting property ID: {} for user: {}", propertyId, userName);

        propertyService.deletePropertyForUser(propertyId, userName);
        auditLogService.logPropertyDeletion(userName, propertyId);
        return ResponseEntity.ok(
                ApiResponse.success("Property deleted successfully")
        );
    }

    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<List<PropertyDTO>>> getAllProperties(
            @RequestParam(required = false) PropertyStatus status,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        String username = userDetails.getUsername();
        List<PropertyDTO> properties = propertyService.getAllPropertiesForAdmin(username, status);
        return ResponseEntity.ok(ApiResponse.success(
                String.format("Found %d properties", properties.size()),
                properties
        ));
    }

    @PutMapping("/admin/{propertyId}/approve")
    public ResponseEntity<ApiResponse<PropertyDTO>> approveProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        PropertyDTO dto = propertyService.approveProperty(userDetails.getUsername(), propertyId);
        return ResponseEntity.ok(ApiResponse.success("Property approved successfully", dto));
    }

    @PutMapping("/admin/{propertyId}/reject")
    public ResponseEntity<ApiResponse<PropertyDTO>> rejectProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        PropertyDTO dto = propertyService.rejectProperty(userDetails.getUsername(), propertyId);
        return ResponseEntity.ok(ApiResponse.success("Property rejected successfully", dto));
    }

    @PutMapping("/admin/{propertyId}/status")
    public ResponseEntity<ApiResponse<PropertyDTO>> updatePropertyStatus(
            @PathVariable Long propertyId,
            @RequestParam PropertyStatus status,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        PropertyDTO dto = propertyService.updatePropertyStatus(userDetails.getUsername(), propertyId, status);
        return ResponseEntity.ok(ApiResponse.success("Property status updated successfully", dto));
    }
}

