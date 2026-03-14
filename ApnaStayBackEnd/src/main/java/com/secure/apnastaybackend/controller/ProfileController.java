package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.ApproveRejectRequest;
import com.secure.apnastaybackend.dto.request.ProfileRequest;
import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.ApprovalStatusResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.services.ProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/profile")
@Slf4j
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    private void validateRoleMatchesCurrentUser(String username, AppRole requestRole) {
        AppRole currentUserRole = profileService.getCurrentUserAppRole(username);
        if (requestRole == null || !requestRole.equals(currentUserRole)) {
            throw new AccessDeniedException("Role in request must match your account role. Your role: " + currentUserRole);
        }
    }

    private void validateAdmin(UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        AppRole currentRole = profileService.getCurrentUserAppRole(userDetails.getUsername());
        if (currentRole != AppRole.ROLE_ADMIN) {
            throw new AccessDeniedException("Admin access required. Your role: " + currentRole);
        }
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<AppRole>>> getAllProfileRoles() {
        List<AppRole> roles = Arrays.asList(
                AppRole.ROLE_OWNER,
                AppRole.ROLE_BROKER,
                AppRole.ROLE_USER
        );
        return ResponseEntity.ok(
                ApiResponse.success("Profile roles retrieved successfully", roles)
        );
    }

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<ProfileDTO>>> listAllProfilesWithDetails(
            @RequestParam(required = false) AppRole role,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        List<ProfileDTO> profiles = profileService.listProfilesWithDetails(role);
        return ResponseEntity.ok(
                ApiResponse.success("Profiles retrieved successfully", profiles)
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileDTO>> getMyProfile(
            @RequestParam(name = "role", required = false) AppRole role,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        if (role == null) {
            throw new BadRequestException("Missing mandatory parameter: role");
        }
        validateRoleMatchesCurrentUser(username, role);
        ProfileDTO dto = profileService.getProfile(username, role);
        return ResponseEntity.ok(
            ApiResponse.success("Profile retrieved successfully", dto)
        );
    }

    @PostMapping("/review")
    public ResponseEntity<ApiResponse<ProfileDTO>> submitForReview(
            @RequestBody ProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        if (request == null || request.getRole() == null) {
            throw new BadRequestException("Missing mandatory parameter: role");
        }
        validateRoleMatchesCurrentUser(username, request.getRole());
        ProfileDTO dto = profileService.submitForReview(username, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            ApiResponse.success("Profile submitted for review", dto)
        );
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileDTO>> updateProfile(
            @RequestBody(required = false) ProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ProfileRequest body = request != null ? request : new ProfileRequest();
        if (body.getRole() == null) {
            body.setRole(profileService.getCurrentUserAppRole(username));
        }
        validateRoleMatchesCurrentUser(username, body.getRole());
        ProfileDTO dto = profileService.updateProfileDetails(username, body.getRole(), body);
        return ResponseEntity.ok(
                ApiResponse.success("Profile updated successfully", dto)
        );
    }

    @GetMapping("/approval-status")
    public ResponseEntity<ApiResponse<ApprovalStatusResponse>> getApprovalStatus(
            @RequestParam(name = "role", required = false) AppRole role,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        if (role == null) {
            throw new BadRequestException("Missing mandatory parameter: role");
        }
        validateRoleMatchesCurrentUser(username, role);
        ApprovalStatusResponse status = profileService.getApprovalStatus(username, role);
        return ResponseEntity.ok(
            ApiResponse.success("Approval status retrieved", status)
        );
    }

    @PutMapping("/{role}/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveProfile(
            @PathVariable AppRole role,
            @PathVariable Long id,
            @RequestBody(required = false) ApproveRejectRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        String adminNote = body != null ? body.getAdminNote() : null;
        profileService.approveProfile(role, id, adminNote);
        return ResponseEntity.ok(
                ApiResponse.success("Profile approved successfully")
        );
    }

    @PutMapping("/{role}/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectProfile(
            @PathVariable AppRole role,
            @PathVariable Long id,
            @RequestBody(required = false) ApproveRejectRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        validateAdmin(userDetails);
        String adminNote = body != null ? body.getAdminNote() : null;
        profileService.rejectProfile(role, id, adminNote);
        return ResponseEntity.ok(
                ApiResponse.success("Profile rejected successfully")
        );
    }
}

