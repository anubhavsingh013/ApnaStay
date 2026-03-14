package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.dto.response.ProfileListItemDTO;
import com.secure.apnastaybackend.dto.response.UserDTO;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.Role;
import com.secure.apnastaybackend.services.ProfileService;
import com.secure.apnastaybackend.services.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
            @RequestParam String roleName) {
        
        userService.updateUserRole(userId, roleName);
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
            @RequestParam boolean lock) {
        
        userService.updateAccountLockStatus(userId, lock);
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
            @RequestParam boolean expire) {
        
        userService.updateAccountExpiryStatus(userId, expire);
        return ResponseEntity.ok(
            ApiResponse.success("Account expiry status updated successfully")
        );
    }

    @PutMapping("/update-enabled-status")
    public ResponseEntity<ApiResponse<Void>> updateAccountEnabledStatus(
            @RequestParam Long userId, 
            @RequestParam boolean enabled) {
        
        userService.updateAccountEnabledStatus(userId, enabled);
        return ResponseEntity.ok(
            ApiResponse.success("Account enabled status updated successfully")
        );
    }

    @PutMapping("/update-credentials-expiry-status")
    public ResponseEntity<ApiResponse<Void>> updateCredentialsExpiryStatus(
            @RequestParam Long userId, 
            @RequestParam boolean expire) {
        
        userService.updateCredentialsExpiryStatus(userId, expire);
        return ResponseEntity.ok(
            ApiResponse.success("Credentials expiry status updated successfully")
        );
    }

    @PutMapping("/update-password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @RequestParam Long userId, 
            @RequestParam String password) {
        
        userService.updatePassword(userId, password);
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
            @RequestParam(required = false) String adminNote) {
        profileService.approveProfile(role, id, adminNote);
        return ResponseEntity.ok(
            ApiResponse.success("Profile approved successfully")
        );
    }

    @PutMapping("/profiles/{role}/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectProfile(
            @PathVariable AppRole role,
            @PathVariable Long id,
            @RequestParam(required = false) String adminNote) {
        profileService.rejectProfile(role, id, adminNote);
        return ResponseEntity.ok(
            ApiResponse.success("Profile rejected successfully")
        );
    }
}


