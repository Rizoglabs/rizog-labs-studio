# RizogKey Engine — Client SDKs

RizogKey Engine 1.0.0 exposes a client adapter for Web and Android. Both adapters call the shared Supabase Edge Function; neither application reads licensing tables directly.

## Pick a platform

- [API Reference](API_REFERENCE.md)
- Web: follow [WEB_QUICKSTART.md](WEB_QUICKSTART.md) and use `web/RizogKeyClient.js`.
- Android: follow [ANDROID_QUICKSTART.md](ANDROID_QUICKSTART.md) and use `android/RizogKeyClient.kt`.

Register the consuming application in Rizog Labs Studio and use its assigned Product Code. The placeholder in the quickstarts must be replaced with that exact code.

## Live API configuration

The current API endpoint is:

```text
https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client
```

The public Supabase publishable key may be included in browser and Android client configuration:

```text
sb_publishable_kkgCQkdmeyiMW4Tt_YVi7w_ff1ZVcz_
```

The current License Grant signing key is public and pinned by key version:

```text
key version: 1
Ed25519 public key (base64): UnS601AB8gu4rxNrwcuz+m9WIOt7+43Pa2c3uLPWD8k=
```

Embed only the signing **public** key. Never embed the signing seed/private key, Supabase secret/service-role key, or Studio credentials. On signing-key rotation, update the trusted map through a reviewed application release; do not trust a key solely because it arrived in an API response.

## Stable client boundary

```text
initialize()
getInstallationCode()
getStatus()
activate(activationCode)
revalidate()
getLicense()
clearLocalState()
```

Only unlock licensed features when `getStatus() === "ACTIVE"`. Network failure is not a revoke. The client verifies signed grants when received and again when restoring cached state. Keep errors internal and map them to safe messages using [ERROR_MAPPING.md](ERROR_MAPPING.md).

## Server and data boundary

- Client requests go to `rizogkey-client`.
- Product, installation, activation and license records remain server-side.
- Studio operations use the authenticated `rizogkey-admin` function.
- Do not call licensing tables from a client.
- The SDK's Android network methods are blocking; call them on a background thread.
- Web integration requires a secure context (HTTPS or localhost), IndexedDB, and Web Crypto.
