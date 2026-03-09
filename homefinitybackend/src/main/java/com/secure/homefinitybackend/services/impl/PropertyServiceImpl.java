package com.secure.homefinitybackend.services.impl;

import com.secure.homefinitybackend.dtos.PropertyDTO;
import com.secure.homefinitybackend.dtos.PropertyRequest;
import com.secure.homefinitybackend.exceptions.BadRequestException;
import com.secure.homefinitybackend.exceptions.ResourceNotFoundException;
import com.secure.homefinitybackend.exceptions.UnauthorizedException;
import com.secure.homefinitybackend.models.Property;
import com.secure.homefinitybackend.models.User;
import com.secure.homefinitybackend.repositories.PropertyRepository;
import com.secure.homefinitybackend.repositories.UserRepository;
import com.secure.homefinitybackend.services.PropertyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PropertyServiceImpl implements PropertyService {
    
    @Autowired
    private PropertyRepository propertyRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public PropertyDTO createPropertyForUser(String userName, PropertyRequest request) {
        log.info("Creating property for user: {}", userName);
        
        if (userName == null || userName.trim().isEmpty()) {
            throw new BadRequestException("Username cannot be empty");
        }
        
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));

        Property property = getProperty(userName, request, user);

        Property savedProperty = propertyRepository.save(property);
        log.info("Property created successfully with ID: {} for user: {}", savedProperty.getId(), userName);
        
        return convertToDTO(savedProperty);
    }

    private static Property getProperty(String userName, PropertyRequest request, User user) {
        Property property = new Property();
        property.setTitle(request.getTitle());
        property.setDescription(request.getDescription());
        property.setPropertyType(request.getPropertyType());
        property.setPrice(request.getPrice());
        property.setBedrooms(request.getBedrooms());
        property.setBathrooms(request.getBathrooms());
        property.setArea(request.getArea());
        property.setRating(request.getRating() != null ? request.getRating() : 0.0);
        property.setReviewCount(request.getReviewCount() != null ? request.getReviewCount() : 0);
        property.setFurnishing(request.getFurnishing());
        property.setAmenities(request.getAmenities() != null ? request.getAmenities() : new java.util.ArrayList<>());
        property.setIsFeatured(request.getIsFeatured() != null ? request.getIsFeatured() : false);
        property.setTenantUserName(request.getTenantUserName());
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());
        property.setAddress(request.getAddress());
        property.setCity(request.getCity());
        property.setState(request.getState());
        property.setPinCode(request.getPinCode());
        property.setImages(request.getImages() != null ? request.getImages() : new java.util.ArrayList<>());
        property.setOwnerUserName(userName);
        property.setOwner(user);
        return property;
    }

    @Override
    @Transactional
    public PropertyDTO updatePropertyForUser(Long propertyId, PropertyRequest request, String userName) {
        log.info("Updating property ID: {} for user: {}", propertyId, userName);
        
        if (propertyId == null || propertyId <= 0) {
            throw new BadRequestException("Invalid property ID");
        }
        
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        
        if (!property.getOwnerUserName().equals(userName)) {
            log.warn("User {} attempted to update property {} owned by {}", 
                    userName, propertyId, property.getOwnerUserName());
            throw new UnauthorizedException("You are not authorized to update this property");
        }
        
        property.setTitle(request.getTitle());
        property.setDescription(request.getDescription());
        property.setPropertyType(request.getPropertyType());
        property.setPrice(request.getPrice());
        property.setBedrooms(request.getBedrooms());
        property.setBathrooms(request.getBathrooms());
        property.setArea(request.getArea());
        if (request.getRating() != null) property.setRating(request.getRating());
        if (request.getReviewCount() != null) property.setReviewCount(request.getReviewCount());
        property.setFurnishing(request.getFurnishing());
        if (request.getAmenities() != null) property.setAmenities(request.getAmenities());
        if (request.getIsFeatured() != null) property.setIsFeatured(request.getIsFeatured());
        property.setTenantUserName(request.getTenantUserName());
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());
        property.setAddress(request.getAddress());
        property.setCity(request.getCity());
        property.setState(request.getState());
        property.setPinCode(request.getPinCode());
        if (request.getImages() != null) property.setImages(request.getImages());

        Property updatedProperty = propertyRepository.save(property);
        
        log.info("Property ID: {} updated successfully for user: {}", propertyId, userName);
        return convertToDTO(updatedProperty);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PropertyDTO> getPropertyByOwnerUserName(String ownerUserName) {
        log.info("Fetching properties for user: {}", ownerUserName);
        
        if (ownerUserName == null || ownerUserName.trim().isEmpty()) {
            throw new BadRequestException("Username cannot be empty");
        }
        
        List<Property> properties = propertyRepository.findByOwnerUserName(ownerUserName);
        log.info("Found {} properties for user: {}", properties.size(), ownerUserName);
        
        return properties.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PropertyDTO getPropertyById(Long propertyId, String userName) {
        log.info("Fetching property ID: {} for user: {}", propertyId, userName);
        
        if (propertyId == null || propertyId <= 0) {
            throw new BadRequestException("Invalid property ID");
        }
        
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        
        if (!property.getOwnerUserName().equals(userName)) {
            log.warn("User {} attempted to access property {} owned by {}", 
                    userName, propertyId, property.getOwnerUserName());
            throw new UnauthorizedException("You are not authorized to access this property");
        }
        
        log.info("Property ID: {} retrieved successfully for user: {}", propertyId, userName);
        return convertToDTO(property);
    }

    @Override
    @Transactional
    public void deletePropertyForUser(Long propertyId, String userName) {
        log.info("Deleting property ID: {} for user: {}", propertyId, userName);
        
        if (propertyId == null || propertyId <= 0) {
            throw new BadRequestException("Invalid property ID");
        }
        
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        
        if (!property.getOwnerUserName().equals(userName)) {
            log.warn("User {} attempted to delete property {} owned by {}", 
                    userName, propertyId, property.getOwnerUserName());
            throw new UnauthorizedException("You are not authorized to delete this property");
        }
        
        propertyRepository.delete(property);
        log.info("Property ID: {} deleted successfully for user: {}", propertyId, userName);
    }
    
    private PropertyDTO convertToDTO(Property property) {
        PropertyDTO dto = new PropertyDTO();
        dto.setId(property.getId());
        dto.setTitle(property.getTitle());
        dto.setDescription(property.getDescription());
        dto.setPropertyType(property.getPropertyType());
        dto.setPrice(property.getPrice());
        dto.setBedrooms(property.getBedrooms());
        dto.setBathrooms(property.getBathrooms());
        dto.setArea(property.getArea());
        dto.setRating(property.getRating());
        dto.setReviewCount(property.getReviewCount());
        dto.setFurnishing(property.getFurnishing());
        dto.setAmenities(property.getAmenities());
        dto.setIsFeatured(property.getIsFeatured());
        dto.setTenantUserName(property.getTenantUserName());
        dto.setLatitude(property.getLatitude());
        dto.setLongitude(property.getLongitude());
        dto.setAddress(property.getAddress());
        dto.setCity(property.getCity());
        dto.setState(property.getState());
        dto.setPinCode(property.getPinCode());
        dto.setImages(property.getImages());
        dto.setOwnerUserName(property.getOwnerUserName());
        dto.setStatus(property.getStatus());
        dto.setCreatedAt(property.getCreatedAt());
        dto.setUpdatedAt(property.getUpdatedAt());
        return dto;
    }
}
