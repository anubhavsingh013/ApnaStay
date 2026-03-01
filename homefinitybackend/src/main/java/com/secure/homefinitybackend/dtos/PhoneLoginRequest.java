package com.secure.homefinitybackend.dtos;

import lombok.Data;

@Data
public class PhoneLoginRequest {
    private String phoneNumber;
    private String verificationCode;
}