package com.secure.homefinitybackend.controller;

import com.secure.homefinitybackend.dtos.ApiResponse;
import com.secure.homefinitybackend.dtos.PhoneLoginRequest;
import com.secure.homefinitybackend.dtos.PhoneVerificationRequest;
import com.secure.homefinitybackend.exceptions.BadRequestException;
import com.secure.homefinitybackend.exceptions.ResourceNotFoundException;
import com.secure.homefinitybackend.models.AppRole;
import com.secure.homefinitybackend.models.Role;
import com.secure.homefinitybackend.models.User;
import com.secure.homefinitybackend.repositories.RoleRepository;
import com.secure.homefinitybackend.repositories.UserRepository;
import com.secure.homefinitybackend.security.jwt.JwtUtils;
import com.secure.homefinitybackend.security.request.LoginRequest;
import com.secure.homefinitybackend.security.request.SignupRequest;
import com.secure.homefinitybackend.security.response.LoginResponse;
import com.secure.homefinitybackend.security.response.UserInfoResponse;
import com.secure.homefinitybackend.security.services.UserDetailsImpl;
//import com.secure.homefinitybackend.services.TotpService;
import com.secure.homefinitybackend.services.PhoneAuthService;
import com.secure.homefinitybackend.services.UserService;
//import com.secure.homefinitybackend.util.AuthUtil;
//import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.ResponseEntity.ok;

@RestController
//@CrossOrigin(origins = "http://localhost:3000", maxAge = 3600, allowCredentials="true")
@RequestMapping("/api/auth") // all the endpoints related to authentication
public class AuthController {

    @Autowired
    JwtUtils jwtUtils;
    @Autowired
    UserService userService;
    @Autowired
    AuthenticationManager authenticationManager;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RoleRepository roleRepository;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    PhoneAuthService phoneAuthService;
//    @Autowired
//    AuthUtil authUtil;

//    @Autowired
//    TotpService totpService;

