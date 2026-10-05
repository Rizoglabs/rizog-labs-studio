# RizogKey Web Client

RizogKey Client is the application-side licensing component for Rizog Labs web applications.

## Responsibilities

- Create a persistent installation identity.
- Produce an Installation Code.
- Activate an application with an Activation Code.
- Verify the server-signed License Grant.
- Persist the local license state.
- Detect expiration and offline-grace exhaustion.
- Revalidate the license.
- Expose a small API to the host application.

## Production integration

The client talks to:

`https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client`

The production web client should pin the server's Ed25519 signing public key in its build.

## Security note

Browser applications cannot provide the same hardware-backed identity guarantees as native Android applications. Web storage and JavaScript are inspectable by the client. The server therefore remains authoritative and revalidation is mandatory after the offline grace boundary.

