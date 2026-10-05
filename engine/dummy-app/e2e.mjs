import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { chromium } from "playwright";

const baseUrl = process.env.DUMMY_URL;
const apiUrl = "https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client";

if (!baseUrl) throw new Error("DUMMY_URL is required");

function base64(value) {
  return Buffer.from(value).toString("base64");
}

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

  const payload = Buffer.from(JSON.stringify(grant));
  const signature = sign(null, payload, privateKey);
  const publicDer = publicKeyDer.export({ format: "der", type: "spki" });
  const publicRaw = publicDer.subarray(publicDer.length - 32);

  return {
    grant,
    signature: signature.toString("base64"),
    signing: {
      algorithm: "Ed25519",
      key_version: 1,
      public_key: publicRaw.toString("base64"),
    },
  };
}

async function assertBackendHealth() {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "health" }),
  });

  assert.equal(response.ok, true, "rizogkey-client health endpoint must return 2xx");

  const payload = await response.json();
  assert.equal(payload?.data?.ok, true, "health.ok must be true");
  assert.equal(payload?.data?.signing_ready, true, "server signing must be ready");
  console.log("PASS backend health/signing");
}

await assertBackendHealth();

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const signed = makeSignedGrant(privateKey, publicKey);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

let badSignature = false;

await page.route(apiUrl, async (route) => {
  const request = route.request();
  const body = JSON.parse(request.postData() || "{}");

  if (body.action === "activate" || body.action === "revalidate") {
    if (body.activation_code === "BAD") {
      badSignature = true;
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

const initialInstallationCode = await page.locator("#installationCode").inputValue();
assert.match(initialInstallationCode, /^RPK-INST-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
assert.ok((await page.locator("#publicKey").inputValue()).length > 20);
assert.equal(await page.locator("#statusBadge").textContent(), "UNACTIVATED");
console.log("PASS fresh installation state");

await page.locator("#activationCode").fill("RPK-ACT-DUMMY-0001");
await page.locator("#activateBtn").click();
await page.waitForTimeout(300);

assert.equal(await page.locator("#statusBadge").textContent(), "ACTIVE");
assert.match(await page.locator("#licenseState").textContent(), /RizogKey Dummy Certification/);
console.log("PASS signed grant activation + verification");

await page.reload({ waitUntil: "networkidle" });
assert.equal(await page.locator("#statusBadge").textContent(), "ACTIVE");
assert.equal(await page.locator("#installationCode").inputValue(), initialInstallationCode);
console.log("PASS persisted identity + license state");

await page.locator("#revalidateBtn").click();
await page.waitForTimeout(300);
assert.equal(await page.locator("#statusBadge").textContent(), "ACTIVE");
console.log("PASS revalidation");

await page.locator("#clearBtn").click();
await page.waitForTimeout(200);
const newInstallationCode = await page.locator("#installationCode").inputValue();
assert.notEqual(newInstallationCode, initialInstallationCode);
assert.equal(await page.locator("#statusBadge").textContent(), "UNACTIVATED");
console.log("PASS clear state + new installation identity");

await page.locator("#activationCode").fill("BAD");
await page.locator("#activateBtn").click();
await page.waitForTimeout(300);
const log = await page.locator("#log").textContent();
assert.match(log || "", /RK_GRANT_INVALID/);
assert.equal(badSignature, true);
console.log("PASS invalid signed grant rejection");

await browser.close();
console.log("RizogKey Dummy App E2E certification passed.");
