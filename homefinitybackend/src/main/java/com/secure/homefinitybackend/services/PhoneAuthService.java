package com.secure.homefinitybackend.services;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PhoneAuthService {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.verification.service.sid}")
    private String verificationServiceSid;

    @Value("${twilio.default.country.code:91}")
    private String defaultCountryCode;

    private static final Pattern DIGITS_ONLY = Pattern.compile("[^0-9]");

    @PostConstruct
    public void initTwilio() {
        Twilio.init(accountSid, authToken);
    }

    /**
     * Normalize to E.164
     * Examples: "9876543210" -> "+919876543210"; "+1 555 123 4567" -> "+15551234567"
     */
    public String normalizeToE164(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return phoneNumber;
        }
        String digits = DIGITS_ONLY.matcher(phoneNumber).replaceAll("");
        if (digits.isEmpty()) {
            return phoneNumber;
        }
        boolean hadPlus = phoneNumber.trim().startsWith("+");
        if (hadPlus) {
            return "+" + digits;
        }
        return "+" + defaultCountryCode + digits;
    }

    public boolean sendVerificationCode(String phoneNumber) {
        String e164 = normalizeToE164(phoneNumber);
        try {
            Verification verification = Verification.creator(
                    verificationServiceSid,
                    e164,
                    "sms"
            ).create();

            log.info("Verification code sent to: {} (E.164: {})", phoneNumber, e164);
            return "pending".equals(verification.getStatus());
        } catch (ApiException e) {
            log.error("Twilio error sending verification code. Code: {} | Message: {} | MoreInfo: {}",
                    e.getCode(), e.getMessage(), e.getMoreInfo());
            return false;
        } catch (Exception e) {
            log.error("Error sending verification code: {}", e.getMessage());
            return false;
        }
    }

    public boolean verifyCode(String phoneNumber, String code) {
        String e164 = normalizeToE164(phoneNumber);
        if (code == null || code.isBlank()) {
            log.error("Verification code is empty");
            return false;
        }
        try {
            VerificationCheck verificationCheck = VerificationCheck.creator(
                    verificationServiceSid
            )
                    .setTo(e164)
                    .setCode(code.trim())
                    .create();

            log.info("Verification status for {}: {}", e164, verificationCheck.getStatus());
            return "approved".equals(verificationCheck.getStatus());
        } catch (ApiException e) {
            log.error("Twilio error verifying code. Code: {} | Message: {} | MoreInfo: {}",
                    e.getCode(), e.getMessage(), e.getMoreInfo());
            return false;
        } catch (Exception e) {
            log.error("Error verifying code: {}", e.getMessage());
            return false;
        }
    }
}