# RizogKey Engine 1.0.0 — Error Mapping

Use internal engine errors for application logic and map them to customer-facing messages.

| Internal error/state | Meaning | Recommended customer message |
|---|---|---|
| RK_NOT_INITIALIZED | Client used before initialization | Sistem aktivasi belum siap. Silakan buka kembali aplikasi. |
| RK_WEB_CRYPTO_UNAVAILABLE | Required browser crypto unavailable | Perangkat/browser ini tidak mendukung fitur keamanan yang diperlukan. |
| RK_NETWORK_UNAVAILABLE | Network request failed | Tidak dapat terhubung ke server. Periksa koneksi internet dan coba lagi. |
| RK_SERVER_ERROR | Unexpected server response | Server aktivasi sedang mengalami masalah. Coba lagi nanti. |
| ACTIVATION_INVALID | Activation Code invalid | Kode Aktivasi tidak valid. Periksa kembali kode yang diberikan. |
| ACTIVATION_USED | Activation Code already used | Kode Aktivasi sudah pernah digunakan. |
| PRODUCT_MISMATCH / RK_PRODUCT_MISMATCH | Code/grant belongs to another product | Kode Aktivasi bukan untuk aplikasi ini. |
| INSTALLATION_MISMATCH / RK_INSTALLATION_MISMATCH | Grant belongs to another installation | Lisensi terdaftar pada perangkat lain. Hubungi pemilik lisensi. |
| DEVICE_LIMIT | Device limit reached | Batas perangkat lisensi sudah tercapai. |
| RK_SIGNED_GRANT_REQUIRED | Server did not return a complete signed grant | Aktivasi gagal diverifikasi. Coba lagi. |
| RK_SIGNING_KEY_UNTRUSTED | Signing key is not trusted by this app | Aktivasi ditolak oleh pemeriksaan keamanan. Hubungi dukungan. |
| RK_GRANT_INVALID | Signature verification failed | Data lisensi tidak dapat diverifikasi. Jangan lanjutkan penggunaan. |
| LICENSE_REVOKED / REVOKED | License has been revoked | Lisensi ini sudah dinonaktifkan. Hubungi pemilik lisensi. |
| LICENSE_EXPIRED / EXPIRED | License expired | Lisensi sudah kedaluwarsa. Perbarui atau aktivasi kembali lisensi. |
| REVALIDATION_REQUIRED | Offline boundary exceeded | Hubungkan perangkat ke internet untuk memverifikasi lisensi. |
| RK_LOCAL_STORAGE_UNAVAILABLE | Client cannot persist state | Penyimpanan perangkat/browser tidak tersedia. Periksa izin dan ruang penyimpanan. |
| RK_PROTOCOL_UNSUPPORTED | Grant protocol version is unsupported | Versi lisensi tidak didukung. Hubungi dukungan. |
| RK_LICENSE_MISMATCH | Revalidation returned a different license | Lisensi tidak cocok dengan instalasi ini. Hubungi dukungan. |
| RK_GRANT_INVALID (cached) | Cached License Grant failed signature verification | Status lisensi tidak dapat diverifikasi. Hubungi dukungan. |

## Rules

1. Do not expose raw internal error codes to normal customers unless support/debug mode explicitly requires them.
2. Keep logging separate from customer messaging.
3. Network failure must not be translated into LICENSE_REVOKED.
4. INVALID SIGNATURE must never be treated as ACTIVE.
5. Product mismatch must never unlock another product.
