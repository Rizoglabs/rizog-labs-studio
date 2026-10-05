import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { chromium } from "playwright";
const baseUrl=process.env.DUMMY_URL;
const apiUrl="https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client";
if(!baseUrl) throw new Error("DUMMY_URL is required");
function signed(privateKey,publicKey){
 const grant={version:1,license_id:"00000000-0000-0000-0000-000000000001",product_code:"RUPKAS",installation_id:"00000000-0000-0000-0000-000000000002",status:"ACTIVE",customer_name:"RizogKey Dummy Certification",duration_code:"1M",device_limit:1,activated_at:new Date().toISOString(),expires_at:new Date(Date.now()+30*86400000).toISOString(),offline_until:new Date(Date.now()+30*86400000).toISOString(),last_validated_at:new Date().toISOString()};
 const sig=sign(null,Buffer.from(JSON.stringify(grant)),privateKey); const der=publicKey.export({format:"der",type:"spki"}); const raw=der.subarray(der.length-32);
 return {license_grant:grant,signature:sig.toString("base64"),signing:{algorithm:"Ed25519",key_version:1,public_key:raw.toString("base64")}};
}
const health=await fetch(apiUrl,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"health"})}); assert.equal(health.ok,true); const hp=await health.json(); assert.equal(hp.data.ok,true); assert.equal(hp.data.signing_ready,true);
const {privateKey,publicKey}=generateKeyPairSync("ed25519"); const payload=signed(privateKey,publicKey);
const browser=await chromium.launch({headless:true}); const context=await browser.newContext({viewport:{width:609,height:1437}}); const page=await context.newPage();
await page.route(apiUrl,async route=>{const body=JSON.parse(route.request().postData()||"{}"); if(body.action==="activate"||body.action==="revalidate"){await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:payload})});return;} await route.continue();});
await page.goto(baseUrl,{waitUntil:"networkidle"});
assert.equal(await page.locator("#btn-activate").count(),1); assert.equal(await page.locator("text=arrow_back").count(),0);
const inst=await page.locator("#install-code-text").innerText(); assert.match(inst,/^RPK-INST-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
for(const [id,val] of [["#part-1","RPK"],["#part-2","ACT"],["#part-3","DUMY"],["#part-4","0000"],["#part-5","0001"]]) await page.locator(id).fill(val);
await page.locator("#btn-activate").click(); await page.waitForTimeout(500);
assert.equal(await page.locator("h1").filter({hasText:"Aktivasi Berhasil!"}).count(),1); assert.equal(await page.locator("#btn-open-store").count(),1);
await page.reload({waitUntil:"networkidle"}); assert.equal(await page.locator("h1").filter({hasText:"Aktivasi Berhasil!"}).count(),1);
await page.evaluate(()=>window.__RIZOGKEY_TEST__.renderInput()); await page.waitForTimeout(200); assert.equal(await page.locator("#part-5").count(),1);
await browser.close(); console.log("Dummy App supplied-code UI certification passed.");
