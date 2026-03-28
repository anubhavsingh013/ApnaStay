package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.PropertyReviewRequest;
import com.secure.apnastaybackend.dto.request.PropertyReviewResponseRequest;
import com.secure.apnastaybackend.dto.response.PropertyReviewDTO;

import java.util.List;

public interface PropertyReviewService {
    PropertyReviewDTO createReview(String userName, Long propertyId, PropertyReviewRequest request);
    List<PropertyReviewDTO> listVisibleReviews(Long propertyId);
    PropertyReviewDTO respondToReview(String userName, Long reviewId, PropertyReviewResponseRequest request);
    void moderateReview(String adminUserName, Long reviewId, boolean visible);
}