    @PostMapping("/public/signin")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        Authentication authentication;
        try {
            authentication = authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()));
        } catch (LockedException exception) {
            Map<String, Object> map = new HashMap<>();
            map.put("message", "Your account has been locked. Please contact support to unlock it.");
            map.put("status", false);
            return new ResponseEntity<>(map, HttpStatus.FORBIDDEN);
        } catch (AuthenticationException exception) {
            Map<String, Object> map = new HashMap<>();
            map.put("message", "Invalid username or password");
            map.put("status", false);
            return new ResponseEntity<>(map, HttpStatus.UNAUTHORIZED);
        }

        // set the authentication
        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // issuing jwt token
        String jwtToken = jwtUtils.generateTokenFromUsername(userDetails);

        // Collect roles from the UserDetails
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        // Prepare the response body, now including the JWT token directly in the body
        LoginResponse response = new LoginResponse(userDetails.getUsername(), roles, jwtToken);

        // Return the response entity with the JWT token included in the response body
        return ok(response);
    }

    @PostMapping("/public/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        
        // Validate that at least email OR phone number is provided
        if ((signUpRequest.getEmail() == null || signUpRequest.getEmail().isEmpty()) && 
            (signUpRequest.getPhoneNumber() == null || signUpRequest.getPhoneNumber().isEmpty())) {
            throw new BadRequestException("Error: Either email or phone number must be provided!");
        }
        
        // Check if username already exists
        if (userRepository.existsByUserName(signUpRequest.getUsername())) {
            throw new BadRequestException("Error: Username is already taken!");
        }

        // Check if email already exists (only if email is provided)
        if (signUpRequest.getEmail() != null && 
            !signUpRequest.getEmail().isEmpty() && 
            userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new BadRequestException("Error: Email is already in use!");
        }

        // Check if phone number already exists (only if phone number is provided)
        if (signUpRequest.getPhoneNumber() != null && 
            !signUpRequest.getPhoneNumber().isEmpty() && 
            userRepository.existsByPhoneNumber(signUpRequest.getPhoneNumber())) {
            throw new BadRequestException("Error: Phone number is already in use!");
        }

        // Create new user's account
        User user = new User(
                signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                signUpRequest.getPhoneNumber(),
                encoder.encode(signUpRequest.getPassword()));

        Set<String> strRoles = signUpRequest.getRole();
        Role role;

        if (strRoles == null || strRoles.isEmpty()) {
            role = roleRepository.findByRoleName(AppRole.ROLE_USER)
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "name", "user"));
        } else {
            String roleStr = strRoles.iterator().next();
            role = switch (roleStr) {
                case "admin" -> roleRepository.findByRoleName(AppRole.ROLE_ADMIN)
                        .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleStr));
                case "owner" -> roleRepository.findByRoleName(AppRole.ROLE_OWNER)
                        .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleStr));
                case "broker" -> roleRepository.findByRoleName(AppRole.ROLE_BROKER)
                        .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleStr));
                case "user" -> roleRepository.findByRoleName(AppRole.ROLE_USER)
                        .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleStr));
                default -> throw new ResourceNotFoundException("Role","name",roleStr);
            };

            user.setAccountNonLocked(true);
            user.setAccountNonExpired(true);
            user.setCredentialsNonExpired(true);
            user.setEnabled(true);
            user.setCredentialsExpiryDate(LocalDate.now().plusYears(1));
            user.setAccountExpiryDate(LocalDate.now().plusYears(1));
            user.setTwoFactorEnabled(false);
            
            // Set signup method based on what was provided
            if (signUpRequest.getEmail() != null && !signUpRequest.getEmail().isEmpty()) {
                user.setSignUpMethod("email");
            } else if (signUpRequest.getPhoneNumber() != null && !signUpRequest.getPhoneNumber().isEmpty()) {
                user.setSignUpMethod("phone");
            }
        }
        user.setRole(role);
        userRepository.save(user);

        // Return appropriate message based on signup method
        String identifier = (signUpRequest.getEmail() != null && !signUpRequest.getEmail().isEmpty()) ? 
                            signUpRequest.getEmail() : 
                            signUpRequest.getPhoneNumber();

        return ResponseEntity.ok(ApiResponse.success("User registered successfully", identifier));
    }

    @PostMapping("/public/phone/send-code")
    public ResponseEntity<?> sendPhoneVerificationCode(@RequestBody PhoneVerificationRequest request) {
        try {
            // Validate phone number format (basic validation)
            if (request.getPhoneNumber() == null || request.getPhoneNumber().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Phone number is required"));
            }

            boolean sent = phoneAuthService.sendVerificationCode(request.getPhoneNumber());

            if (sent) {
                return ResponseEntity.ok(
                        ApiResponse.success("Verification code sent successfully to " + request.getPhoneNumber())
                );
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(ApiResponse.error("Failed to send verification code"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error sending verification code: " + e.getMessage()));
        }
    }

    // Step 2: Verify code and login/signup
    @PostMapping("/public/phone/verify-and-login")
    public ResponseEntity<?> phoneVerifyAndLogin(@RequestBody PhoneLoginRequest phoneLoginRequest) {
        try {
            String phoneE164 = phoneAuthService.normalizeToE164(phoneLoginRequest.getPhoneNumber());
            if (phoneE164 == null || phoneE164.isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Phone number is required"));
            }

            // Verify the code with Twilio (same E.164 used for send and verify)
            boolean verified = phoneAuthService.verifyCode(phoneE164, phoneLoginRequest.getVerificationCode());

            if (!verified) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Invalid or expired verification code"));
            }

            // Look up user by E.164 so it matches how we store it
            User user = userRepository.findByPhoneNumber(phoneE164)
                    .orElse(null);

            if (user == null) {
                String username = "user_" + phoneE164.replaceAll("[^0-9]", "");

                if (userRepository.existsByUserName(username)) {
                    username = username + "_" + System.currentTimeMillis();
                }

                user = new User();
                user.setUserName(username);
                user.setPhoneNumber(phoneE164);
                user.setPhoneVerified(true);
                user.setSignUpMethod("phone");
                user.setPassword(encoder.encode(phoneE164 + System.currentTimeMillis()));

                Role userRole = roleRepository.findByRoleName(AppRole.ROLE_USER)
                        .orElseThrow(() -> new ResourceNotFoundException("Role", "name", "user"));

                user.setRole(userRole);
                user.setAccountNonLocked(true);
                user.setAccountNonExpired(true);
                user.setCredentialsNonExpired(true);
                user.setEnabled(true);
                user.setCredentialsExpiryDate(LocalDate.now().plusYears(10));
                user.setAccountExpiryDate(LocalDate.now().plusYears(10));
                user.setTwoFactorEnabled(false);

                userRepository.save(user);
            } else {
                // Update phone verification status for existing user
                if (!user.getPhoneVerified()) {
                    user.setPhoneVerified(true);
                    userRepository.save(user);
                }
            }

            // Generate JWT token
            UserDetailsImpl userDetails = UserDetailsImpl.build(user);
            String jwtToken = jwtUtils.generateTokenFromUsername(userDetails);

            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            LoginResponse response = new LoginResponse(user.getUserName(), roles, jwtToken);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error during phone authentication: " + e.getMessage()));
        }
    }

    @GetMapping("/user")
    public ApiResponse<UserInfoResponse> getUserDetails(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername());

        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        UserInfoResponse response = new UserInfoResponse(
                user.getUserId(),
                user.getUserName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.isAccountNonLocked(),
                user.isAccountNonExpired(),
                user.isCredentialsNonExpired(),
                user.isEnabled(),
                user.getCredentialsExpiryDate(),
                user.getAccountExpiryDate(),
                user.isTwoFactorEnabled(),
                roles
        );
        return ApiResponse.success("Userdetails fetched successfully", response);
    }
    
    @GetMapping("/username")
    public ApiResponse<?> getUserName(@AuthenticationPrincipal UserDetails userDetails) {
        return (userDetails!=null) ? ApiResponse.success("Username fetched successfully",userDetails.getUsername()): ApiResponse.error("no user exists");
    }

    @PostMapping("/public/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email){
        try{
            userService.generatePasswordResetToken(email);
            return ResponseEntity.ok(ApiResponse.success("Password reset email sent!"));
        }
        catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error sending password reset email: " + e.getMessage()));
        }
    }

    @PostMapping("/public/reset-password")
    public ResponseEntity<?> resetPassword(@RequestParam String token, @RequestParam String newPassword){
        try{
            userService.resetPassword(token,newPassword);
            return ResponseEntity.ok(ApiResponse.success("Password reset successfull!"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }
//
//    @PostMapping("/enable-2fa")
//    public ResponseEntity<String> enable2FA(){
//        System.out.println("Inside /enable-2fa");
//        Long userId= authUtil.loggedInUserId();
//        GoogleAuthenticatorKey secret = userService.generate2FASecret(userId);
//        String qrCodeUrl = totpService.getQrCodeUrl(secret,userService.getUserById(userId).getUserName());
//        return ResponseEntity.ok(qrCodeUrl);
//    }
//
//    @PostMapping("/disable-2fa")
//    public ResponseEntity<String> disable2FA(){
//        System.out.println("Inside /disable-2fa");
//        Long userId= authUtil.loggedInUserId();
//        userService.disable2FA(userId);
//
//        return ResponseEntity.ok("2FA disabled");
//    }
//
//    @PostMapping("/verify-2fa")
//    public ResponseEntity<String> verify2FA(@RequestParam int code) {
//        System.out.println("Inside /verify-2fa");
//        Long userId= authUtil.loggedInUserId();
//        boolean isValid = userService.validate2FACode(userId,code);
//        if(isValid){
//            System.out.print("code validated");
//            userService.enable2FA(userId);
//            return ResponseEntity.ok("2FA verified");
//        }
//        else return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid 2FA code");
//    }
//
//    @GetMapping("/user/2fa-status")
//    public ResponseEntity<?> get2FAStatus() {
//        System.out.println("Inside /user/2fa-status");
//        User user = authUtil.loggedInUser();
//        if(user != null){
//            return ResponseEntity.ok().body(Map.of("is2faEnabled", user.isTwoFactorEnabled()));
//        }
//        else return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
//    }
//    @PostMapping("/public/verify-2fa-login")
//    public ResponseEntity<String> verify2FALogin(@RequestParam int code,@RequestParam String jwtToken) {
//        String username = jwtUtils.getUserNameFromJwtToken(jwtToken);
//        User user = userService.findByUsername(username);
//        boolean isValid = userService.validate2FACode(user.getUserId(), code);
//        if (isValid) {
//            return ResponseEntity.ok("2FA Verified");
//        }
//        else return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid 2FA code");
//    }
//
//    @PostMapping("/update-credentials")
//    public ResponseEntity<String> updateCredential(@RequestParam String newUsername, @RequestParam String newPassword){
//        User user = authUtil.loggedInUser();
//        userService.updateCredentials(user,newUsername,newPassword);
//        return  ResponseEntity.ok("Credentials Updated");
//    }
}
