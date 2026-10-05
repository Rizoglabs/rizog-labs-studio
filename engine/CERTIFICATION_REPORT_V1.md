# RizogKey Engine V1 — Certification Report

## Certification cycle

2026-10-05

## Candidate

- Engine version: 1.0.0-rc.1
- Protocol version: V1
- Target applications: Web / Android
- Production applications integrated: None

## Backend certification

### PASS — Activation

Verified:
- product validation
- activation code validation
- installation creation
- license creation
- activation code transition to USED
- installation/license binding
- ACTIVE license state

### PASS — Revalidation

Verified:
- license lookup
- product match
- installation binding
- last validation update
- REVALIDATED audit event

### PASS — Activation Code reuse protection

Reusing a consumed Activation Code returns ACTIVATION_USED and does not create a second license.

### PASS — Revoke detection

A REVOKED license is detected during revalidation and returns LICENSE_REVOKED.

### PASS — Expiration detection

An expired license is detected during revalidation and returns LICENSE_EXPIRED.

### PASS — Server-side signing

The signing seed remains server-side in Supabase Vault. License Grants are signed using the server-side signing material.

### PASS — Canonical signed-grant payload

V1 now defines deterministic canonical JSON serialization for signing and verification.

### PASS — Client signing-key pinning

Clients accept a signing key only when its key_version and public key match the host application's trusted signing-key map. A public key returned by the server is not trusted automatically.

## Browser certification

The Dummy App regression suite covers:

- first-launch Installation Code
- visible activation UI
- signed Grant verification
- activation success state
- browser persistence
- network-loss mapping
- expiration state evaluation
- invalid signature rejection
- signing-key trust rejection
- product binding
- return to activation UI
- no raw Material Symbols text leakage

The GitHub Pages workflow runs the suite against the published Dummy App.

## Compatibility

- Protocol V1: PASS
- Web adapter contract: PASS
- Android adapter reference: PASS as an integration contract
- Device transfer runbook: PASS
- Direct licensing-table access prohibition: PASS
- Service-role-secret prohibition: PASS

Android host applications still require their own device/OS release matrix before shipping; the engine stable release does not replace application-level Android certification.

## Release decision

Current status:

    RELEASE CANDIDATE — pending final CI green after the signing/canonicalization changes.

RupKas remains excluded from engine validation.
