package com.secure.apnastaybackend.dto.request;

import com.secure.apnastaybackend.entity.AppRole;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileRequest {

    private AppRole role;

    @Size(max = 100)
    private String fullName;

    @Size(max = 20)
    private String gender;

    private LocalDate dateOfBirth;

    @Size(max = 12)
    private String aadharNumber;

    @Size(max = 15)
    private String mobile;

    @Email
    @Size(max = 100)
    private String email;

    @Size(max = 150)
    private String firmName;

    @Size(max = 50)
    private String licenseNumber;

    @Size(max = 50)
    private String idType;

    @Size(max = 50)
    private String idNumber;

    @Size(max = 255)
    private String address;

    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Pattern(regexp = "^[0-9]{6}$", message = "Pin code must be 6 digits")
    @Size(max = 6)
    private String pinCode;
}

