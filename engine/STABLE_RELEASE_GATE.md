# RizogKey Engine 1.0.0 — Stable Release Gate

## Required gates

- Backend activation
- Backend revalidation
- Activation-code reuse protection
- Revoke detection
- Expiration detection
- Signed License Grant verification
- Trusted signing-key pinning
- Browser first launch
- Installation Code persistence
- License persistence
- Offline-state evaluation
- Network-loss handling
- Device transfer workflow
- Compatibility contract
- CI validation
- Published Dummy App smoke test
- Published Dummy App browser certification

## Evidence

The Dummy App is the regression consumer.

The backend lifecycle was already certified against activation, revalidation, activation reuse, revoke and expiration.

The browser suite must remain green after every engine change.

## Release rule

Do not label the engine STABLE merely because the source code exists. The release status must be changed only after all gates above are green in the same release candidate.

## Current release candidate

Version: 1.0.0-rc.1
Protocol: V1
