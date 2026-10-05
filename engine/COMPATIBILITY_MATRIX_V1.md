# RizogKey Engine V1 — Compatibility Matrix

| Area | Target | Gate |
|---|---|---|
| Protocol | V1 | PASS |
| Server activation | RizogKey Client API | PASS |
| Server revalidation | RizogKey Client API | PASS |
| Activation reuse protection | Server RPC | PASS |
| Revocation | Server RPC + client state | PASS |
| Expiration | Server RPC + client state | PASS |
| Signed grants | Ed25519 | PASS |
| Signing key pinning | Client | PASS |
| Web Crypto | Browser | PASS |
| Browser persistence | IndexedDB | PASS |
| Offline state | Client grant boundary | PASS |
| Network loss | Client error mapping | PASS |
| Device transfer | Admin runbook + server primitives | PASS |
| Customer-facing terminology | Host application contract | PASS |
| Direct DB access | Prohibited | PASS |
| Service-role exposure | Prohibited | PASS |
| Android | Adapter contract | DOCUMENTED / HOST-APP CERTIFICATION REQUIRED |

## Release interpretation

The engine contract and licensing protocol are stable only when the CI certification suite remains green and no stable-gate regression is introduced.

Android applications must additionally execute their host-app/device matrix before release because the application adapter and Android build environment are outside the standalone Web Dummy App.
