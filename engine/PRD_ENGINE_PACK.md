# RizogKey Engine — Product Requirements Document Pack

Version: 2.0  
Document type: Product Requirements Document (PRD) for RizogKey Engine  
Owner: Rizog Labs  
Current release baseline: Engine 1.0.0 — STABLE  
Protocol baseline: V1

---

## Copy-ready prompt

Use this pack to create or update the PRD for **RizogKey Engine itself**.

The subject of the PRD is always RizogKey Engine. Do not turn this into a PRD for a customer app, host application, or another product. Do not add, invent, or request names for consumer products. Do not include example Product Codes, product names, display names, or product identity blocks.

Treat the engine boundaries, security requirements, and current stable baseline in this pack as constraints. Inspect the repository, manifest, contracts, SDKs, backend functions, database migrations, Studio, and certification evidence before describing current behavior. Distinguish verified existing behavior from proposed changes. Never invent APIs, schema, cryptographic behavior, or guarantees. Mark unresolved decisions as **TBD — confirm with owner**, with the decision and its impact.

Produce an implementation-ready PRD for RizogKey Engine, including the sections and acceptance criteria below. Keep it reusable across future consuming applications: discuss consumer applications generically, without naming any.

## 1. Product definition

**Product name:** RizogKey Engine  
**Product owner:** Rizog Labs  
**Product type:** Shared licensing engine and control-plane capability  
**Purpose:** Provide a secure, versioned, reusable licensing lifecycle for applications that integrate through the supported client and protocol contracts.

RizogKey Engine is an internal platform capability. “RizogKey” is not a customer-facing brand. Customer applications may present generic licensing concepts such as Installation Code, Activation Code, License, and Activation.

## 2. Current baseline

Use the repository manifest and release evidence as the source of truth.

- Engine: 1.0.0, status STABLE
- Protocol: V1 (protocol_version 1)
- Current supported adapters: Web and Android
- Default device limit: 1
- Supported durations: 1M, 6M, 1Y, LIFETIME
- Default offline grace: 90 days, subject to the signed grant boundary
- License Grant signatures: Ed25519
- Administrative control plane: Rizog Labs Studio
- Test consumer: Dummy App

The stable label describes the engine release; it does not certify any consuming application. State current certification evidence separately from the proposed roadmap.

## 3. Goals

The PRD must define requirements to:

1. Create and manage installation identity using the supported platform adapters.
2. Issue and consume Installation Codes and Activation Codes through the documented contract.
3. Bind licenses to the correct installation and enforce device limits.
4. Produce, sign, verify, store, and evaluate License Grants according to the current protocol.
5. Support license duration, expiry, offline use, revalidation, revoke, and transfer lifecycle.
6. Provide secure administrative product and license operations through Rizog Labs Studio and authorized backend paths.
7. Maintain explicit client, protocol, backend, and engine version compatibility.
8. Certify the engine with the Dummy App and document host integration requirements without defining any host product.

## 4. Non-goals and boundaries

The PRD must not expand RizogKey Engine into:

- A customer-facing application or brand.
- A business-domain app or feature set for a consuming application.
- A separate license database inside each consumer.
- A mechanism for customer apps to query licensing tables directly.
- An implicit promise that reference adapters certify every host app.
- A change to stable Protocol V1 behavior without an explicit compatibility and versioning decision.

Consumer applications own their business data and business UX. RizogKey owns the shared license lifecycle and licensing state. Consumer applications use the documented SDK/adapter contract and decide how their own features react to engine states.

## 5. Users and actors

Describe these actors generically; do not assign consumer product names:

- **Rizog Labs administrator:** manages engine configuration and authorized licensing operations.
- **Integrator/developer:** integrates the engine through documented SDKs and protocol contracts.
- **End user:** activates and uses a consuming application, following generic licensing UX.
- **RizogKey Engine:** performs identity, activation, grant, state, and revalidation responsibilities.
- **Rizog Labs Studio:** administrative control plane.
- **RizogKey backend:** authoritative server-side validation and licensing state.
- **Dummy App:** test consumer for engine regression and certification.

For each actor, state permissions, supported actions, and trust boundaries from repository evidence.

## 6. Core concepts and lifecycle

Keep these concepts distinct:

