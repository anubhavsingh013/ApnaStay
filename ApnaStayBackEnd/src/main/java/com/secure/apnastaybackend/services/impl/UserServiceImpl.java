package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.response.UserDTO;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.PasswordResetToken;
import com.secure.apnastaybackend.entity.Role;
import com.secure.apnastaybackend.entity.User;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.PasswordResetTokenRepository;
import com.secure.apnastaybackend.repositories.RoleRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.TotpService;
import com.secure.apnastaybackend.services.UserService;
import com.secure.apnastaybackend.utils.EmailService;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class UserServiceImpl implements UserService {
    @Value("${frontend.url}")
    String frontendUrl;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    EmailService emailService;

    @Autowired
    TotpService totpService;


    @Override
    public void updateUserRole(Long userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        AppRole appRole = AppRole.valueOf(roleName);
        Role role = roleRepository.findByRoleName(appRole)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleName));
        user.setRole(role);
        userRepository.save(user);
        log.info("Updated role for user {} to {}", userId, roleName);
    }


    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public List<UserDTO> getAllUserDtos() {
        return userRepository.findAll().stream()
                .map(this::convertToDto)
                .toList();
    }

    @Override
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return convertToDto(user);
    }

    @Override
    public User findByUsername(String username) {
        Optional<User> user = userRepository.findByUserName(username);
        return user
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    private UserDTO convertToDto(User user) {
        return new UserDTO(
                user.getUserId(),
                user.getUserName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getPhoneVerified(),
                user.isAccountNonLocked(),
                user.isAccountNonExpired(),
                user.isCredentialsNonExpired(),
                user.isEnabled(),
                user.getCredentialsExpiryDate(),
                user.getAccountExpiryDate(),
                user.getTwoFactorSecret(),
                user.isTwoFactorEnabled(),
                user.getSignUpMethod(),
                user.getRole(),
                user.getCreatedDate(),
                user.getUpdatedDate()
        );
    }
    @Override
    public void updateAccountLockStatus(Long userId, boolean lock) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setAccountNonLocked(!lock);
        userRepository.save(user);
        log.info("Updated account lock status for user {} to {}", userId, lock);
    }

    @Override
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    @Override
    public void updatePassword(Long userId, String password) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
            user.setPassword(passwordEncoder.encode(password));
            userRepository.save(user);
            log.info("Password updated successfully for user {}", userId);
    }


    @Override
    public void updateAccountExpiryStatus(Long userId, boolean expire) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setAccountNonExpired(!expire);
        userRepository.save(user);
        log.info("Updated account expiry status for user {} to {}", userId, expire);
    }

    @Override
    public void updateAccountEnabledStatus(Long userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setEnabled(enabled);
        userRepository.save(user);
        log.info("Updated account enabled status for user {} to {}", userId, enabled);
    }

    @Override
    public void updateCredentialsExpiryStatus(Long userId, boolean expire) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setCredentialsNonExpired(!expire);
        userRepository.save(user);
        log.info("Updated credentials expiry status for user {} to {}", userId, expire);
    }

    @Override
    public void generatePasswordResetToken(String email){
        User user = userRepository.findByEmail(email).
                orElseThrow(()-> new BadRequestException("User not found with email: "+email));

        String token = UUID.randomUUID().toString();
        Instant expiryDate= Instant.now().plus(24, ChronoUnit.HOURS);
        PasswordResetToken passwordResetToken = new PasswordResetToken(token, expiryDate, user);
        passwordResetTokenRepository.save(passwordResetToken);

        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        // send email to user
        try{
            emailService.sendPasswordResetEmail(user.getEmail(), resetUrl);
            log.info("Password ResetEmail send successfully");
        } catch (Exception ex){
            log.debug("Failed to send password reset email to: {}", email);
            throw ex;
        }

    }

    @Override
    public void resetPassword(String token, String newPassword) { // update the password in the database
        // token should not be expired
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(()-> new RuntimeException("Invalid password reset token"));
        if(resetToken.isUsed()){
            throw new RuntimeException("Password reset token has already been used");
        }
        if(resetToken.getExpiryDate().isBefore(Instant.now())){
            throw new RuntimeException("Password reset token has expired");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public User registerUser(User user) {
        if(user.getPassword()!=null){
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userRepository.save(user);
    }

    @Override
    public GoogleAuthenticatorKey generate2FASecret(Long userId){
        User user=userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        GoogleAuthenticatorKey key = totpService.generateSecret();
        user.setTwoFactorSecret(key.getKey());
        userRepository.save(user);
        return key;
    }

    @Override
    public boolean validate2FACode(Long userId, int code){
        User user=userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return totpService.verifyCode(user.getTwoFactorSecret(), code);
    }
    @Override
    public void enable2FA(Long userId){
        User user=userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        user.setTwoFactorEnabled(true);
        userRepository.save(user);
        System.out.println("2FA enabled");
    }
    @Override
    public void disable2FA(Long userId){
        User user=userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        user.setTwoFactorEnabled(false);
        userRepository.save(user);
        System.out.println("2FA disabled");
    }

    @Override
    public void updateCredentials(User user, String newUsername, String newPassword) {
        user.setUserName(newUsername);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}

