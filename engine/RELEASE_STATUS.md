# RizogKey Engine — Release Status

## Version

RizogKey Engine: 1.0.0-alpha  
RizogKey Protocol: V1

## Implemented backend capabilities

- Activation Code generation through Rizog Labs Studio
- Installation records
- License records
- License-to-installation binding
- Activation lifecycle
- Revalidation lifecycle
- Revoke lifecycle
- License event audit trail
- Signed License Grant infrastructure
- Web-facing RizogKey Client API

## Current backend endpoints

RizogKey Client API:

    https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client

Supported actions:

- activate
- revalidate
- health

Administrative operations remain behind Rizog Labs Studio.

## Intentionally not integrated

No production customer application is currently designated as a RizogKey Engine consumer.

RupKas is explicitly excluded from engine development/testing at this stage.

## Next engine milestone

Build and certify a standalone Dummy App.

The Dummy App will be the first consumer and the certification target for:

- activation
- signed grant verification
- offline behavior
- revalidation
- revoke
- expiration
- device transfer
- compatibility
- failure handling

Only after the engine passes the Dummy App test matrix should an actual customer application be integrated.
