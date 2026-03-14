package com.secure.apnastaybackend.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.ProfileStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileDTO {
    private Long id;
    private Long userId;
    private String userName;
    private AppRole profileRole;
    private String fullName;
    private String gender;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;
    private String aadharNumber;
    private String mobile;
    private String email;
    private String firmName;
    private String licenseNumber;
    private String idType;
    private String idNumber;
    private String address;
    private String city;
    private String state;
    private String pinCode;
    private ProfileStatus status;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime submittedAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime reviewedAt;
    private String adminNote;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}

