# RizogKey Engine — Release Status

## Stable release

RizogKey Engine: 1.0.0  
RizogKey Protocol: V1

## Status

**STABLE**

The standalone engine certification gate is complete.

## Certified capabilities

- Activation Code generation through Rizog Labs Studio
- Installation identity
- Installation/license binding
- Activation lifecycle
- Activation Code reuse protection
- Revalidation lifecycle
- Revocation detection
- Expiration detection
- Signed License Grants
- Canonical Grant signing payload
- Trusted signing-key pinning
- Web Crypto verification
- Browser persistence
- Offline grace state evaluation
- Network-loss handling
- Device transfer runbook
- Web SDK reference implementation
- Android adapter reference
- Dummy App regression suite

## Stable gate evidence

- GitHub Actions run: #90
- Published Dummy App smoke test: PASS
- Browser certification: PASS
- Backend lifecycle certification: PASS
- Protocol: V1

## Production integration policy

RizogKey Engine 1.0.0 is now the standard reusable licensing dependency for new Rizog Labs products.

RupKas remains intentionally excluded from engine development history; future product planning may consume RizogKey Engine 1.0.0 through the Integration Contract.

## Versioning

- Engine: 1.0.0
- Protocol: V1
- Breaking protocol changes require a new protocol version.
- Client adapters remain versioned independently from the host application.

## Next maintenance rule

Any modification to licensing protocol, signing, client-state evaluation, activation/revalidation behavior, or adapter security must reopen the stable certification gate before the modified engine can be released.