- **Installation:** one engine-managed installation identity on a supported platform.
- **Installation Code:** identifier exposed for the activation workflow; not an Activation Code.
- **Activation Code:** one-time or otherwise contract-defined credential used to request activation.
- **License:** entitlement with status, duration, device limit, and installation binding.
- **License Grant:** signed data consumed and validated by a client according to Protocol V1.
- **Activation:** server/client lifecycle operation that applies an eligible license to an installation.
- **Revalidation:** refresh of authoritative state, subject to offline-grant rules.
- **Revocation/transfer:** administrative lifecycle operations that change whether an installation may continue using an entitlement.

Write an authoritative state model based on implementation and contract evidence. Include normal, expired, revoked, offline, revalidation-required, and failure cases. Identify whether states are server-authoritative, client-derived, or grant-derived.

## 7. Functional requirements

The PRD must define testable requirements for:

### Installation identity

- Initialization, identity creation/restoration, and retrieval of Installation Code.
- Persistence behavior and recovery from local storage failure.
- Device reinstall, app data clearing, backup/restore, and transfer behavior for Web and Android.
- Protection against copying installation private keys or local license state across installations.

### Activation and license binding

- Activation Code validation and consumption.
- Product binding as an abstract engine integration parameter; do not name or instantiate any consuming product.
- Installation binding and device-limit enforcement.
- Duplicate, expired, revoked, malformed, and already-consumed activation attempts.
- Idempotency, concurrency, and retry behavior according to the actual backend contract.
- Exact outcomes for success and each error class.

### License Grant and local evaluation

- Grant payload and signature contract, sourced from Protocol V1 artifacts.
- Trusted-key configuration, key rotation, versioning, and rejection of untrusted keys.
- Verification of signature, protocol, installation binding, and engine-supported constraints.
- Local evaluation of status and expiry.
- Offline eligibility through the grant's signed offline boundary; do not hardcode the default grace period over grant values.
- Fail-closed behavior for invalid signature, malformed grant, or incompatible protocol.

### Revalidation and network behavior

- Revalidation triggers, network failure handling, retry and backoff, and server error behavior.
- Distinction between network unavailability and authoritative revoke/expiry.
- Behavior when the offline grant expires or revalidation becomes required.
- Prevention of excessive revalidation requests.

### Revoke and transfer

- Authorized administrative revoke and transfer operations.
- Effects on server state and on later client revalidation.
- Transfer to a new installation identity without copying private keys or local state.
- Audit trail and operator visibility based on existing control-plane/backend behavior.

### Control plane and backend

- Product registry as a generic engine capability; requirements must not contain a sample product name or Product Code.
- Activation generation/history, license and installation relationships, revoke/transfer, and authorization boundaries, where verified in the repository.
- Server-side validation and secret custody.
- Auditability, input validation, rate limiting, and operational observability grounded in actual architecture.
- Explicit handling of gaps between current Studio functionality and engine requirements.

## 8. Security, privacy, and threat model

The PRD must include threats, mitigations, and verification evidence for:

- Client extraction of privileged credentials or signing secrets.
- Forged, altered, expired, replayed, or cross-installation grants.
- Activation Code leakage, guessing, replay, or unintended reuse.
- Product/protocol mismatch.
- Installation identity copying or rollback.
- Revoke bypass during offline operation.
- Local data loss, tampering, clock changes, and restricted browser storage.
- Unauthorized Studio operations and direct table access.
- Sensitive data in logs, telemetry, or support diagnostics.
- Signing-key rotation and compromise response.

Baseline requirements:

- No service-role key, signing private key, signing seed, or administrative credential in client bundles.
- Licensing tables are accessed through authorized server-side paths, not directly by consumer apps.
- Trusted public signing keys are pinned or otherwise trusted through a documented secure mechanism; runtime delivery alone does not establish trust.
- Invalid signature or protocol/product/installation mismatch never grants ACTIVE state.
- Activation Codes, private-key material, signing secrets, and sensitive grant contents are not written to logs.
- Platform storage limitations are documented; Web storage is not hardware-backed identity.
- State rollback and device transfer risks are explicitly addressed based on platform capabilities.

Do not promise protections that the current platform cannot provide; list them as limitations or risks.

## 9. Error taxonomy and observability

Use the repository's current error mapping as the source of truth. Include:

