# RizogKey Engine — PRD Attachment Pack

Version: 1.0  
Engine baseline: RizogKey Engine 1.0.0 (STABLE)  
Protocol baseline: V1  
Purpose: Attach this document when prompting for a PRD for a RizogLabs application that will use RizogKey.

---

## Copy-ready prompt

Use this attachment as the licensing and product-registration baseline for the PRD. Treat the architecture boundaries, security rules, customer terminology, and acceptance criteria below as requirements.

Write a product-specific PRD from the product brief. Keep business features separate from the shared licensing engine. Do not design a parallel licensing system, duplicate RizogKey data, or invent APIs, database tables, fields, or backend behavior. If a required value is missing, mark it **TBD — confirm with owner**, list the decision needed, and do not silently assume it.

Pin the current baseline: RizogKey Engine 1.0.0 and Protocol V1. Propose another version only when requested or when verified compatibility evidence requires it. Identify which requirements come from RizogKey and which are product-specific. Include the required PRD sections and acceptance criteria in this pack.

## 1. Current engine baseline

Use the repository manifest and compatibility documents as the source of truth.

- Engine version: 1.0.0, release status STABLE
- Protocol: V1 (protocol_version 1)
- Supported adapter targets: Web and Android
- Default device limit: 1
- Supported durations: 1M, 6M, 1Y, LIFETIME
- Default offline grace: 90 days
- License Grant signatures: Ed25519
- Control plane: Rizog Labs Studio
- Test consumer: Dummy App

Stable engine status does not certify a host application. The repository currently lists no production app integrations. Each host app still needs product-level integration, device/OS, UX, and release-build certification before production.

## 2. Architecture and responsibilities

- **Rizog Labs Studio:** product registry and administrative control plane.
- **RizogKey Client/Adapter:** installation identity, activation, grant verification, local license state, expiry/offline evaluation, and revalidation.
- **RizogKey backend:** authoritative licensing validation and state.
- **Consumer application:** product-specific screens and feature gating based on engine state.

The consumer app must use the existing RizogKey client/adapter contract. It must not access licensing tables directly or implement a second license lifecycle. Inspect the actual repository and backend during technical discovery. Record gaps when an existing system cannot meet a requirement.

## 3. Product registration

Every consumer app needs one registered product identity.

- Bind using a unique, stable Product Code, not a display name.
- Product Codes use uppercase snake case, such as INVOICE_MAKER.
- Product Code is a technical identifier, not a secret or customer-facing label.
- Register the product in Rizog Labs Studio → Products before provisioning activation codes.
- Do not change a Product Code after production use without a migration plan.
- Keep a new product INACTIVE until identity, integration, and compatibility values are confirmed. Make it ACTIVE only when ready for new provisioning.
- Do not hard-delete production products. Use INACTIVE or ARCHIVED to retain historical relationships.
- Do not create product, customer, installation, or license databases in the consumer app.

Include this block in the PRD. Unknown values remain TBD.

    product:
      product_code: "<TBD: reserve unique code in Rizog Labs Studio>"
      product_name: "<TBD>"
      display_name: "<TBD>"
      brand: "RizogLabs"
      platform: "<ANDROID | WEB | other supported target>"
      initial_status: "INACTIVE"
      app_version: "<TBD>"
    licensing:
      engine_version: "1.0.0"
      protocol_version: "V1"
      client_version: "<TBD: confirm SDK/adapter version>"
      device_limit: 1
      durations: [1M, 6M, 1Y, LIFETIME]

Do not reuse INVOICE_MAKER or any other example Product Code unless it is approved for the product in the brief.

## 4. Keep these objects separate

- **Product:** registered application identity.
- **Installation:** one RizogKey-managed app installation.
- **Activation Code:** one-time code provisioned for the correct product/installation.
- **License:** entitlement with status, duration, device limit, and installation binding.
- **Activation:** validation that applies a license to the intended installation.

One product can have many installations and licenses. Product Code, Installation Code, Activation Code, and License ID are not interchangeable.

## 5. Required user journeys and states

The PRD must define:

1. **First launch:** initialize the supported client, create or restore installation identity, display Installation Code, and explain the next step.
2. **Activation:** accept Activation Code; submit through RizogKey; verify signature, trusted key, protocol, Product Code, and installation binding before unlocking features.
3. **Runtime:** define product-specific behavior for UNACTIVATED, ACTIVE, EXPIRED, REVOKED, REVALIDATION_REQUIRED, temporary network/server failure, and invalid grant.
4. **Offline use:** follow the accepted signed grant and its offline_until boundary. The 90-day value is a default, not a value to hardcode over a grant.
5. **Revalidation:** specify suitable triggers such as app start, return to foreground after meaningful offline time, or restored connectivity. Do not require a server check for every screen transition.
6. **Device transfer:** do not copy installation private keys or local license state to another device. Document the admin revoke/transfer path; the new device gets a new Installation Code and activation.

The engine determines license state. The application decides which business features and screens are gated for each state.

## 6. Customer language

