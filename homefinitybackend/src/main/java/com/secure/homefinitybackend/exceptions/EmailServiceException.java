package com.secure.homefinitybackend.exceptions;

import lombok.Getter;

@Getter
public class EmailServiceException extends RuntimeException {
    private final String recipientEmail;
    private final String emailType;

    public EmailServiceException(String message, String recipientEmail, String emailType) {
        super(message);
        this.recipientEmail = recipientEmail;
        this.emailType = emailType;
    }

    public EmailServiceException(String message, Throwable cause, String recipientEmail, String emailType) {
        super(message, cause);
        this.recipientEmail = recipientEmail;
        this.emailType = emailType;
    }

}