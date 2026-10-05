# Web Quickstart

This example connects a web app to the live RizogKey Engine endpoint. Replace only `YOUR_PRODUCT_CODE` with the Product Code registered in Rizog Labs Studio. Do not use another app's code.

## 1. Add the SDK

Copy `RizogKeyClient.js` into your web app and import it as an ES module. Serve the app over HTTPS (localhost is suitable for development).

## 2. Configure the client

```js
import { RizogKeyClient } from "./RizogKeyClient.js";

const client = new RizogKeyClient({
  productCode: "YOUR_PRODUCT_CODE",
  platform: "web",
  clientVersion: "1.0.0",
  apiUrl: "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client",
  publishableKey: "sb_publishable_kkgCQkdmeyiMW4Tt_YVi7w_ff1ZVcz_",
  trustedSigningKeys: {
    1: "UnS601AB8gu4rxNrwcuz+m9WIOt7+43Pa2c3uLPWD8k="
  }
});

await client.initialize();
```

The publishable key and Ed25519 public key are public values. Never put a Supabase secret/service-role key or a signing private key in the app.

## 3. Gate the app and show the Installation Code

```js
const installationCode = client.getInstallationCode();
document.querySelector("#installation-code").textContent = installationCode;

function renderLicenseState() {
  const status = client.getStatus();
  document.querySelector("#app-content").hidden = status !== "ACTIVE";
  document.querySelector("#activation-panel").hidden = status === "ACTIVE";
  document.querySelector("#license-status").textContent = status;
}

renderLicenseState();
```

The app's activation form submits the customer-provided code:

```js
try {
  await client.activate(document.querySelector("#activation-code").value);
  renderLicenseState();
} catch (error) {
  // Map error.message through ERROR_MAPPING.md. Never unlock on an error.
  showSafeActivationError(error.message);
}
```

## 4. Revalidate

Call revalidation when the app starts or connectivity returns, and handle offline/network errors separately from license states:

```js
try {
  await client.revalidate();
} catch (error) {
  showSafeActivationError(error.message);
}
renderLicenseState();
```

## 5. Browser requirements

Use IndexedDB and Web Crypto from a secure context. Test refresh, browser restart, private browsing, storage clearing, and multiple tabs. A browser profile is not hardware-backed identity. Unlock only when status is exactly `ACTIVE`.
