# RizogKey Engine V1 — Certification Report

## Certification date

2026-10-05

## Engine

- Engine version: 1.0.0-alpha
- Protocol version: V1
- Target applications: Web / Android
- Production applications integrated: None

## Backend certification results

### PASS — Activation

A fresh test activation was processed successfully.

Verified:
- product validation
- activation code validation
- installation creation
- license creation
- activation code transition to USED
- installation/license binding
- ACTIVE license state

### PASS — Revalidation

The activated test license was revalidated successfully while ACTIVE.

Verified:
- license lookup
- product match
- installation binding
- last validation update
- REVALIDATED audit event

### PASS — Activation Code reuse protection

Reusing the consumed activation code returned:

    ACTIVATION_USED

The server did not create a second license.

### PASS — Revoke detection

The test license was moved to REVOKED and revalidation returned:

    LICENSE_REVOKED

### PASS — Expiration detection

A second test license was forced into an expired state and revalidation returned:

    LICENSE_EXPIRED

The server also transitions the license state to EXPIRED when the expiration check is reached.

## Infrastructure checks

PASS:
- RizogKey schema exists.
- RLS is enabled on licensing tables.
- Direct client table access is intentionally blocked by the current architecture.
- RizogKey Client Edge Function is ACTIVE.
- RizogKey Admin Edge Function remains authenticated.
- Server-side signing seed is kept in Supabase Vault.
- Trigger functions have explicit search paths after security lint remediation.

INFO only:
- Supabase security advisor reports RLS-enabled tables without policies. This is intentional because browser access is routed through server-side functions.
- Leaked Password Protection for Supabase Auth remains disabled and is not an Engine runtime failure.

## Dummy App

The standalone Dummy App exists at:

    engine/dummy-app/

It is the required certification consumer and is not a customer product.

The GitHub Pages workflow now validates its JavaScript and performs a published-site smoke test.

## Pending certification

These require an actual browser/client execution rather than database/RPC testing:

- first-launch Installation Code UX
- browser Web Crypto capability test
- signed License Grant verification in a real browser
- offline behavior in the Dummy App
- network-loss recovery
- end-to-end revoke through the deployed client API
- device-transfer workflow
- browser persistence across refresh
- client compatibility regression test

## Release decision

Current status:

    ALPHA — BACKEND CERTIFIED, CLIENT CERTIFICATION IN PROGRESS

RizogKey Engine must NOT be marked STABLE yet.

RupKas must NOT be integrated until the Dummy App certification matrix passes.
