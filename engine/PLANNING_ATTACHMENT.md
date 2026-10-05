# RizogKey Engine — Planning Attachment

Use this file whenever a new Rizog Labs application may require licensing.

## Dependency

Use RizogKey Engine 1.0.0 or the currently approved stable release.

Do not design a separate licensing system.

## Planning steps

1. Read the engine manifest.
2. Read the Integration Contract.
3. Select the platform adapter:
   - web
   - android
4. Define:
   - product_code
   - product_name
   - app_version
   - client_version
   - device_limit
   - supported durations
5. Map the application's activation UI to Installation Code + Activation Code.
6. Keep all license lifecycle decisions behind RizogKey Client.
7. Do not expose the RizogKey name to customers.
8. Do not access RizogKey database tables directly from the application.
9. Use the Dummy App for engine changes and the host application for product-specific certification.

## Required PRD section

### Licensing Dependency

- RizogKey Engine version
- Protocol version
- platform adapter
- product code
- device limit
- durations
- trusted signing-key version(s)

### Activation UX

- first launch
- Installation Code
- Activation Code
- activation success
- invalid code
- revoked license
- expired license
- revalidation required
- device transfer instructions

### Technical Boundary

The application consumes:

    initialize()
    getInstallationCode()
    getStatus()
    activate(code)
    revalidate()
    getLicense()
    clearLocalState()

The application must not implement a parallel licensing lifecycle.

## Customer-facing terms

Use:

- Installation Code
- Activation Code
- License
- Activation
- Lisensi

Never expose the internal RizogKey name.
