# RizogKey Engine — Integration Contract V1

This document is the contract a future application must satisfy before it can use RizogKey Engine.

## 1. Application responsibilities

The host application is responsible for:

- Showing the activation UI.
- Showing the Installation Code.
- Collecting the Activation Code.
- Deciding which application screens/features are blocked when a license is invalid.
- Displaying customer-facing messages.
- Calling the RizogKey Client API according to this contract.

The host application must NOT implement its own licensing rules in parallel.

## 2. Engine responsibilities

RizogKey Engine is responsible for:

- Installation identity.
- Activation request.
- Server validation.
- License state.
- Duration/expiry.
- Offline grace evaluation.
- Revalidation.
- Revoke detection.
- Signed License Grant verification.

## 3. Required product configuration

Every host application must define:

- product_code
- product_name
- platform
- app_version
- minimum_rizogkey_protocol
- client_version
- activation_required_behavior
- revoked_behavior
- expired_behavior
- revalidation_required_behavior

Example:

    product_code: RUPKAS
    platform: android
    minimum_rizogkey_protocol: 1

## 4. Host application API boundary

The application should consume a small stable abstraction:

    initialize()
    getInstallationCode()
    getStatus()
    activate(activationCode)
    revalidate()
    getLicense()

The application should not access RizogKey database tables directly.

## 5. Customer-facing terminology

Do not expose:

- RizogKey
- RizogKey Engine
- RizogKey API
- internal license IDs
- internal installation IDs
- server implementation details

Use:

- Installation Code
- Activation Code
- License
- Aktivasi
- Lisensi

## 6. Integration gate

A production application may integrate the engine only after:

1. Engine release is marked STABLE.
2. Dummy App test suite passes.
3. Activation test passes.
4. Offline test passes.
5. Revalidation test passes.
6. Revoke test passes.
7. Device transfer test passes.
8. Compatibility test passes.
