# RizogKey Engine 1.0.0 — Integration Checklist

## A. Planning

- [ ] Product Code is unique and registered in Rizog Labs Studio.
- [ ] Product Name is defined.
- [ ] Platform adapter is selected.
- [ ] Client version is defined.
- [ ] Device limit is defined.
- [ ] Supported durations are defined.
- [ ] Customer-facing terminology uses Installation Code / Activation Code / License / Activation.
- [ ] RizogKey Engine version is pinned to 1.0.0.
- [ ] Protocol version is pinned to V1.

## B. Security

- [ ] No service-role secret is in client code.
- [ ] No signing private key/seed is in client code.
- [ ] Client does not access licensing tables directly.
- [ ] Supabase publishable API key is configured in the apikey header.
- [ ] Trusted signing-key map is pinned from a reviewed source (not accepted from the API response).
- [ ] Client rejects an untrusted key version.
- [ ] Client verifies License Grant signature.
- [ ] Client verifies the cached grant signature again during initialization.
- [ ] Revalidation result matches the current license and installation IDs.
- [ ] Client verifies Product Code binding.
- [ ] Client persists only client-safe licensing state.
- [ ] Licensing secrets are absent from logs.

## C. First launch

- [ ] Installation identity is created.
- [ ] Installation Code is displayed.
- [ ] Installation Code can be copied.
- [ ] Status starts at UNACTIVATED.
- [ ] Activation UI is customer-facing and does not mention RizogKey.

## D. Activation

- [ ] Valid Activation Code activates.
- [ ] Used Activation Code is rejected.
- [ ] Wrong Product Code is rejected.
- [ ] Device limit is enforced.
- [ ] Signed License Grant is accepted only after verification.
- [ ] Activation timestamp is respected.

## E. Runtime

- [ ] ACTIVE state opens the licensed app.
- [ ] Offline operation follows offline_until.
- [ ] EXPIRED state is handled.
- [ ] REVALIDATION_REQUIRED state is handled.
- [ ] REVOKED state is handled.
- [ ] Network failure is distinguished from license failure.

## F. Revalidation

- [ ] Revalidation can refresh an active grant.
- [ ] Revalidation updates local grant.
- [ ] Revalidation detects revoke.
- [ ] Revalidation detects expiry.
- [ ] Revalidation works after connectivity returns.

## G. Persistence

- [ ] App/browser restart preserves valid local state only after signature verification.
- [ ] Local storage failure is handled.
- [ ] Clear local state produces a fresh activation flow.
- [ ] No license state is silently copied to another installation.

## H. Device transfer

- [ ] Old installation is revoked/removed through the administrative workflow.
- [ ] New device gets a new Installation Code.
- [ ] New Activation Code is generated.
- [ ] New activation gets a new activation timestamp.
- [ ] Audit trail exists.

## I. Regression

- [ ] Dummy App certification is green for the engine release.
- [ ] Host application integration tests are green.
- [ ] Release build is tested.
- [ ] Production configuration is reviewed.
- [ ] Customer-facing activation/error copy is reviewed.

## J. Release

- [ ] Engine version is explicitly pinned.
- [ ] Protocol version is explicitly pinned.
- [ ] Compatibility notes are recorded.
- [ ] Product PRD references the Integration Pack.
- [ ] No direct database licensing logic exists in the product.
