import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { chromium } from "playwright";

const baseUrl = process.env.DUMMY_URL;
const apiUrl = "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client";
if (!baseUrl) throw new Error("DUMMY_URL is required");

function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(item => canonicalJson(item)).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
  return JSON.stringify(value);
}

function b64(buffer) { return Buffer.from(buffer).toString("base64"); }

function grantPayload(installationId, overrides = {}) {
  return {
    version: 1,
    license_id: "00000000-0000-0000-0000-000000000001",
    product_code: "RUPKAS",
    installation_id: installationId,
    status: "ACTIVE",
    customer_name: "RizogKey Dummy Certification",
    duration_code: "1M",
    device_limit: 1,
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    offline_until: new Date(Date.now() + 30 * 86400000).toISOString(),
    last_validated_at: new Date().toISOString(),
    ...overrides,
  };
}

function signGrant(privateKey, publicKey, grant) {
  const signature = sign(null, Buffer.from(canonicalJson(grant)), privateKey);
  const der = publicKey.export({ format: "der", type: "spki" });
  const raw = der.subarray(der.length - 32);
  return {
    license_grant: grant,
    signature: signature.toString("base64"),
    signing: {
      algorithm: "Ed25519",
      key_version: 7,
      public_key: b64(raw),
    },
  };
}

const health = await fetch(apiUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "health" }),
});
assert.equal(health.ok, true);
const hp = await health.json();
assert.equal(hp.data.ok, true);
assert.equal(hp.data.signing_ready, true);
assert.equal(hp.data.protocol_version, 1);
console.log("PASS backend health/signing");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicDer = publicKey.export({ format: "der", type: "spki" });
const testPublicKey = b64(publicDer.subarray(publicDer.length - 32));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 609, height: 1437 } });
await context.addInitScript(({ trustedKey }) => {
  window.__RIZOGKEY_TEST_CONFIG__ = { trustedSigningKeys: { 7: trustedKey } };
}, { trustedKey: testPublicKey });

const page = await context.newPage();
const currentInstallationId = "00000000-0000-0000-0000-000000000002";
let responseMode = "valid";

await page.route(apiUrl, async (route) => {
  const body = JSON.parse(route.request().postData() || "{}");
  if (body.action !== "activate" && body.action !== "revalidate") {
    await route.continue();
    return;
  }

  if (responseMode === "network") {
    await route.abort("failed");
    return;
  }

  if (responseMode === "bad_signature") {
    const signed = signGrant(privateKey, publicKey, grantPayload(currentInstallationId));
    signed.signature = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: signed }),
    });
    return;
  }

  if (responseMode === "untrusted_key") {
    const other = generateKeyPairSync("ed25519");
    const signed = signGrant(other.privateKey, other.publicKey, grantPayload(currentInstallationId));
    signed.signing.key_version = 8;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: signed }),
    });
    return;
  }

  if (responseMode === "wrong_product") {
    const signed = signGrant(privateKey, publicKey, grantPayload(currentInstallationId, { product_code: "OTHER" }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: signed }),
    });
    return;
  }

  if (responseMode === "expired") {
    const signed = signGrant(privateKey, publicKey, grantPayload(currentInstallationId, {
      expires_at: new Date(Date.now() - 1000).toISOString(),
      offline_until: new Date(Date.now() - 1000).toISOString(),
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: signed }),
    });
    return;
  }

  const signed = signGrant(privateKey, publicKey, grantPayload(currentInstallationId));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: signed }),
  });
});

await page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(await page.locator("#btn-activate").count(), 1);
assert.equal(await page.locator("text=arrow_back").count(), 0);
assert.equal(await page.locator("text=check_circle").count(), 0);

const installationCode = await page.locator("#install-code-text").innerText();
assert.match(installationCode, /^RPK-INST-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
console.log("PASS first launch + Installation Code");

for (const [id, value] of [["#part-1", "RPK"], ["#part-2", "ACT"], ["#part-3", "DUMY"], ["#part-4", "0000"], ["#part-5", "0001"]]) {
  await page.locator(id).fill(value);
}
await page.locator("#btn-activate").click();
await page.waitForTimeout(250);
assert.equal(await page.locator("h1").filter({ hasText: "Aktivasi Berhasil!" }).count(), 1);
assert.equal(await page.locator("#btn-open-store").count(), 1);
console.log("PASS activation + signed grant");

await page.reload({ waitUntil: "networkidle" });
assert.equal(await page.locator("h1").filter({ hasText: "Aktivasi Berhasil!" }).count(), 1);
console.log("PASS persistence across reload");

const networkError = await page.evaluate(async () => {
  try {
    window.__RIZOGKEY_TEST__.client().request = async () => { throw new Error("RK_NETWORK_UNAVAILABLE"); };
    await window.__RIZOGKEY_TEST__.client().revalidate();
    return "NO_ERROR";
  } catch (e) {
    return e.message;
  }
});
assert.equal(networkError, "RK_NETWORK_UNAVAILABLE");
console.log("PASS network-loss path");

responseMode = "expired";
const expiredError = await page.evaluate(() => window.__RIZOGKEY_TEST__.client().revalidate().then(() => "NO_ERROR").catch(e => e.message));
assert.equal(expiredError, "NO_ERROR");
assert.equal(await page.evaluate(() => window.__RIZOGKEY_TEST__.client().status()), "EXPIRED");
console.log("PASS expiration state");

responseMode = "bad_signature";
const badSig = await page.evaluate(() => window.__RIZOGKEY_TEST__.client().revalidate().then(() => "NO_ERROR").catch(e => e.message));
assert.equal(badSig, "RK_GRANT_INVALID");
assert.equal(await page.evaluate(() => window.__RIZOGKEY_TEST__.client().status()), "EXPIRED");
console.log("PASS invalid signature rejection");

responseMode = "untrusted_key";
const untrusted = await page.evaluate(() => window.__RIZOGKEY_TEST__.client().revalidate().then(() => "NO_ERROR").catch(e => e.message));
assert.equal(untrusted, "RK_SIGNING_KEY_UNTRUSTED");
console.log("PASS trusted signing-key pinning");

responseMode = "wrong_product";
const productMismatch = await page.evaluate(() => window.__RIZOGKEY_TEST__.client().revalidate().then(() => "NO_ERROR").catch(e => e.message));
assert.equal(productMismatch, "RK_PRODUCT_MISMATCH");
console.log("PASS product binding");

await page.evaluate(() => window.__RIZOGKEY_TEST__.renderInput());
await page.waitForTimeout(200);
assert.equal(await page.locator("#part-5").count(), 1);
console.log("PASS return to activation UI");

await browser.close();
console.log("RizogKey Engine browser certification passed.");
