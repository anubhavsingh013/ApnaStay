package com.secure.homefinitybackend.controller;

import com.secure.homefinitybackend.dtos.ApiResponse;
import com.secure.homefinitybackend.dtos.PropertyDTO;
import com.secure.homefinitybackend.dtos.PropertyRequest;
import com.secure.homefinitybackend.services.AuditLogService;
import com.secure.homefinitybackend.services.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/property")
@Slf4j
@Validated
public class PropertyController {
    @Autowired
    PropertyService propertyService;
    @Autowired
    AuditLogService auditLogService;

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
        auditLogService.logPropertyDeletion(userName,propertyId);
        return ResponseEntity.ok(
                ApiResponse.success("Property deleted successfully")
        );
    }
}
