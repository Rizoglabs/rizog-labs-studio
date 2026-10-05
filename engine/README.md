# RizogKey Engine

RizogKey Engine 1.0.0 is the reusable internal licensing product of Rizog Labs.

It is a stable dependency for future Rizog Labs applications. It is not a customer application and the internal name "RizogKey" must never be exposed as a customer-facing brand.

## Product role

RizogKey Engine provides:

- Installation identity
- Installation Code
- Activation Code consumption
- License state
- License duration
- Device binding
- Offline grace
- Revalidation
- Revoke handling
- Signed License Grant
- Client integration contract
- Web and Android adapter boundaries

## Relationship to Rizog Labs Studio

RizogKey Engine is the licensing product.

Rizog Labs Studio is the administrative control plane that generates Activation Codes, shows licensing history and performs administrative revoke/transfer operations.

Customer applications consume RizogKey Engine through the client contract and must not access licensing tables directly.

## Stable release

- Engine: 1.0.0
- Protocol: V1
- Status: STABLE
- Default device limit: 1
- License durations: 1M / 6M / 1Y / LIFETIME
- Default offline grace: 90 days
- Supported targets: Web / Android

## Integration entry point

Start with:

- `RIZOGKEY_INTEGRATION_CONTRACT.md`
- `PLANNING_ATTACHMENT.md`
- `sdk/INTEGRATION_PACK.md`
- `sdk/INTEGRATION_CHECKLIST.md`

Platform guides:

- `sdk/WEB_INTEGRATION_GUIDE.md`
- `sdk/ANDROID_INTEGRATION_GUIDE.md`

Security and operations:

- `sdk/ERROR_MAPPING.md`
- `DEVICE_TRANSFER_RUNBOOK.md`
- `COMPATIBILITY_MATRIX_V1.md`
- `STABLE_RELEASE_GATE.md`

## Development rule

Do not modify stable licensing behavior inside a production app.

Engine changes must be made in the engine, validated with the Dummy App, and released as a new engine version before host applications consume the change.

## Current certification

The published Dummy App and its browser certification are part of the engine regression suite.

Current stable CI evidence is recorded in `CERTIFICATION_REPORT_V1.md`.

## Versioning

Breaking licensing protocol changes require a new protocol version.

A host application pins both:

- RizogKey Engine version
- RizogKey Protocol version