- Stable machine-readable error code and user-safe category.
- Whether retry is appropriate and any backoff rules.
- Expected client state after the error.
- Safe diagnostic identifiers and redaction requirements.
- Monitoring signals for activation failures, signature failures, revalidation outages, and administrative actions.

Do not expose raw internal exceptions or sensitive protocol details to end users.

## 10. Platform and compatibility requirements

### Android

Specify supported OS/API levels from evidence, key storage, process lifecycle, reinstall/clear-data/backup behavior, network transitions, and release-build certification. Mark unverified platform coverage TBD.

### Web

Specify supported browsers, IndexedDB and Web Crypto requirements, private/restricted storage behavior, refresh/multi-tab/restart/storage-clear behavior, and limitations versus hardware-backed identity.

### Version compatibility

Pin and define compatibility among engine version, Protocol V1, client/adapter versions, backend functions, and trusted signing-key versions. Explain breaking-change policy, deprecation, migrations, and rollback from evidence. A stable protocol change requires explicit versioning and compatibility review.

## 11. Non-functional requirements

Define measurable targets or mark them TBD for:

- Security and cryptographic verification.
- Availability and recovery objectives for authoritative backend operations.
- Activation and revalidation latency.
- Offline behavior and clock-skew tolerance.
- Scalability, rate limits, and concurrency.
- Reliability, data integrity, and audit retention.
- Accessibility and localization of generic licensing UX.
- Logging, monitoring, support diagnostics, and incident response.
- SDK distribution, documentation quality, and integration effort.

Do not fabricate numeric targets. Give each TBD an owner decision and the design/test impact.

## 12. Required PRD structure

Deliver the engine PRD in this order:

1. Executive summary and product definition.
2. Current behavior and repository evidence.
3. Goals, non-goals, actors, and trust boundaries.
4. Architecture and component responsibilities.
5. Core concepts and authoritative state/lifecycle model.
6. Functional requirements with stable IDs.
7. Security, privacy, and threat model.
8. Error taxonomy and observability.
9. Platform and compatibility requirements.
10. Non-functional requirements and TBD decisions.
11. Test strategy and certification gates, including Dummy App.
12. Rollout, versioning, migration, rollback, and operations.
13. Risks, dependencies, open questions, and decision owners.
14. Traceability from each requirement to source evidence and acceptance criteria.

Each requirement must say whether it is **Existing**, **Change**, or **New**. Cite repository paths and contract sections for verified behavior. Separate current facts from proposed requirements.

## 13. Minimum acceptance criteria

Use stable IDs and expand these into verifiable cases:

- **RKE-PRD-01:** Document describes RizogKey Engine itself; it does not become a PRD for a consuming application.
- **RKE-PRD-02:** No consumer product name, sample Product Code, or product identity example appears in the document.
- **RKE-PRD-03:** Engine, Protocol, client/adapter, backend, and Studio responsibilities are separated and evidence-backed.
- **RKE-PRD-04:** Installation, Activation Code, License, License Grant, and Activation are distinct.
- **RKE-PRD-05:** Activation success and failure cases include binding, device limit, replay/duplicate, and authorization behavior from the actual contract.
- **RKE-PRD-06:** Grant validation covers signature, trusted key, protocol, and installation binding; invalid grants fail closed.
- **RKE-PRD-07:** Offline operation follows the signed grant boundary and distinguishes network failure from revoke/expiry.
- **RKE-PRD-08:** Revalidation, revoke, transfer, expiry, and recovery behavior are specified across supported platforms.
- **RKE-PRD-09:** Threat model covers secrets, grant tampering, identity copying, storage limits, and administrative access.
- **RKE-PRD-10:** No fabricated API, schema, numeric SLO, or security guarantee is presented as existing behavior.
- **RKE-PRD-11:** Existing behavior, proposed changes, TBD decisions, risks, and dependencies are clearly separated.
- **RKE-PRD-12:** Test and release gates cover the engine with Dummy App and state host-application certification as separate work.

If any criterion conflicts with current implementation, document the gap and owner decision. Do not claim the criterion is already met without evidence.

## 14. Repository evidence to inspect

Use these files and inspect additional implementation as needed:

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
- engine/CERTIFICATION_REPORT_V1.md
- Relevant backend functions, database migrations, client/adapter source, Studio source, tests, and workflows.

This pack is a reusable instruction and requirements baseline. The PRD author must inspect the current repository and distinguish documented intent from implemented and certified behavior.
