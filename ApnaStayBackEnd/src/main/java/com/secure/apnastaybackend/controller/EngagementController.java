package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.SavedSearchRequest;
import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.SavedPropertyDTO;
import com.secure.apnastaybackend.dto.response.SavedSearchDTO;
import com.secure.apnastaybackend.services.EngagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/engagement")
@RequiredArgsConstructor
public class EngagementController {
    private final EngagementService engagementService;

    @PostMapping("/saved-properties/{propertyId}")
    public ResponseEntity<ApiResponse<SavedPropertyDTO>> saveProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        SavedPropertyDTO dto = engagementService.saveProperty(userDetails.getUsername(), propertyId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Property saved", dto));
    }

    @GetMapping("/saved-properties")
    public ResponseEntity<ApiResponse<List<SavedPropertyDTO>>> listSavedProperties(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Saved properties retrieved",
                engagementService.listSavedProperties(userDetails.getUsername())
        ));
    }

    @DeleteMapping("/saved-properties/{propertyId}")
    public ResponseEntity<ApiResponse<Void>> removeSavedProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        engagementService.removeSavedProperty(userDetails.getUsername(), propertyId);
        return ResponseEntity.ok(ApiResponse.success("Saved property removed"));
    }

    @PostMapping("/saved-searches")
    public ResponseEntity<ApiResponse<SavedSearchDTO>> createSavedSearch(
            @Valid @RequestBody SavedSearchRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SavedSearchDTO dto = engagementService.createSavedSearch(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Saved search created", dto));
    }

    @GetMapping("/saved-searches")
    public ResponseEntity<ApiResponse<List<SavedSearchDTO>>> listSavedSearches(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Saved searches retrieved",
                engagementService.listSavedSearches(userDetails.getUsername())
        ));
    }

    @PutMapping("/saved-searches/{searchId}")
    public ResponseEntity<ApiResponse<SavedSearchDTO>> updateSavedSearch(
            @PathVariable Long searchId,
            @Valid @RequestBody SavedSearchRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SavedSearchDTO dto = engagementService.updateSavedSearch(userDetails.getUsername(), searchId, request);
        return ResponseEntity.ok(ApiResponse.success("Saved search updated", dto));
    }

    @DeleteMapping("/saved-searches/{searchId}")
    public ResponseEntity<ApiResponse<Void>> deleteSavedSearch(
            @PathVariable Long searchId,
            @AuthenticationPrincipal UserDetails userDetails) {
        engagementService.deleteSavedSearch(userDetails.getUsername(), searchId);
        return ResponseEntity.ok(ApiResponse.success("Saved search deleted"));
    }

    @PostMapping("/saved-searches/{searchId}/run-alert-check")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> runAlertCheck(
            @PathVariable Long searchId,
            @AuthenticationPrincipal UserDetails userDetails) {
        int fresh = engagementService.runAlertsForSearch(userDetails.getUsername(), searchId);
        return ResponseEntity.ok(ApiResponse.success("Alert check completed", Map.of("newMatches", fresh)));
    }
}
