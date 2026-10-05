# RizogKey Engine — Web SDK

The Web SDK is the reusable client boundary for applications that consume RizogKey Engine.

## Stable application boundary

```ts
await client.initialize()
client.getInstallationCode()
client.getStatus()
await client.activate(activationCode)
await client.revalidate()
client.getLicense()
await client.clearLocalState()
```

## Security

The host application must provide a trusted signing-key map. The client does not trust a signing key merely because the server returned it with a grant.

Example:

```js
import { RizogKeyClient } from "./RizogKeyClient.js";

const client = new RizogKeyClient({
  productCode: "YOUR_PRODUCT_CODE",
  clientVersion: "1.0.0",
  platform: "web",
  apiUrl: "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client",
  trustedSigningKeys: {
    1: "<TRUSTED_ED25519_PUBLIC_KEY_BASE64>"
  }
});

await client.initialize();
```

## Host application responsibilities

The app owns the activation UI and customer-facing messages.

The engine owns installation identity, license state, signed-grant validation, offline-state evaluation and revalidation.

The app must not read licensing tables directly and must not contain a Supabase service-role secret.

## Customer terminology

Never expose the internal name "RizogKey" to customers. Use:

- Installation Code
- Activation Code
- License
- Activation

## Release rule

The SDK follows the RizogKey Protocol version declared by the engine manifest. Breaking protocol changes require a new protocol version.
