# RizogKey Engine V1 — Stable Certification Report

## Certification date

2026-10-05

## Stable release

- Engine version: 1.0.0
- Protocol version: V1
- Target platforms: Web / Android
- Production applications integrated: None

## Backend certification

PASS:
- Activation
- Revalidation
- Activation Code reuse protection
- Revoke detection
- Expiration detection
- Installation/license binding
- Audit events
- Server-side signing seed stored in Supabase Vault
- Client API health/signing readiness

## Security certification

PASS:
- No service-role key in customer client
- Direct browser table access intentionally blocked
- Signed License Grant required
- Canonical JSON signing payload
- Trusted signing-key pinning
- Product binding
- Invalid-signature rejection
- Network-loss mapping
- Protocol V1 versioning

## Browser certification

GitHub Actions run #90 passed:

- first launch + Installation Code
- visible activation UI
- activation + signed grant
- persistence across reload
- network-loss path
- expiration state
- offline grace boundary
- revoke state
- invalid signature rejection
- trusted signing-key pinning
- product binding
- return to activation UI
- no raw Material Symbols text leakage

## Compatibility

- Web reference adapter: PASS
- Android adapter reference: available
- Device transfer runbook: PASS
- Host application integration contract: PASS

Android products must still perform application-level device/OS certification using the Android adapter before shipping.

## Release decision

**STABLE — RizogKey Engine 1.0.0**

The engine is approved as a reusable dependency for future Rizog Labs products.

