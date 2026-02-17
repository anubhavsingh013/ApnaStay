package com.secure.homefinitybackend.controller;

import com.secure.homefinitybackend.dtos.ApiResponse;
import com.secure.homefinitybackend.dtos.UserDTO;
import com.secure.homefinitybackend.models.Role;
import com.secure.homefinitybackend.models.User;
import com.secure.homefinitybackend.services.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@Slf4j
public class AdminController {

    @Autowired
    UserService userService;

    @GetMapping("/getusers")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = userService.getAllUsers();
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
}

