# auth0-mfa-custom-login-form

This is a demo login form for Auth0 when MFA is forced and doesn't rely on [Universal Login](https://auth0.com/docs/universal-login) or any backend to work. It's based on [this](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/01-Login) code. For now, it only supports SMS, OTP and recovery code factors. The goal was to demonstrate that one can build a completely custom login form without restrictions that Universal Login applies.

**Configuration steps:**

1. Enable "SMS" and "One-time Password" factors and enable "Always require Multi-factor Authentication" switch [docs](https://auth0.com/docs/multifactor-authentication#1-enable-the-factors-you-require)
1. Create a new SPA [docs](https://auth0.com/docs/dashboard/guides/applications/register-app-spa)
1. Go yo your SPA setting and add "http://localhost:3000" (don't add the slash at the back) to "Allowed Callback URLs", "Allowed Web Origins", "Allowed Logout URLs", "Allowed Origins (CORS)"
1. Go to "Advanced Settings" of the SPA and enable "MFA" grant type
1. Create a new [API](https://auth0.com/docs/apis)
1. Copy `config.json.example` file to `config.json` in the repo's dir and put your Auth0 domain, SPA client id and audience (API's identifier) in there
1. Run `npm install`
1. Run `npm run start` (make sure you port 3000 is free) and open http://localhost:3000 in your browser

**Usage tips:**

* When you log in for the first time you will have to configure an MFA device (OTP or SMS).
* For SMS enter your phone number (like this `+xxxxxxxxxx`) and press "Add SMS device", then enter the code you received and press "Verify" (that will confirm that you own the phone).
* For OTP just press "Add OTP device" scan generated QR code, enter a 6-digit number from your authenticator and press "Verify".
* After you successfully verified your first MFA device a recovery code will be displayed. Save it for emergency login.
* If you have any MFA devices set up, then after you entered your username and password, you will have to choose the one you want to use.
