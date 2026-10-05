# RizogKey Engine — Android Adapter

## Target

RizogKey Android Adapter V1 targets Android API 33+ for native Ed25519 verification of signed License Grants.

Android's current platform API documents Ed25519 signature support from API 33 onward. Android Keystore is used for the installation key material; the private key is never serialized into the application data store. citeturn782394search5turn782394search0

## Integration contract

The host application supplies:

- productCode
- clientVersion
- licensing API URL
- trusted signing public-key map
- customer-facing activation screens

The adapter supplies:

- installation identity
- Installation Code
- activation request
- signed License Grant verification
- local license state
- offline/expiry status
- revalidation
- clear local state

## Minimum host API

```kotlin
initialize()
getInstallationCode()
getStatus()
activate(code)
revalidate()
getLicense()
clearLocalState()
```

## Important

The adapter source is a reference implementation boundary. Every Android product must still run its own release/device matrix before customer release.
