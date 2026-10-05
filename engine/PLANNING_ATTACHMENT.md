# RizogKey Engine — Planning Attachment

Use this file as a reusable planning attachment whenever a new Rizog Labs application may require licensing.

## Instruction to the product planner

This product uses RizogKey Engine as its standard licensing infrastructure.

Do not design a new licensing system from scratch.

During planning:

1. Read the RizogKey Engine manifest.
2. Read the RizogKey Integration Contract.
3. Determine the target platform.
4. Map the application's activation UX to Installation Code + Activation Code.
5. Keep licensing logic behind the RizogKey Client boundary.
6. Do not expose the RizogKey brand to customers.
7. Do not create direct database access from the application to the RizogKey licensing tables.
8. Identify only the application-specific license behavior that must be configured.
9. Treat RizogKey Engine as a reusable dependency.
10. Use a Dummy App for engine validation when the engine version or integration is new.

## Required planning output

The PRD for a new application should contain:

### Licensing Dependency

- RizogKey Engine version
- RizogKey Protocol version
- platform adapter
- product code
- default device limit
- supported license durations

### Activation UX

- first-launch behavior
- Installation Code display
- Activation Code input
- success behavior
- invalid-code behavior
- revoked-license behavior
- expired-license behavior
- revalidation-required behavior

### Technical Boundary

The application must call the RizogKey Client abstraction and must not reimplement license business rules.

## Important

RizogKey Engine is a dependency of the product plan, not a reason to redesign the product's business domain.

Example:

    RupKas
      +
    RizogKey Engine V1
      =
    licensed RupKas application

RizogKey Engine remains independently versioned.
