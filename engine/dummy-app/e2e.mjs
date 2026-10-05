import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { chromium } from "playwright";

const baseUrl = process.env.DUMMY_URL;
const apiUrl = "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client";

if (!baseUrl) throw new Error("DUMMY_URL is required");

function makeSignedGrant(privateKey, publicKeyDer) {
  const grant = {
    version: 1,
    license_id: "00000000-0000-0000-0000-000000000001",
    product_code: "RUPKAS",
    installation_id: "00000000-0000-0000-0000-000000000002",
    status: "ACTIVE",
    customer_name: "RizogKey Dummy Certification",
    duration_code: "1M",
    device_limit: 1,
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    offline_until: new Date(Date.now() + 30 * 86400000).toISOString(),
    last_validated_at: new Date().toISOString(),
  };

  const signature = sign(null, Buffer.from(JSON.stringify(grant)), privateKey);
  const der = publicKeyDer.export({ format: "der", type: "spki" });
  const raw = der.subarray(der.length - 32);

  return {
    grant,
    signature: signature.toString("base64"),
    signing: {
      algorithm: "Ed25519",
      key_version: 1,
      public_key: raw.toString("base64"),
    },
  };
}

const health = await fetch(apiUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "health" }),
});
assert.equal(health.ok, true, "rizogkey-client health endpoint must return 2xx");
const healthPayload = await health.json();
assert.equal(healthPayload?.data?.ok, true, "health.ok must be true");
assert.equal(healthPayload?.data?.signing_ready, true, "server signing must be ready");
console.log("PASS backend health/signing");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const signed = makeSignedGrant(privateKey, publicKey);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 609, height: 1437 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
let invalidSignatureSeen = false;

await page.route(apiUrl, async (route) => {
  const body = JSON.parse(route.request().postData() || "{}");

  if (body.action === "activate" || body.action === "revalidate") {
    if (body.activation_code === "BAD") {
      invalidSignatureSeen = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            license_grant: signed.grant,
            signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
            signing: signed.signing,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: signed }),
    });
    return;
  }

  await route.continue();
});

await page.goto(baseUrl, { waitUntil: "networkidle" });

assert.equal(await page.locator("#topTitle").innerText(), "Aktivasi Perangkat •");
assert.equal(await page.locator(".brand-name").innerText(), "KASIR TOKO MUSIK");
assert.equal(await page.locator(".page-title").innerText(), "Aktivasi Perangkat");
assert.equal(await page.locator(".activation-grid").count(), 1);
assert.equal(await page.locator("text=arrow_back").count(), 0);
assert.equal(await page.locator("text=check_circle").count(), 0);

const initialInstallationCode = await page.locator("#installationCode").inputValue();
assert.match(initialInstallationCode, /^RPK-INST-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
assert.ok((await page.locator("#publicKey").inputValue()).length > 20);
console.log("PASS input UI");

await page.locator("#activationCodeUi").fill("RPK-ACT-DUMMY-0001");
await page.locator("#verifyBtn").click();
await page.waitForTimeout(300);

assert.equal(await page.locator("#statusBadge").textContent(), "ACTIVE");
assert.equal(await page.locator(".success-title").innerText(), "Aktivasi Berhasil!");
assert.equal(await page.locator(".active-chip").innerText(), "Aktif");
assert.equal(await page.locator("text=arrow_back").count(), 0);
console.log("PASS visible activation + success UI");

await page.reload({ waitUntil: "networkidle" });
assert.equal(await page.locator("#statusBadge").textContent(), "ACTIVE");
assert.equal(await page.locator(".success-title").innerText(), "Aktivasi Berhasil!");
assert.equal(await page.locator("#installationCode").inputValue(), initialInstallationCode);
console.log("PASS persistence");

await page.evaluate(() => document.getElementById("revalidateBtn").click());
await page.waitForTimeout(300);
assert.equal(await page.locator("#statusBadge").textContent(), "ACTIVE");
console.log("PASS revalidation");

await page.evaluate(() => document.getElementById("clearBtn").click());
await page.waitForTimeout(300);
const newInstallationCode = await page.locator("#installationCode").inputValue();
assert.notEqual(newInstallationCode, initialInstallationCode);
assert.equal(await page.locator("#statusBadge").textContent(), "UNACTIVATED");
assert.equal(await page.locator(".page-title").innerText(), "Aktivasi Perangkat");
console.log("PASS clear state");

await page.locator("#activationCodeUi").fill("BAD");
await page.locator("#verifyBtn").click();
await page.waitForTimeout(300);

assert.equal(invalidSignatureSeen, true);
assert.equal(await page.locator("#statusBadge").textContent(), "UNACTIVATED");
assert.equal(await page.locator(".page-title").innerText(), "Aktivasi Gagal");
assert.match(await page.locator(".error-code").innerText(), /ERR_GRANT_SIG|ERR_AUTH_404/);
console.log("PASS invalid signature + failure UI");

await browser.close();
console.log("RizogKey Dummy App browser certification passed.");
