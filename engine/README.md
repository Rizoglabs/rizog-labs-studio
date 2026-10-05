# RizogKey Engine

RizogKey Engine is the reusable internal licensing product of Rizog Labs.

It is NOT a customer application and it is NOT embedded directly into a production customer app during engine development.

## Product role

RizogKey Engine provides a standard licensing layer that future Rizog Labs applications can consume.

It defines:

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
- Platform adapters

## Relationship to Rizog Labs Studio

RizogKey Engine is the licensing product.

Rizog Labs Studio is the administrative control plane that operates the licensing infrastructure.

Customer applications consume RizogKey Engine through the defined client contract.

## Development rule

Do not integrate RizogKey Engine into RupKas or another production application while the engine contract is still changing.

Use a dedicated Dummy App / Test App to validate every engine release first.

## Target packaging

A future engine release should be attachable to product planning as one reusable product artifact.

A planning package should contain:

1. Product manifest
2. Engine architecture
3. Protocol contract
4. Integration contract
5. Platform requirements
6. Security requirements
7. Compatibility rules
8. Test requirements
9. Known limitations
10. Version/changelog

## Current status

RizogKey Engine V1 is in foundation/alpha stage.

The backend protocol and licensing API foundations exist.

Customer-app integration is intentionally NOT part of this stage.
