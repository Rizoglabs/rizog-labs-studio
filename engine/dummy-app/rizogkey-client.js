const API = "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client";
const DB = "rizogkey-dummy";
const STORE = "state";
const CLIENT_VERSION = "dummy-1.0.0";
const DEFAULT_TRUSTED_SIGNING_KEYS = {
  1: "UnS601AB8gu4rxNrwcuz+m9WIOt7+43Pa2c3uLPWD8k=",
};

function b64(buf) {
  let s = "";
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.slice(i, i + 0x8000));
  return btoa(s);
}
function u8(s) {
  const b = atob(s);
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let out = "";
  for (const x of bytes) out += alphabet[x % alphabet.length];
  return "RPK-INST-" + out.slice(0, 5) + "-" + out.slice(5);
}
function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function get(key) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, "readonly");
    const r = t.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => d.close();
  });
}
async function put(key, value) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(value, key);
    t.oncomplete = () => {
      d.close();
      resolve(value);
    };
    t.onerror = () => reject(t.error);
  });
}
async function del(key) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(key);
    t.oncomplete = () => {
      d.close();
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
}
const now = () => new Date().toISOString();
const isPast = (value) => Boolean(value && Date.now() >= Date.parse(value));

export class RizogKeyDummyClient {
  constructor(product = "RUPKAS", options = {}) {
    this.product = String(product).trim().toUpperCase();
    this.trustedSigningKeys = options.trustedSigningKeys || DEFAULT_TRUSTED_SIGNING_KEYS;
    this.state = null;
    this.identity = null;
  }

  async initialize() {
    this.state = (await get("state")) || null;
    let identity = await get("identity");

    if (!identity) {
      if (!globalThis.crypto?.subtle) throw new Error("RK_WEB_CRYPTO_UNAVAILABLE");

      const keyPair = await crypto.subtle.generateKey(
        { name: "Ed25519" },
        false,
        ["sign", "verify"],
      );
      const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);

      identity = {
        keyPair,
        installationCode: code(),
        publicKey: b64(publicKey),
        createdAt: now(),
      };
      await put("identity", identity);
    }

    this.identity = identity;
    return this;
  }

  installationCode() {
    if (!this.identity) throw new Error("RK_NOT_INITIALIZED");
    return this.identity.installationCode;
  }

  publicKey() {
    if (!this.identity) throw new Error("RK_NOT_INITIALIZED");
    return this.identity.publicKey;
  }

  status() {
    const grant = this.state?.grant;
    if (!grant) return "UNACTIVATED";
    if (grant.status !== "ACTIVE") return grant.status || "UNKNOWN";
    if (grant.product_code !== this.product) return "RK_PRODUCT_MISMATCH";
    if (grant.installation_id !== this.state?.installation_id && this.state?.installation_id) return "RK_INSTALLATION_MISMATCH";
    if (grant.expires_at && isPast(grant.expires_at)) return "EXPIRED";
    if (grant.offline_until && isPast(grant.offline_until)) return "REVALIDATION_REQUIRED";
    return "ACTIVE";
  }

  license() {
    return this.state?.grant || null;
  }

  async request(body) {
    if (!globalThis.fetch) throw new Error("RK_NETWORK_UNAVAILABLE");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload?.error || "RK_SERVER_ERROR");
      }
      return payload.data;
    } catch (error) {
      if (error?.name === "AbortError" || error instanceof TypeError) {
        throw new Error("RK_NETWORK_UNAVAILABLE");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async accept(data) {
    const grant = data?.license_grant;
    const signature = data?.signature;
    const keyVersion = Number(data?.signing?.key_version || 0);
    const publicKey = String(data?.signing?.public_key || "");

    if (!grant || !signature || !keyVersion || !publicKey) {
      throw new Error("RK_SIGNED_GRANT_REQUIRED");
    }
    if (!crypto?.subtle) throw new Error("RK_WEB_CRYPTO_UNAVAILABLE");

    const trustedPublicKey = this.trustedSigningKeys[keyVersion];
    if (!trustedPublicKey || trustedPublicKey !== publicKey) {
      throw new Error("RK_SIGNING_KEY_UNTRUSTED");
    }
    if (grant.product_code !== this.product) throw new Error("RK_PRODUCT_MISMATCH");
    if (grant.installation_id !== this.identity?.installationId && this.identity?.installationId) {
      throw new Error("RK_INSTALLATION_MISMATCH");
    }

    const signingKey = await crypto.subtle.importKey(
      "raw",
      u8(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "Ed25519" },
      signingKey,
      u8(signature),
      new TextEncoder().encode(JSON.stringify(grant)),
    );
    if (!valid) throw new Error("RK_GRANT_INVALID");

    this.state = {
      grant,
      signature,
      signingPublicKey: publicKey,
      signingKeyVersion: keyVersion,
      installation_id: grant.installation_id,
      updatedAt: now(),
    };
    await put("state", this.state);
  }

  async activate(activationCode) {
    if (!this.identity) throw new Error("RK_NOT_INITIALIZED");

    const data = await this.request({
      action: "activate",
      product_code: this.product,
      installation_code: this.installationCode(),
      activation_code: String(activationCode || "").trim().toUpperCase(),
      platform: "web",
      public_key: this.publicKey(),
      client_version: CLIENT_VERSION,
    });

    await this.accept(data);
    return this.license();
  }

  async revalidate() {
    const grant = this.license();
    if (!grant) throw new Error("RK_ACTIVATION_REQUIRED");

    const data = await this.request({
      action: "revalidate",
      product_code: this.product,
      license_id: grant.license_id,
      installation_id: grant.installation_id,
      public_key: this.publicKey(),
      client_version: CLIENT_VERSION,
    });

    await this.accept(data);
    return this.license();
  }

  async clear() {
    await del("state");
    await del("identity");
    this.state = null;
    this.identity = null;
  }

  async setTestState(grant, signature = "TEST", signingPublicKey = Object.values(this.trustedSigningKeys)[0]) {
    this.state = {
      grant,
      signature,
      signingPublicKey,
      signingKeyVersion: Number(Object.keys(this.trustedSigningKeys)[0]),
      installation_id: grant?.installation_id || null,
      updatedAt: now(),
    };
    await put("state", this.state);
  }
}
