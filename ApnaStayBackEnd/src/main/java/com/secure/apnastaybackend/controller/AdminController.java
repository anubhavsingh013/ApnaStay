package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.dto.response.ProfileListItemDTO;
import com.secure.apnastaybackend.dto.response.UserDTO;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.Role;
import com.secure.apnastaybackend.services.AuditLogService;
import com.secure.apnastaybackend.services.ProfileService;
import com.secure.apnastaybackend.services.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@Slf4j
public class AdminController {

    @Autowired
    UserService userService;

    @Autowired
    ProfileService profileService;

    @Autowired
    AuditLogService auditLogService;

    @GetMapping("/getusers")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {
        List<UserDTO> users = userService.getAllUserDtos();
        return ResponseEntity.ok(
            ApiResponse.success("Users retrieved successfully", users)
        );
    }
    @PutMapping("/update-role")
    public ResponseEntity<ApiResponse<Void>> updateUserRole(
            @RequestParam Long userId,
            @RequestParam String roleName,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        userService.updateUserRole(userId, roleName);
        auditLogService.logAction("ADMIN_USER_ROLE_UPDATE", actor(userDetails), null,
                "targetUserId=" + userId + " newRole=" + roleName);
        return ResponseEntity.ok(
            ApiResponse.success("User role updated successfully")
        );
    }
    @GetMapping("/user/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUser(@PathVariable Long id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(
            ApiResponse.success("User retrieved successfully", user)
        );
    }

    @PutMapping("/update-lock-status")
    public ResponseEntity<ApiResponse<Void>> updateAccountLockStatus(
            @RequestParam Long userId, 
            @RequestParam boolean lock,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        userService.updateAccountLockStatus(userId, lock);
        auditLogService.logAction(lock ? "ADMIN_USER_LOCK" : "ADMIN_USER_UNLOCK", actor(userDetails), null,
                "targetUserId=" + userId);
        return ResponseEntity.ok(
            ApiResponse.success("Account lock status updated successfully")
        );
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<Role>>> getAllRoles() {
        List<Role> roles = userService.getAllRoles();
        return ResponseEntity.ok(
            ApiResponse.success("Roles retrieved successfully", roles)
        );
    }
    @PutMapping("/update-expiry-status")
    public ResponseEntity<ApiResponse<Void>> updateAccountExpiryStatus(
            @RequestParam Long userId, 
            @RequestParam boolean expire,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        userService.updateAccountExpiryStatus(userId, expire);
        auditLogService.logAction(expire ? "ADMIN_USER_ACCOUNT_EXPIRE" : "ADMIN_USER_ACCOUNT_EXTEND", actor(userDetails), null,
                "targetUserId=" + userId);
        return ResponseEntity.ok(
            ApiResponse.success("Account expiry status updated successfully")
        );
    }

    @PutMapping("/update-enabled-status")
    public ResponseEntity<ApiResponse<Void>> updateAccountEnabledStatus(
            @RequestParam Long userId, 
            @RequestParam boolean enabled,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        userService.updateAccountEnabledStatus(userId, enabled);
        auditLogService.logAction(enabled ? "ADMIN_USER_ENABLE" : "ADMIN_USER_DISABLE", actor(userDetails), null,
                "targetUserId=" + userId);
        return ResponseEntity.ok(
            ApiResponse.success("Account enabled status updated successfully")
        );
    }

    @PutMapping("/update-credentials-expiry-status")
    public ResponseEntity<ApiResponse<Void>> updateCredentialsExpiryStatus(
            @RequestParam Long userId, 
            @RequestParam boolean expire,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        userService.updateCredentialsExpiryStatus(userId, expire);
        auditLogService.logAction(expire ? "ADMIN_USER_CREDENTIALS_EXPIRE" : "ADMIN_USER_CREDENTIALS_EXTEND", actor(userDetails), null,
                "targetUserId=" + userId);
        return ResponseEntity.ok(
            ApiResponse.success("Credentials expiry status updated successfully")
        );
    }

    @PutMapping("/update-password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @RequestParam Long userId, 
            @RequestParam String password,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        userService.updatePassword(userId, password);
        auditLogService.logAction("ADMIN_USER_PASSWORD_RESET", actor(userDetails), null,
                "targetUserId=" + userId);
        return ResponseEntity.ok(
            ApiResponse.success("Password updated successfully")
        );
    }

    // --- Profile management (admin) ---
    @GetMapping("/profiles")
    public ResponseEntity<ApiResponse<List<ProfileListItemDTO>>> listProfiles(
            @RequestParam(required = false) AppRole role) {
        List<ProfileListItemDTO> list = profileService.listProfiles(role);
        return ResponseEntity.ok(
            ApiResponse.success("Profiles retrieved successfully", list)
        );
    }

    @GetMapping("/profiles/{role}/{id}")
    public ResponseEntity<ApiResponse<ProfileDTO>> getProfile(
            @PathVariable AppRole role,
            @PathVariable Long id) {
        ProfileDTO profile = profileService.getProfileByRoleAndId(role, id);
        return ResponseEntity.ok(
            ApiResponse.success("Profile retrieved successfully", profile)
        );
    }

    @PutMapping("/profiles/{role}/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveProfile(
            @PathVariable AppRole role,
            @PathVariable Long id,
            @RequestParam(required = false) String adminNote,
            @AuthenticationPrincipal UserDetails userDetails) {
        profileService.approveProfile(role, id, adminNote, actor(userDetails));
        return ResponseEntity.ok(
            ApiResponse.success("Profile approved successfully")
        );
    }

    @PutMapping("/profiles/{role}/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectProfile(
            @PathVariable AppRole role,
            @PathVariable Long id,
            @RequestParam(required = false) String adminNote,
            @AuthenticationPrincipal UserDetails userDetails) {
        profileService.rejectProfile(role, id, adminNote, actor(userDetails));
        return ResponseEntity.ok(
            ApiResponse.success("Profile rejected successfully")
        );
    }

    private static String actor(UserDetails userDetails) {
        return userDetails != null && userDetails.getUsername() != null ? userDetails.getUsername() : "unknown";
    }
}


