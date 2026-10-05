# RizogKey Engine 1.0.0 — Android Integration Guide

## 1. Scope

Use the Android adapter boundary for a native Android application. See [ANDROID_QUICKSTART.md](ANDROID_QUICKSTART.md) for a working configuration, API key, pinned signing key, threading, and activation example.

Reference:

`engine/sdk/android/`

Protocol:

RizogKey V1

The reference adapter is a reusable starting point, not a substitute for host-application Android certification.

## 2. Host application responsibilities

The Android app owns:

- activation screens;
- Installation Code display;
- Activation Code input;
- product-specific gating;
- customer messaging;
- lifecycle hooks for revalidation;
- support and device-transfer UX.

The engine owns:

- installation identity lifecycle;
- activation;
- signed License Grant verification;
- local license state;
- expiration/offline evaluation;
- revalidation.

## 3. Product configuration

Define:

```text
product_code
product_name
client_version
device_limit
supported_durations
minimum_protocol = V1
```

Do not reuse another application's Product Code.

## 4. Application flow

```text
Android App Start
      ↓
RizogKey initialize
      ↓
Installation identity
      ↓
Installation Code
      ↓
UNACTIVATED?
  ├─ yes → Activation screen
  └─ no  → evaluate local License Grant
      ↓
ACTIVE → app
EXPIRED → expiry flow
REVALIDATION_REQUIRED → revalidation flow
REVOKED → revoked flow
```

## 5. Activation

The app calls the adapter's activation operation with the customer-provided Activation Code.

The accepted License Grant must pass:

- protocol/version checks;
- Product Code check;
- trusted signing-key check;
- cryptographic signature verification;
- installation binding checks.

Only then may the product unlock its licensed experience.

## 6. Android lifecycle

Recommended revalidation opportunities:

- app start;
- app resume after a meaningful offline period;
- connectivity restoration;
- before the local offline boundary becomes critical.

Do not force a full server check on every screen transition.

## 7. Offline operation

The last valid signed License Grant is the source for offline evaluation.

The application should continue operating inside the approved offline boundary.

Network failure is not the same state as:

- LICENSE_REVOKED;
- LICENSE_EXPIRED;
- REVALIDATION_REQUIRED.

## 8. Secure storage

The adapter verifies the signed License Grant both when received and when restoring cached state. It verifies the expected license and installation IDs on revalidation.

The adapter must keep installation private key material in platform-secure key storage.

The host application must never:

- export an installation private key;
- put it in JSON;
- write it to logs;
- upload it to Supabase;
- bundle a signing seed or server secret.

## 9. Device transfer

Do not copy the old app's local licensing state to a new device.

Use:

Old device → administrative revoke/transfer → New Installation Code → New Activation Code → New activation.

See `../DEVICE_TRANSFER_RUNBOOK.md`.

## 10. Android certification matrix

Before production, test the actual host app against at least:

- supported minimum Android version;
- supported target Android version;
- clean install;
- app upgrade;
- app data clear;
- uninstall/reinstall;
- offline start;
- connectivity restoration;
- revoked license;
- expired license;
- device replacement;
- backup/restore behavior;
- clock/time manipulation resistance where relevant;
- release build, not only debug build.

The exact Android device/OS matrix belongs to the product PRD.