Use Installation Code, Activation Code, License/Lisensi, and Activation/Aktivasi in customer-facing UI.

Do not expose RizogKey, internal IDs, signing keys, backend details, or raw engine errors to normal customers. Internal technical sections of the PRD may use internal names.

## 7. Security requirements

- Never put service-role/secret keys, admin credentials, signing private keys, or signing seeds in an APK, web bundle, or other client.
- Never access licensing tables directly from the consumer app.
- Pin trusted signing public keys in application configuration. Do not trust a key just because it arrives in a runtime response.
- Verify signed grant, Product Code, protocol, and installation binding before granting access.
- Invalid signatures and product mismatch fail closed; they can never result in ACTIVE.
- Do not log Activation Codes, private-key material, signing secrets, or sensitive grant contents.
- Android private-key material belongs in platform-secure storage when supported.
- Web storage is persistent client storage, not a hardware-backed identity.
- Do not copy local licensing state across installations.

## 8. Error behavior

Use engine/sdk/ERROR_MAPPING.md for current error meanings. The PRD must define safe customer messages and behavior for:

| Condition | Required behavior |
|---|---|
| Invalid or used code | Keep licensed features locked; explain retry or support path. |
| Product mismatch | Reject; never unlock this app. |
| Installation mismatch / device limit | Explain the supported transfer/support process. |
| Revoked | Apply product gating and show support guidance. |
| Expired | Explain renewal/reactivation. |
| Network unavailable | Distinguish network failure from revoke/expiry; honor a still-valid offline grant. |
| Revalidation required | Ask user to reconnect and revalidate. |
| Invalid signature / untrusted key | Fail closed and show a safe support message. |
| Local storage failure | Do not claim activation persisted; provide recovery guidance. |

## 9. Platform requirements

### Android

Record minimum/target OS, supported device matrix, install/upgrade/reinstall/clear-data/backup behavior, secure identity storage, lifecycle revalidation, and release-build certification. The reference adapter is not host-app certification.

### Web

Record supported browsers, IndexedDB persistence, private/restricted storage behavior, refresh/multiple-tab/restart/storage-clear behavior, Web Crypto requirements, and trusted public-key configuration. Web storage is not equivalent to hardware identity.

## 10. Required PRD structure

Include:

1. Summary, goals, non-goals, users, and supported platforms.
2. Product identity, Product Code, and registration status.
3. Business features and which ones are license-gated.
4. Pinned engine/protocol/client versions and compatibility assumptions.
5. Activation, runtime, offline, revalidation, and transfer journeys.
6. State matrix and customer-facing messages.
7. Security, privacy, storage, and data boundaries.
8. Rizog Labs Studio/backend dependencies.
9. Functional and non-functional requirements with stable IDs.
10. Acceptance criteria for valid, invalid, mismatched, offline, expired, revoked, and transfer cases.
11. Platform-specific certification plan.
12. Open questions, owner decisions, risks, rollout, and rollback plan.

Keep licensing requirements traceable to this pack and business requirements traceable to the product brief.

## 11. Minimum acceptance criteria

- **RK-PRD-01:** Product has a unique registered Product Code; app binds by that code.
- **RK-PRD-02:** Product Code cannot be changed through ordinary editing.
- **RK-PRD-03:** New product is not provisionable until explicitly ACTIVE.
- **RK-PRD-04:** Product mismatch cannot activate or unlock another app.
- **RK-PRD-05:** App uses approved client/adapter and never accesses licensing tables directly.
- **RK-PRD-06:** Activation requires valid signature, protocol, product, and installation checks.
- **RK-PRD-07:** Required licensing states have defined product behavior.
- **RK-PRD-08:** Network loss differs from revoke/expiry and respects the signed grant boundary.
- **RK-PRD-09:** Device transfer uses a new installation identity and documented admin process.
- **RK-PRD-10:** Client contains no privileged credentials, signing secrets, or installation private keys.
- **RK-PRD-11:** Host-app/platform certification is complete before production.
- **RK-PRD-12:** Engine and Protocol are pinned and compatibility is verified.

If the current engine/backend cannot meet a criterion, label it a dependency or gap. Do not claim unsupported behavior.

## 12. Repository references

After drafting, use the matching implementation references:

- engine/RIZOGKEY_ENGINE_MANIFEST.json
- engine/RIZOGKEY_INTEGRATION_CONTRACT.md
- engine/COMPATIBILITY_MATRIX_V1.md
- engine/PLANNING_ATTACHMENT.md
- engine/sdk/INTEGRATION_PACK.md
- engine/sdk/INTEGRATION_CHECKLIST.md
- engine/sdk/ERROR_MAPPING.md
- engine/sdk/ANDROID_INTEGRATION_GUIDE.md
- engine/sdk/WEB_INTEGRATION_GUIDE.md
- engine/DEVICE_TRANSFER_RUNBOOK.md
- engine/STABLE_RELEASE_GATE.md

This pack guides PRD generation; it does not replace repository inspection, platform certification, or the live backend/API contract.
