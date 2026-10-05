# RizogKey Engine 1.0.0 — Integration Pack

This folder is the implementation handoff for integrating RizogKey Engine 1.0.0 into a new Rizog Labs application.

## Start here

1. Read `../RIZOGKEY_INTEGRATION_CONTRACT.md`.
2. Read `WEB_INTEGRATION_GUIDE.md` or `ANDROID_INTEGRATION_GUIDE.md`.
3. Copy the product configuration template below into the new application's planning/architecture document.
4. Complete `INTEGRATION_CHECKLIST.md`.
5. Use `ERROR_MAPPING.md` for customer-facing error handling.

## Product configuration template

```yaml
licensing:
  engine_version: "1.0.0"
  protocol_version: 1
  product_code: "<PRODUCT_CODE>"
  product_name: "<PRODUCT_NAME>"
  platform:
    - web
    - android
  client_version: "<APP_CLIENT_VERSION>"
  device_limit: 1
  durations:
    - 1M
    - 6M
    - 1Y
    - LIFETIME
  customer_terms:
    installation_code: "Installation Code"
    activation_code: "Activation Code"
    license: "License"
    activation: "Activation"
```

## Required application boundary

The host application calls only:

```ts
initialize()
getInstallationCode()
getStatus()
activate(code)
revalidate()
getLicense()
clearLocalState()
```

The host application must not access RizogKey licensing tables directly.

## Release lock

The application must pin RizogKey Engine 1.0.0 / Protocol V1. Do not silently float to a newer engine version.

For a new engine release, update the dependency intentionally and rerun the host application's licensing regression suite.
