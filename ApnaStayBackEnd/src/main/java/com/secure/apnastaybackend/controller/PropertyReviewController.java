package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.PropertyReviewRequest;
import com.secure.apnastaybackend.dto.request.PropertyReviewResponseRequest;
import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.PropertyReviewDTO;
import com.secure.apnastaybackend.services.PropertyReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/property-reviews")
@RequiredArgsConstructor
public class PropertyReviewController {
    private final PropertyReviewService propertyReviewService;

    @PostMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<PropertyReviewDTO>> createReview(
            @PathVariable Long propertyId,
            @Valid @RequestBody PropertyReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        PropertyReviewDTO dto = propertyReviewService.createReview(userDetails.getUsername(), propertyId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Review submitted", dto));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<List<PropertyReviewDTO>>> listReviews(@PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Reviews retrieved",
                propertyReviewService.listVisibleReviews(propertyId)
        ));
    }

    @PutMapping("/{reviewId}/owner-response")
    public ResponseEntity<ApiResponse<PropertyReviewDTO>> ownerRespond(
            @PathVariable Long reviewId,
            @Valid @RequestBody PropertyReviewResponseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        PropertyReviewDTO dto = propertyReviewService.respondToReview(userDetails.getUsername(), reviewId, request);
        return ResponseEntity.ok(ApiResponse.success("Owner response updated", dto));
    }

    @PutMapping("/{reviewId}/moderate")
    public ResponseEntity<ApiResponse<Void>> moderate(
            @PathVariable Long reviewId,
            @RequestParam boolean visible,
            @AuthenticationPrincipal UserDetails userDetails) {
        propertyReviewService.moderateReview(userDetails.getUsername(), reviewId, visible);
        return ResponseEntity.ok(ApiResponse.success("Review moderation updated"));
    }
}
