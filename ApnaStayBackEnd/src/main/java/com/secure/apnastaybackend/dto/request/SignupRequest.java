package com.secure.apnastaybackend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class SignupRequest {

    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    // Email is now optional
    @Size(max = 50)
    @Email(message = "Please provide a valid email address")
    private String email;

    // Phone number is now optional
    @Pattern(regexp = "^[+]?[0-9]{10,15}$",
             message = "Phone number must be between 10-15 digits and may start with +")
    private String phoneNumber;

    private Set<String> role;

    @NotBlank
    @Size(min = 6, max = 40)
    private String password;
}

