package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.PropertyReviewRequest;
import com.secure.apnastaybackend.dto.request.PropertyReviewResponseRequest;
import com.secure.apnastaybackend.dto.response.PropertyReviewDTO;
import com.secure.apnastaybackend.entity.*;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.LeaseRepository;
import com.secure.apnastaybackend.repositories.PropertyRepository;
import com.secure.apnastaybackend.repositories.PropertyReviewRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.PropertyReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyReviewServiceImpl implements PropertyReviewService {
    private final PropertyReviewRepository propertyReviewRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final LeaseRepository leaseRepository;

    @Override
    @Transactional
    public PropertyReviewDTO createReview(String userName, Long propertyId, PropertyReviewRequest request) {
        User reviewer = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        PropertyReview review = new PropertyReview();
        review.setProperty(property);
        review.setReviewer(reviewer);
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        review.setVerifiedStay(leaseRepository.existsByProperty_IdAndTenant_UserIdAndStatus(propertyId, reviewer.getUserId(), LeaseStatus.ACTIVE));
        PropertyReview saved = propertyReviewRepository.save(review);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PropertyReviewDTO> listVisibleReviews(Long propertyId) {
        return propertyReviewRepository.findByProperty_IdAndVisibleTrueOrderByCreatedAtDesc(propertyId)
                .stream().map(this::toDto).toList();
    }

    @Override
    @Transactional
    public PropertyReviewDTO respondToReview(String userName, Long reviewId, PropertyReviewResponseRequest request) {
        User actor = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        PropertyReview review = propertyReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("PropertyReview", "id", reviewId));
        boolean owner = review.getProperty().getOwnerUserName() != null
                && review.getProperty().getOwnerUserName().equals(actor.getUserName());
        if (!owner) {
            throw new BadRequestException("Only property owner can respond to this review");
        }
        review.setOwnerResponse(request.getOwnerResponse().trim());
        return toDto(propertyReviewRepository.save(review));
    }

    @Override
    @Transactional
    public void moderateReview(String adminUserName, Long reviewId, boolean visible) {
        User admin = userRepository.findByUserName(adminUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", adminUserName));
        if (admin.getRole() == null || admin.getRole().getRoleName() != AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Admin access required for moderation");
        }
        PropertyReview review = propertyReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("PropertyReview", "id", reviewId));
        review.setVisible(visible);
        propertyReviewRepository.save(review);
    }

    private PropertyReviewDTO toDto(PropertyReview r) {
        return new PropertyReviewDTO(
                r.getId(),
                r.getProperty().getId(),
                r.getReviewer().getUserName(),
                r.getRating(),
                r.getComment(),
                r.isVerifiedStay(),
                r.getOwnerResponse(),
                r.getCreatedAt()
        );
    }
}
