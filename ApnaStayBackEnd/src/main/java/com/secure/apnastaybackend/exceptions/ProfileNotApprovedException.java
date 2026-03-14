package com.secure.apnastaybackend.exceptions;

public class ProfileNotApprovedException extends RuntimeException {
    public ProfileNotApprovedException(String message) {
        super(message);
    }
}

