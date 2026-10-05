package com.rizoglabs.rizogkey

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.time.Instant
import java.util.UUID

class RizogKeyClient(
    context: Context,
    private val productCode: String,
    private val apiUrl: String,
    private val clientVersion: String,
    private val trustedSigningKeys: Map<Int, String>,
) {
    companion object {
        private const val KEY_ALIAS_PREFIX = "rizogkey.install."
        private const val PREFS = "rizogkey.state"
        private const val INSTALLATION_CODE = "installation_code"
        private const val LICENSE_JSON = "license_json"
        private const val LICENSE_SIGNATURE = "license_signature"
        private const val SIGNING_KEY_VERSION = "signing_key_version"
        private const val TIMEOUT_MS = 15_000
    }

    private val appContext = context.applicationContext
    private val prefs: SharedPreferences = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val alias = KEY_ALIAS_PREFIX + productCode.uppercase()

    @Volatile private var keyPair: KeyPair? = null

    fun initialize(): RizogKeyClient {
        require(Build.VERSION.SDK_INT >= 33) { "RK_ANDROID_CRYPTO_UNAVAILABLE" }
        loadOrCreateKeyPair()
        if (!prefs.contains(INSTALLATION_CODE)) {
            val code = "RPK-INST-" + randomPart(5) + "-" + randomPart(5)
            prefs.edit().putString(INSTALLATION_CODE, code).apply()
        }
        return this
    }

    fun getInstallationCode(): String =
        prefs.getString(INSTALLATION_CODE, null) ?: error("RK_NOT_INITIALIZED")

    fun getStatus(): String {
        val raw = prefs.getString(LICENSE_JSON, null) ?: return "UNACTIVATED"
        val grant = JSONObject(raw)
        if (grant.optString("product_code") != productCode.uppercase()) return "PRODUCT_MISMATCH"
        if (grant.optString("status") != "ACTIVE") return grant.optString("status", "UNKNOWN")

        val expires = grant.optString("expires_at")
        if (expires.isNotBlank() && Instant.parse(expires).isBefore(Instant.now())) return "EXPIRED"

        val offlineUntil = grant.optString("offline_until")
        if (offlineUntil.isNotBlank() && Instant.parse(offlineUntil).isBefore(Instant.now())) return "REVALIDATION_REQUIRED"

        return "ACTIVE"
    }

    fun getLicense(): JSONObject? =
        prefs.getString(LICENSE_JSON, null)?.let(::JSONObject)

    fun activate(activationCode: String): JSONObject {
        val data = request(
            JSONObject()
                .put("action", "activate")
                .put("product_code", productCode.uppercase())
                .put("installation_code", getInstallationCode())
                .put("activation_code", activationCode.trim().uppercase())
                .put("platform", "android")
                .put("public_key", publicKeyBase64())
                .put("client_version", clientVersion)
        )
        return acceptSignedGrant(data)
    }

    fun revalidate(): JSONObject {
        val grant = getLicense() ?: error("RK_ACTIVATION_REQUIRED")
        val data = request(
            JSONObject()
                .put("action", "revalidate")
                .put("product_code", productCode.uppercase())
                .put("license_id", grant.getString("license_id"))
                .put("installation_id", grant.getString("installation_id"))
                .put("public_key", publicKeyBase64())
                .put("client_version", clientVersion)
        )
        return acceptSignedGrant(data)
    }

    fun clearLocalState() {
        prefs.edit()
            .remove(LICENSE_JSON)
            .remove(LICENSE_SIGNATURE)
            .remove(SIGNING_KEY_VERSION)
            .remove(INSTALLATION_CODE)
            .apply()
    }

    private fun loadOrCreateKeyPair() {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (store.containsAlias(alias)) {
            val privateKey = store.getKey(alias, null) as java.security.PrivateKey
            val publicKey = store.getCertificate(alias).publicKey
            keyPair = KeyPair(publicKey, privateKey)
            return
        }

        val generator = KeyPairGenerator.getInstance("EC", "AndroidKeyStore")
        generator.initialize(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .build()
        )
        keyPair = generator.generateKeyPair()
    }

    private fun publicKeyBase64(): String {
        val publicKey = keyPair?.public ?: error("RK_NOT_INITIALIZED")
        return Base64.encodeToString(publicKey.encoded, Base64.NO_WRAP)
    }

    private fun acceptSignedGrant(data: JSONObject): JSONObject {
        val grant = data.optJSONObject("license_grant") ?: error("RK_SIGNED_GRANT_REQUIRED")
        val signatureB64 = data.optString("signature")
        val keyVersion = data.optInt("signing_key_version", data.optJSONObject("signing")?.optInt("key_version", 0) ?: 0)
        val signing = data.optJSONObject("signing")
        val signingPublicKey = signing?.optString("public_key").orEmpty()

        if (signatureB64.isBlank() || signingPublicKey.isBlank() || keyVersion == 0) {
            error("RK_SIGNED_GRANT_REQUIRED")
        }
        if (grant.optString("product_code") != productCode.uppercase()) error("RK_PRODUCT_MISMATCH")

        val trusted = trustedSigningKeys[keyVersion]
        if (trusted == null || trusted != signingPublicKey) error("RK_SIGNING_KEY_UNTRUSTED")

        val publicKey = KeyFactory.getInstance("Ed25519")
            .generatePublic(X509EncodedKeySpec(ed25519Spki(Base64.decode(signingPublicKey, Base64.DEFAULT))))

        val verifier = Signature.getInstance("Ed25519")
        verifier.initVerify(publicKey)
        verifier.update(grant.toString().toByteArray(StandardCharsets.UTF_8))
        if (!verifier.verify(Base64.decode(signatureB64, Base64.DEFAULT))) {
            error("RK_GRANT_INVALID")
        }

        prefs.edit()
            .putString(LICENSE_JSON, grant.toString())
            .putString(LICENSE_SIGNATURE, signatureB64)
            .putInt(SIGNING_KEY_VERSION, keyVersion)
            .apply()

        return grant
    }

    private fun request(body: JSONObject): JSONObject {
        val connection = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = TIMEOUT_MS
            readTimeout = TIMEOUT_MS
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }

        return try {
            connection.outputStream.use { it.write(body.toString().toByteArray(StandardCharsets.UTF_8)) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val response = stream.bufferedReader().use { it.readText() }
            if (code !in 200..299) {
                val error = runCatching { JSONObject(response).optString("error") }.getOrDefault("RK_SERVER_ERROR")
                error(error.ifBlank { "RK_SERVER_ERROR" })
            }
            JSONObject(response).optJSONObject("data") ?: error("RK_SERVER_ERROR")
        } catch (e: java.net.SocketTimeoutException) {
            error("RK_NETWORK_UNAVAILABLE")
        } catch (e: java.io.IOException) {
            error("RK_NETWORK_UNAVAILABLE")
        } finally {
            connection.disconnect()
        }
    }

    private fun randomPart(length: Int): String =
        UUID.randomUUID().toString().replace("-", "").uppercase().take(length)

    private fun ed25519Spki(raw: ByteArray): ByteArray {
        val prefix = byteArrayOf(
            0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
            0x03, 0x21, 0x00
        )
        return prefix + raw
    }
}
