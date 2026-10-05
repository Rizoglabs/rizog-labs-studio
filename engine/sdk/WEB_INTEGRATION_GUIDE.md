# RizogKey Engine 1.0.0 — Web Integration Guide

## 1. Scope

Use the reusable Web SDK when a web application needs the standard Rizog Labs licensing flow.

Reference client:

`engine/sdk/web/RizogKeyClient.js`

Protocol:

RizogKey V1

## 2. Host application responsibilities

The web app owns:

- first-launch activation screen;
- Installation Code display;
- Activation Code input;
- success/failure/revalidation messaging;
- deciding which business screens are gated;
- product-specific support/contact UX.

RizogKey owns the licensing lifecycle.

## 3. Configuration

Use the stable API contract:

```js
import { RizogKeyClient } from "./RizogKeyClient.js";

const client = new RizogKeyClient({
  productCode: "YOUR_PRODUCT_CODE",
  apiUrl: "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client",
  platform: "web",
  clientVersion: "1.0.0",
  trustedSigningKeys: {
    1: "<TRUSTED_ED25519_PUBLIC_KEY_BASE64>"
  }
});
```

The trusted signing key is application configuration. Do not take a key from an untrusted runtime response and then trust it.

## 4. First launch

```text
App start
  ↓
client.initialize()
  ↓
Installation identity exists?
  ├─ no → create identity + Installation Code
  └─ yes → reuse existing identity
  ↓
client.getStatus()
  ↓
UNACTIVATED / ACTIVE / EXPIRED / REVALIDATION_REQUIRED
```

Display the Installation Code using customer-facing terminology only.

## 5. Activation

```js
await client.activate(activationCode);
```

The client:

1. sends the activation request;
2. receives the signed License Grant;
3. verifies the trusted signing key;
4. verifies the Ed25519 signature;
5. verifies product binding;
6. stores the accepted grant;
7. exposes the resulting license state.

The application must not treat a plain HTTP 200 response as sufficient authorization.

## 6. Runtime gate

Recommended host flow:

```js
const status = client.getStatus();

switch (status) {
  case "ACTIVE":
    openApplication();
    break;
  case "UNACTIVATED":
    showActivation();
    break;
  case "EXPIRED":
    showExpired();
    break;
  case "REVALIDATION_REQUIRED":
    showRevalidationRequired();
    break;
  case "REVOKED":
    showRevoked();
    break;
  default:
    showLicensingError();
}
```

The product decides what each state looks like. The engine decides the licensing state.

## 7. Revalidation

Call:

```js
await client.revalidate();
```

Recommended triggers:

- app launch when appropriate;
- return to foreground when appropriate;
- connectivity restoration;
- before the offline boundary becomes critical;
- after a licensing-sensitive application update when required.

A network failure should be handled separately from a revoked/expired license.

## 8. Offline behavior

The latest accepted signed grant is stored locally.

The client evaluates:

- `expires_at`
- `offline_until`
- product binding
- grant status

Default engine offline grace is 90 days.

Do not hardcode business-specific offline policies in the host application.

## 9. Persistence

The reference SDK uses IndexedDB.

The host app must test:

- refresh;
- browser restart;
- multiple tabs;
- storage clearing;
- private/incognito contexts;
- browser-specific persistence behavior.

Web storage is not equivalent to a hardware identity.

## 10. Security requirements

Never put these in the web application:

- Supabase service-role secret;
- signing private key;
- signing seed;
- admin API credentials.

The web application talks to `rizogkey-client`, not directly to licensing tables.

## 11. Acceptance test

Before web production release:

- first launch works;
- Installation Code persists;
- valid Activation Code activates;
- invalid code is handled;
- signed grant is verified;
- wrong signing key is rejected;
- wrong product grant is rejected;
- persistence survives refresh;
- offline boundary is handled;
- network loss does not immediately destroy a valid local state;
- revalidation detects revoke;
- expiration is handled;
- device transfer instructions work.
