package com.secure.apnastaybackend.utils;

import com.secure.apnastaybackend.exceptions.EmailServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    public void sendPasswordResetEmail(String to, String resetUrl) {

        try {
            log.debug("Sending password reset email to {}", to);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Password Reset - HomeFinity");
            message.setText("Click the link below to reset your password:\n" + resetUrl);

            mailSender.send(message);

            log.debug("Password reset email sent successfully to {}", to);

        } catch (MailException ex) {

            log.error("Failed to send password reset email to: {}. Reason: {}",
                    to, ex.getMessage(), ex);

            throw new EmailServiceException(
                    "Unable to send password reset email. Please try again later.",
                    ex,
                    to,
                    "PASSWORD_RESET"
            );
        }
    }
}
