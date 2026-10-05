# RizogKey Dummy App

This is the certification app for RizogKey Engine V1.

It is intentionally independent from RupKas and other production applications.

## Run

Serve this directory from a local HTTP server.

Example:

    python -m http.server 8080

Then open:

    http://localhost:8080/

Do not open `index.html` directly with `file://`; browser module loading and IndexedDB behavior are more reliable over HTTP.

## Test

1. Initialize Engine.
2. Copy the generated Installation Code.
3. In Rizog Labs Studio, generate an Activation Code for:
   - Product: RUPKAS
   - Customer: Dummy App Test
   - Installation Code: the value generated here
   - Duration: 1 Month
   - Device Limit: 1
4. Paste the Activation Code into the Dummy App.
5. Confirm the license becomes ACTIVE.
6. Confirm the returned License Grant signature is verified.
7. Run Revalidate.
8. Revoke the activation from Rizog Labs Studio.
9. Run Revalidate again and confirm the client rejects the revoked license.
10. Clear local state and verify a new installation identity is created.

## Important

This app is a certification tool, not a customer product.

Do not use it to store real customer credentials or production secrets.
