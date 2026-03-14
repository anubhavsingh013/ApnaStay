# Twilio Verify – Console setup

1. **Create a Verify Service** (if you don’t have one)  
   - Twilio Console → **Verify** → **Services** → **Create new**.  
   - Copy the **Service SID** (starts with `VA...`) into `twilio.verification.service.sid`.

2. **Enable SMS channel**  
   - Open your Verify Service → **Channels** → ensure **SMS** is enabled.

3. **Trial account**  
   - In **Phone Numbers** → **Manage** → **Verified Caller IDs**, add the phone numbers you want to test.  
   - Trial accounts can only send SMS to Verified Caller IDs.

4. **E.164 format**  
   - Phone numbers must be in E.164 (e.g. `+919876543210`).  
   - The app normalizes numbers using `twilio.default.country.code` (e.g. `91`) when the client sends national format.
