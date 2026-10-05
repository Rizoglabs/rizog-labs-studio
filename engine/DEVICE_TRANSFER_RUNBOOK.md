# RizogKey Device Transfer Runbook V1

Device transfer is an administrative workflow, not a client-side self-service feature.

## Flow

```
Old installation
  ↓
Revoke old license / installation
  ↓
New device starts
  ↓
New Installation Code
  ↓
Generate new Activation Code in Rizog Labs Studio
  ↓
Activate on new device
  ↓
New ACTIVE License Grant
```

## Rules

1. Never copy a local license state from the old device to the new device.
2. Never reuse an Activation Code.
3. The old installation must not remain authorized after the transfer is completed.
4. The new device receives a new Installation Code.
5. A new Activation Code is generated for the new installation.
6. The transfer must be auditable through license events.
7. Customer-facing apps should explain the transfer using normal terms such as device replacement or activation transfer. The internal RizogKey name remains hidden.

## Acceptance test

The transfer matrix is considered passed when:

- the old license is no longer ACTIVE;
- the new installation can activate successfully;
- the old Activation Code cannot be reused;
- the new license has its own activation timestamp;
- audit events show the old authorization being revoked and the new authorization being activated.
