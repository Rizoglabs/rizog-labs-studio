# RizogKey Engine — Dummy App Test Plan

Production application integration is intentionally deferred.

A dedicated Dummy App will be used as the engine certification target.

## Dummy App purpose

The Dummy App is not a product.

It exists only to prove that a RizogKey Engine release works before any real application consumes it.

## Required test scenarios

1. Fresh install
2. Installation Code generation
3. Valid activation
4. Invalid Activation Code
5. Activation Code reuse
6. Product mismatch
7. Expiration
8. Offline use inside grace window
9. Revalidation
10. Revoke
11. Device transfer
12. Local-state corruption
13. Server unavailable
14. Client version compatibility
15. Signed License Grant verification failure

## Release gate

RizogKey Engine cannot be marked STABLE until the Dummy App passes the required test matrix.

## Rule

The Dummy App may change freely to test the engine.

Customer applications must remain untouched during engine validation.
