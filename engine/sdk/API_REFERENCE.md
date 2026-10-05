# RizogKey Client API — Protocol V1

Base URL:

```text
https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client
```

This is a public activation/revalidation endpoint. Requests do not use a user session JWT; activation-code validation and server-side RPCs authorize operations. Calls must include the project's publishable Supabase key in the `apikey` header. The endpoint must never return the signing seed/private key or service-role credential.

## Request

Send JSON with `Content-Type: application/json`. The endpoint accepts POST and browser OPTIONS preflight.

### Health

```json
{ "action": "health" }
```

Returns protocol version, signing readiness, and configured offline grace. Health does not authenticate a license.

### Activate

```json
{
  "action": "activate",
  "product_code": "YOUR_REGISTERED_PRODUCT_CODE",
  "installation_code": "RPK-INST-ABCDE-FGHIJ",
  "activation_code": "ABC-ACT-XXXX-XXXX-XXXX",
  "platform": "web",
  "public_key": "<client installation public key>",
  "client_version": "1.0.0"
}
```

Use `android` for a native Android adapter. The Product Code must already be registered and active in Rizog Labs Studio; the Activation Code must be issued for that Product Code and Installation Code.

### Revalidate

```json
{
  "action": "revalidate",
  "product_code": "YOUR_REGISTERED_PRODUCT_CODE",
  "license_id": "<license_id from the verified grant>",
  "installation_id": "<installation_id from the verified grant>",
  "public_key": "<client installation public key>",
  "client_version": "1.0.0"
}
```

## Successful response

Activation and revalidation return:

```json
{
  "data": {
    "license_grant": {
      "version": 1,
      "license_id": "<uuid>",
      "product_code": "YOUR_REGISTERED_PRODUCT_CODE",
      "installation_id": "<uuid>",
      "status": "ACTIVE",
      "duration_code": "1M",
      "device_limit": 1,
      "activated_at": "<ISO-8601 timestamp>",
      "expires_at": "<ISO-8601 timestamp or null>",
      "offline_until": "<ISO-8601 timestamp>",
      "last_validated_at": "<ISO-8601 timestamp>"
    },
    "signature": "<base64 Ed25519 signature over canonical JSON>",
    "signing": {
      "algorithm": "Ed25519",
      "key_version": 1,
      "public_key": "<base64 raw Ed25519 public key>"
    }
  }
}
```

The `signing.public_key` response must exactly match the application's pinned trusted-key entry for `key_version`. Verify signature, protocol, Product Code, and—on revalidation—license and installation IDs before persisting or using the grant.

## Common errors

The function returns a JSON `error` string for failed requests. Common values include `MISSING_REQUIRED_FIELDS`, `PRODUCT_NOT_FOUND`, `ACTIVATION_INVALID`, `ACTIVATION_USED`, `INSTALLATION_MISMATCH`, `INSTALLATION_ALREADY_LICENSED`, `LICENSE_NOT_FOUND`, `PRODUCT_MISMATCH`, `INSTALLATION_NOT_FOUND`, `INSTALLATION_NOT_BOUND`, `LICENSE_REVOKED`, `LICENSE_EXPIRED`, and `SIGNING_NOT_CONFIGURED`.

See [ERROR_MAPPING.md](ERROR_MAPPING.md) for client behavior and customer-safe messages. Never treat a non-2xx response, network error, invalid signature, or unknown protocol as ACTIVE.

## Operational notes

- The endpoint is implemented by `supabase/functions/rizogkey-client/index.ts`; its public invocation mode is configured in `supabase/config.toml`.
- Signing keys are generated/read server-side from Supabase Vault and the trusted public key is exposed in application configuration.
- Rate limiting and abuse monitoring must be configured at the edge/gateway if deployment traffic requires it; do not weaken Activation Code entropy or log submitted codes.
- The API's public invocation mode is intentional: the caller is not an admin. Studio administration remains behind the separately authenticated `rizogkey-admin` function.
