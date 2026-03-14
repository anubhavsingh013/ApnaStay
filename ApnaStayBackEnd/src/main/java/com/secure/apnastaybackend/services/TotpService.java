package com.secure.apnastaybackend.services;

import com.warrenstrange.googleauth.GoogleAuthenticatorKey;

public interface TotpService {

    GoogleAuthenticatorKey generateSecret();

    // display qr code >> generated in form of image >> backend will give the image url
    String getQrCodeUrl(GoogleAuthenticatorKey secret, String username);

    boolean verifyCode(String secret, int code);
}

