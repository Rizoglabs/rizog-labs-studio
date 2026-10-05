# RizogKey Engine — Release Status

## Release candidate

RizogKey Engine: 1.0.0-rc.1  
RizogKey Protocol: V1

## Backend capabilities

- Activation Code generation through Rizog Labs Studio
- Installation records
- License records
- License-to-installation binding
- Activation lifecycle
- Revalidation lifecycle
- Revoke lifecycle
- License event audit trail
- Signed License Grant infrastructure
- Canonical signed-grant serialization
- Trusted signing-key pinning in clients
- Web client adapter
- Android adapter reference
- Standalone Dummy App certification target

## Current backend endpoints

RizogKey Client API:

    https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client

Supported actions:

- activate
- revalidate
- health

Administrative operations remain behind Rizog Labs Studio.

## Current release gates

The RC gate requires the published Dummy App browser certification to remain green after the security hardening changes, plus backend lifecycle certification and the documented device-transfer/compatibility gates.

## Production application policy

No production customer application is currently designated as a RizogKey Engine consumer.

RupKas remains explicitly excluded until the stable release gate is completed.

## Release decision

Current status:

    RELEASE CANDIDATE — 1.0.0-rc.1

The engine must not be labeled STABLE until the stable release gate is green for this release candidate.
