package com.secure.homefinitybackend.services;

import com.secure.homefinitybackend.dtos.UserDTO;
import com.secure.homefinitybackend.models.Role;
import com.secure.homefinitybackend.models.User;
//import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
//import jakarta.validation.constraints.NotBlank;
//import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Optional;

public interface UserService {
    void updateUserRole(Long userId, String roleName);

    List<User> getAllUsers();

    UserDTO getUserById(Long id);

    User findByUsername(String username);

    void updateAccountLockStatus(Long userId, boolean lock);

    List<Role> getAllRoles();

    void updatePassword(Long userId, String password);

    void updateAccountExpiryStatus(Long userId, boolean expire);

    void updateAccountEnabledStatus(Long userId, boolean enabled);

    void updateCredentialsExpiryStatus(Long userId, boolean expire);

    void generatePasswordResetToken(String email);
//
//    void resetPassword(String token, String newPassword);
//
//    Optional<User> findByEmail(String email);
//
//    User registerUser(User user);

//    GoogleAuthenticatorKey generate2FASecret(Long userId);
//
//    boolean validate2FACode(Long userId, int code);
//
//    void enable2FA(Long userId);
//
//    void disable2FA(Long userId);
//
//    void updateCredentials(User user, String newUsername, String newPassword);
}
