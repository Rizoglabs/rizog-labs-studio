const DEFAULT_TIMEOUT_MS = 15000;

function toBase64(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function installationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let value = "";
  for (const byte of bytes) value += alphabet[byte % alphabet.length];
  return `RPK-INST-${value.slice(0,5)}-${value.slice(5)}`;
}
function isoNow() { return new Date().toISOString(); }
function past(value) { return Boolean(value && Date.now() >= Date.parse(value)); }

function openDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function dbGet(dbName, key) {
  const db = await openDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readonly");
    const req = tx.objectStore("state").get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
async function dbPut(dbName, key, value) {
  const db = await openDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(value, key);
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => reject(tx.error);
  });
}
async function dbDelete(dbName, key) {
  const db = await openDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export class RizogKeyClient {
  constructor(config) {
    if (!config?.productCode) throw new Error("RK_PRODUCT_REQUIRED");
    if (!config?.apiUrl) throw new Error("RK_API_URL_REQUIRED");
    if (!config?.trustedSigningKeys) throw new Error("RK_TRUSTED_SIGNING_KEYS_REQUIRED");

    this.productCode = String(config.productCode).trim().toUpperCase();
    this.apiUrl = String(config.apiUrl).trim();
    this.platform = String(config.platform || "web").trim().toLowerCase();
    this.clientVersion = String(config.clientVersion || "1.0.0").trim();
    this.trustedSigningKeys = config.trustedSigningKeys;
    this.timeoutMs = Number(config.timeoutMs || DEFAULT_TIMEOUT_MS);
    this.dbName = config.storageNamespace || `rizogkey:${this.productCode}`;
    this.identity = null;
    this.state = null;
  }

  async initialize() {
    if (!globalThis.crypto?.subtle) throw new Error("RK_WEB_CRYPTO_UNAVAILABLE");

    this.identity = await dbGet(this.dbName, "identity");
    this.state = await dbGet(this.dbName, "license");

    if (!this.identity) {
      const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
      const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
      this.identity = {
        keyPair,
        installationCode: installationCode(),
        publicKey: toBase64(publicKey),
        createdAt: isoNow(),
      };
      await dbPut(this.dbName, "identity", this.identity);
    }

    return this;
  }

  getInstallationCode() {
    if (!this.identity) throw new Error("RK_NOT_INITIALIZED");
    return this.identity.installationCode;
  }

  getStatus() {
    const grant = this.state?.grant;
    if (!grant) return "UNACTIVATED";
    if (grant.product_code !== this.productCode) return "PRODUCT_MISMATCH";
    if (grant.status !== "ACTIVE") return grant.status || "UNKNOWN";
    if (grant.expires_at && past(grant.expires_at)) return "EXPIRED";
    if (grant.offline_until && past(grant.offline_until)) return "REVALIDATION_REQUIRED";
    return "ACTIVE";
  }

  isActive() { return this.getStatus() === "ACTIVE"; }
  isExpired() { return this.getStatus() === "EXPIRED"; }
  getLicense() { return this.state?.grant || null; }

  async _request(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      let payload = {};
      try { payload = await response.json(); } catch {}
      if (!response.ok) throw new Error(payload?.error || "RK_SERVER_ERROR");
      return payload?.data;
    } catch (error) {
      if (error?.name === "AbortError" || error instanceof TypeError) throw new Error("RK_NETWORK_UNAVAILABLE");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async _accept(data) {
    const grant = data?.license_grant;
    const signature = data?.signature;
    const keyVersion = Number(data?.signing?.key_version || 0);
    const publicKey = String(data?.signing?.public_key || "");

    if (!grant || !signature || !keyVersion || !publicKey) throw new Error("RK_SIGNED_GRANT_REQUIRED");
    if (grant.product_code !== this.productCode) throw new Error("RK_PRODUCT_MISMATCH");

    const trusted = this.trustedSigningKeys[keyVersion];
    if (!trusted || trusted !== publicKey) throw new Error("RK_SIGNING_KEY_UNTRUSTED");

    const signingKey = await crypto.subtle.importKey("raw", fromBase64(publicKey), { name: "Ed25519" }, false, ["verify"]);
    const valid = await crypto.subtle.verify(
      { name: "Ed25519" },
      signingKey,
      fromBase64(signature),
      new TextEncoder().encode(JSON.stringify(grant)),
    );
    if (!valid) throw new Error("RK_GRANT_INVALID");

    this.state = {
      grant,
      signature,
      signingPublicKey: publicKey,
      signingKeyVersion: keyVersion,
      updatedAt: isoNow(),
    };
    await dbPut(this.dbName, "license", this.state);
  }

  async activate(activationCode) {
    if (!this.identity) throw new Error("RK_NOT_INITIALIZED");
    const data = await this._request({
      action: "activate",
      product_code: this.productCode,
      installation_code: this.getInstallationCode(),
      activation_code: String(activationCode || "").trim().toUpperCase(),
      platform: this.platform,
      public_key: this.identity.publicKey,
      client_version: this.clientVersion,
    });
    await this._accept(data);
    return this.getLicense();
  }

  async revalidate() {
    const grant = this.getLicense();
    if (!grant) throw new Error("RK_ACTIVATION_REQUIRED");
    const data = await this._request({
      action: "revalidate",
      product_code: this.productCode,
      license_id: grant.license_id,
      installation_id: grant.installation_id,
      public_key: this.identity?.publicKey || null,
      client_version: this.clientVersion,
    });
    await this._accept(data);
    return this.getLicense();
  }

  async clearLocalState() {
    await dbDelete(this.dbName, "license");
    await dbDelete(this.dbName, "identity");
    this.identity = null;
    this.state = null;
  }
}
