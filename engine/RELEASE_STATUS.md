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
- Standalone Dummy App certification target

## Current backend endpoints

RizogKey Client API:

    https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client

Supported actions:

- activate
- revalidate
- health

Administrative operations remain behind Rizog Labs Studio.

## Dummy App

Location:

    engine/dummy-app/

Purpose:

The Dummy App is the first consumer of the engine contract and is used only for certification/regression testing.

It is not a customer product.

## Production application policy

No production customer application is currently designated as a RizogKey Engine consumer.

RupKas is explicitly excluded from engine development/testing at this stage.

## Next engine milestone

Certify the Dummy App against the complete test matrix, then move the engine from ALPHA toward BETA.

Only after the engine passes certification should an actual customer application integrate it.
