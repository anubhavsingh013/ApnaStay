package com.secure.apnastaybackend.services.impl;
import com.secure.apnastaybackend.services.TotpService;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import org.springframework.stereotype.Service;

@Service
public class TotpServiceImpl implements TotpService {
    private GoogleAuthenticator gAuth;
    public TotpServiceImpl(GoogleAuthenticator gAuth) {
        this.gAuth = gAuth;
    }
    public TotpServiceImpl() {
        this.gAuth = new GoogleAuthenticator();
    }

    @Override
    public GoogleAuthenticatorKey generateSecret() {
        return gAuth.createCredentials();
    }

    // display qr code >> generated in form of image >> backend will give the image url
    @Override
    public String getQrCodeUrl(GoogleAuthenticatorKey secret, String username) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthURL("ApnaStay ",username,secret);
    }
    @Override
    public boolean verifyCode(String secret, int code){
        return gAuth.authorize(secret, code);
    }
}
