# Android Quickstart

This example connects a native Android app to the live RizogKey Engine endpoint. Replace only `YOUR_PRODUCT_CODE` with the Product Code registered in Rizog Labs Studio.

## 1. Add the adapter

Copy `RizogKeyClient.kt` into your app's Kotlin source tree under package `com.rizoglabs.rizogkey`, or change its package declaration to match your app.

The adapter requires Android API 33 or later for its native Ed25519 verification path. Add internet permission to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## 2. Configure and initialize

The current public Supabase publishable key and trusted Ed25519 public key are suitable for client configuration:

```kotlin
private const val PRODUCT_CODE = "YOUR_PRODUCT_CODE"
private const val CLIENT_VERSION = "1.0.0"
private const val API_URL =
    "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client"
private const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kkgCQkdmeyiMW4Tt_YVi7w_ff1ZVcz_"
private const val LICENSE_SIGNING_KEY_V1 = "UnS601AB8gu4rxNrwcuz+m9WIOt7+43Pa2c3uLPWD8k="

private val client by lazy {
    RizogKeyClient(
        context = applicationContext,
        productCode = PRODUCT_CODE,
        apiUrl = API_URL,
        clientVersion = CLIENT_VERSION,
        trustedSigningKeys = mapOf(1 to LICENSE_SIGNING_KEY_V1),
        publishableKey = SUPABASE_PUBLISHABLE_KEY,
    )
}
```

Initialize on a background thread because network methods in this reference adapter are blocking:

```kotlin
lifecycleScope.launch {
    try {
        val status = withContext(Dispatchers.IO) {
            client.initialize()
            client.getStatus()
        }
        renderLicenseState(status, client.getInstallationCode())
    } catch (error: Exception) {
        showSafeActivationError(error.message ?: "RK_SERVER_ERROR")
    }
}
```

Add AndroidX Lifecycle KTX if the app does not already use `lifecycleScope` and `Dispatchers.IO`.

## 3. Activate and gate features

Show `client.getInstallationCode()` to the user. After receiving an Activation Code:

```kotlin
lifecycleScope.launch {
    try {
        val grant = withContext(Dispatchers.IO) {
            client.activate(activationCodeInput.text.toString())
        }
        renderLicenseState(client.getStatus(), client.getInstallationCode())
    } catch (error: Exception) {
        showSafeActivationError(error.message ?: "RK_SERVER_ERROR")
    }
}
```

Unlock licensed features only when `client.getStatus() == "ACTIVE"`. Never unlock based only on an HTTP success response.

## 4. Revalidate

Revalidate on app start when appropriate, after a meaningful offline period, and when connectivity returns. Run it off the main thread:

```kotlin
val result = withContext(Dispatchers.IO) {
    runCatching { client.revalidate() }
}
renderLicenseState(client.getStatus(), client.getInstallationCode())
result.exceptionOrNull()?.let { showSafeActivationError(it.message ?: "RK_SERVER_ERROR") }
```

Map internal errors through `ERROR_MAPPING.md`. Network failure must not be displayed as revoke or expiry.

## 5. Device and release checks

Test clean install, upgrade, data clear, uninstall/reinstall, offline start, network return, expiry, revoke, device transfer, backup/restore, and a signed release build. Keep the private installation key in Android Keystore. Do not copy local license state to another device.
