package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.PropertyRequest;
import com.secure.apnastaybackend.dto.response.PropertyDTO;
import com.secure.apnastaybackend.dto.response.PropertyPublicDTO;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.Property;
import com.secure.apnastaybackend.entity.PropertyImageFile;
import com.secure.apnastaybackend.entity.PropertyStatus;
import com.secure.apnastaybackend.entity.User;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ProfileNotApprovedException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.exceptions.UnauthorizedException;
import com.secure.apnastaybackend.repositories.PropertyImageFileRepository;
import com.secure.apnastaybackend.repositories.PropertyRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.ProfileService;
import com.secure.apnastaybackend.services.PropertyImageUploadValidator;
import com.secure.apnastaybackend.services.PropertyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PropertyServiceImpl implements PropertyService {
    
    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private PropertyImageFileRepository propertyImageFileRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileService profileService;

    @Autowired
    private PropertyImageUploadValidator propertyImageUploadValidator;

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    @Override
    @Transactional
    public PropertyDTO createPropertyForUser(String userName, PropertyRequest request) {
        log.info("Creating property for user: {}", userName);
        
        if (userName == null || userName.trim().isEmpty()) {
            throw new BadRequestException("Username cannot be empty");
        }

        if (!profileService.isProfileApproved(userName, AppRole.ROLE_OWNER) && !isAdmin(userName)) {
            throw new ProfileNotApprovedException("Your owner profile must be approved before you can add properties. Please submit your profile and wait for admin approval.");
        }
        
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));

        Property property = getProperty(userName, request, user);

        Property savedProperty = propertyRepository.save(property);
        log.info("Property created successfully with ID: {} for user: {}", savedProperty.getId(), userName);
        
        return convertToDTO(savedProperty);
    }

    @Override
    @Transactional
    public PropertyDTO createPropertyWithUploadedImages(String userName, PropertyRequest request, List<MultipartFile> imageFiles) {
        log.info("Creating property with uploaded images for user: {}", userName);

        if (userName == null || userName.trim().isEmpty()) {
            throw new BadRequestException("Username cannot be empty");
        }

        if (!profileService.isProfileApproved(userName, AppRole.ROLE_OWNER) && !isAdmin(userName)) {
            throw new ProfileNotApprovedException("Your owner profile must be approved before you can add properties. Please submit your profile and wait for admin approval.");
        }

        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));

        Property property = getProperty(userName, request, user);
        attachUploadedImages(property, imageFiles);

        Property savedProperty = propertyRepository.save(property);
        log.info("Property created with {} stored image(s), id: {}", imageFiles != null ? imageFiles.size() : 0, savedProperty.getId());
        return convertToDTO(savedProperty);
    }

    private void attachUploadedImages(Property property, List<MultipartFile> imageFiles) {
        if (imageFiles == null || imageFiles.isEmpty()) {
            return;
        }
        propertyImageUploadValidator.validateFileCount(imageFiles.size());
        int order = 0;
        for (MultipartFile file : imageFiles) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            propertyImageUploadValidator.validateFile(file);
            try {
                byte[] bytes = file.getBytes();
                PropertyImageFile img = new PropertyImageFile();
                img.setProperty(property);
                img.setData(bytes);
                img.setContentType(resolveStoredContentType(file.getContentType(), bytes));
                img.setSortOrder(order++);
                property.getImageFiles().add(img);
            } catch (IOException e) {
                log.error("Failed to read image bytes", e);
                throw new BadRequestException("Could not read an uploaded image.");
            }
        }
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
        property.setStatus(PropertyStatus.PENDING);
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

        boolean isAdmin = isAdmin(userName);
        boolean isPropertyOwner = property.getOwnerUserName().equals(userName);

        if (!isPropertyOwner && !isAdmin) {
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
    @Transactional
    public PropertyDTO updatePropertyWithUploadedImages(Long propertyId, PropertyRequest request, String userName, List<MultipartFile> imageFiles) {
        log.info("Updating property ID: {} with imageFiles part present: {}", propertyId, imageFiles != null);

        if (propertyId == null || propertyId <= 0) {
            throw new BadRequestException("Invalid property ID");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));

        boolean isAdminUser = isAdmin(userName);
        boolean isPropertyOwner = property.getOwnerUserName().equals(userName);

        if (!isPropertyOwner && !isAdminUser) {
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

        if (imageFiles != null) {
            property.getImageFiles().clear();
            attachUploadedImages(property, imageFiles);
        }

        Property updatedProperty = propertyRepository.save(property);
        log.info("Property ID: {} updated successfully for user: {}", propertyId, userName);
        return convertToDTO(updatedProperty);
    }

    @Override
    @Transactional(readOnly = true)
    public PropertyImageFile getImageFileForDownload(Long imageFileId, String authenticatedUsernameOrNull) {
        PropertyImageFile file = propertyImageFileRepository.findByIdWithProperty(imageFileId)
                .orElseThrow(() -> new ResourceNotFoundException("PropertyImageFile", "id", imageFileId));

        Property p = file.getProperty();
        if (p.getStatus() == PropertyStatus.AVAILABLE) {
            return file;
        }
        if (authenticatedUsernameOrNull != null && isAdmin(authenticatedUsernameOrNull)) {
            return file;
        }
        if (authenticatedUsernameOrNull != null && p.getOwnerUserName().equals(authenticatedUsernameOrNull)) {
            return file;
        }
        throw new UnauthorizedException("You are not authorized to view this image");
    }

    boolean isAdmin(String userName){
        return userRepository.findByUserName(userName)
                .map(u -> u.getRole() != null && u.getRole().getRoleName() == AppRole.ROLE_ADMIN)
                .orElse(false);
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

    @Override
    @Transactional(readOnly = true)
    public List<PropertyDTO> getAllPropertiesForAdmin(String userName, PropertyStatus statusFilter) {
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (user.getRole() == null || user.getRole().getRoleName() != AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Admin access required to list all properties");
        }
        List<Property> properties = statusFilter != null
                ? propertyRepository.findByStatus(statusFilter)
                : propertyRepository.findAll();
        return properties.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PropertyPublicDTO> getPublicPropertyListings() {
        log.info("Fetching public property listings (AVAILABLE only)");
        List<Property> properties = propertyRepository.findByStatus(PropertyStatus.AVAILABLE);
        return properties.stream()
                .map(this::convertToPublicDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PropertyPublicDTO> getPublicFeaturedPropertyListings() {
        log.info("Fetching public featured property listings (AVAILABLE and featured)");
        List<Property> properties = propertyRepository.findByStatusAndIsFeatured(PropertyStatus.AVAILABLE, true);
        return properties.stream()
                .map(this::convertToPublicDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PropertyDTO approveProperty(String userName, Long propertyId) {
        return updatePropertyStatus(userName, propertyId, PropertyStatus.AVAILABLE);
    }

    @Override
    @Transactional
    public PropertyDTO rejectProperty(String userName, Long propertyId) {
        return updatePropertyStatus(userName, propertyId, PropertyStatus.REJECTED);
    }

    @Override
    @Transactional
    public PropertyDTO updatePropertyStatus(String userName, Long propertyId, PropertyStatus status) {
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (user.getRole() == null || user.getRole().getRoleName() != AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Admin access required to update property status");
        }
        if (status == null) {
            throw new BadRequestException("Status is required");
        }
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        property.setStatus(status);
        Property saved = propertyRepository.save(property);
        log.info("Property {} status updated to {} by admin {}", propertyId, status, userName);
        return convertToDTO(saved);
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
        dto.setImages(buildMergedImageUrls(property));
        dto.setOwnerUserName(property.getOwnerUserName());
        dto.setStatus(property.getStatus());
        dto.setCreatedAt(property.getCreatedAt());
        dto.setUpdatedAt(property.getUpdatedAt());
        return dto;
    }

    private PropertyPublicDTO convertToPublicDTO(Property property) {
        PropertyPublicDTO dto = new PropertyPublicDTO();
        dto.setId(property.getId());
        dto.setTitle(property.getTitle());
        dto.setPropertyType(property.getPropertyType());
        dto.setPrice(property.getPrice());
        dto.setBedrooms(property.getBedrooms());
        dto.setBathrooms(property.getBathrooms());
        dto.setArea(property.getArea());
        dto.setRating(property.getRating());
        dto.setReviewCount(property.getReviewCount());
        dto.setFurnishing(property.getFurnishing());
        dto.setAmenities(property.getAmenities() != null ? property.getAmenities() : java.util.Collections.emptyList());
        dto.setIsFeatured(property.getIsFeatured() != null ? property.getIsFeatured() : false);
        dto.setCity(property.getCity());
        dto.setState(property.getState());
        dto.setImages(buildMergedImageUrls(property));
        return dto;
    }

    private List<String> buildMergedImageUrls(Property property) {
        List<String> out = new ArrayList<>();
        if (property.getImages() != null) {
            for (String u : property.getImages()) {
                if (u != null && !u.trim().isEmpty()) {
                    out.add(u.trim());
                }
            }
        }
        if (property.getImageFiles() != null) {
            for (PropertyImageFile f : property.getImageFiles()) {
                out.add(buildPublicImageFileUrl(f.getId()));
            }
        }
        return out;
    }

    private String buildPublicImageFileUrl(Long fileId) {
        String path = "/api/property/image-file/" + fileId;
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return path;
        }
        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        return base + path;
    }

    /** Align with {@link com.secure.apnastaybackend.services.PropertyImageUploadValidator} after bytes are known. */
    private static String resolveStoredContentType(String raw, byte[] b) {
        String d = raw != null ? raw.toLowerCase(Locale.ROOT).trim() : "";
        if ("image/jpg".equals(d)) d = "image/jpeg";
        if (!d.isBlank() && !"application/octet-stream".equals(d)) {
            return d;
        }
        if (b.length >= 2 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8) return "image/jpeg";
        if (b.length >= 8 && b[0] == (byte) 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return "image/png";
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F') return "image/gif";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return "application/octet-stream";
    }
}

