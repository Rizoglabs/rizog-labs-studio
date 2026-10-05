const API="https://nddipymcyeargsdbulyo.supabase.co/functions/v1/rizogkey-client";
const DB="rizogkey-dummy", STORE="state";

function b64(buf){let s="";const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode(...a.slice(i,i+0x8000));return btoa(s)}
function u8(s){const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0))}
function open(){return new Promise((ok,ko)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function get(k){const d=await open();return new Promise((ok,ko)=>{const t=d.transaction(STORE,"readonly"),r=t.objectStore(STORE).get(k);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>ko(r.error);t.oncomplete=()=>d.close()})}
async function put(k,v){const d=await open();return new Promise((ok,ko)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(v,k);t.oncomplete=()=>{d.close();ok(v)};t.onerror=()=>ko(t.error)})}
async function del(k){const d=await open();return new Promise((ok,ko)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(k);t.oncomplete=()=>{d.close();ok()};t.onerror=()=>ko(t.error)})}
function code(){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",b=crypto.getRandomValues(new Uint8Array(10));let s="";for(const x of b)s+=a[x%a.length];return "RPK-INST-"+s.slice(0,5)+"-"+s.slice(5)}
async function verify(signature,grant,publicKey){const key=await crypto.subtle.importKey("raw",u8(publicKey),{name:"Ed25519"},false,["verify"]);return crypto.subtle.verify({name:"Ed25519"},key,u8(signature),new TextEncoder().encode(JSON.stringify(grant)))}

export class RizogKeyDummyClient{
  constructor(product="RUPKAS"){this.product=product;this.state=null}
  async initialize(){
    this.state=await get("state")||{};
    let identity=await get("identity");
    if(!identity){
      const kp=await crypto.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);
      const pub=await crypto.subtle.exportKey("raw",kp.publicKey),priv=await crypto.subtle.exportKey("pkcs8",kp.privateKey);
      identity={installationCode:code(),publicKey:b64(pub),privateKey:b64(priv)};
      await put("identity",identity);
    }
    this.identity=identity;return this;
  }
  installationCode(){return this.identity.installationCode}
  publicKey(){return this.identity.publicKey}
  status(){
    const g=this.state?.grant;if(!g)return "UNACTIVATED";
    if(g.status!=="ACTIVE")return g.status||"UNKNOWN";
    if(g.expires_at&&Date.now()>=Date.parse(g.expires_at))return "EXPIRED";
    if(g.offline_until&&Date.now()>=Date.parse(g.offline_until))return "REVALIDATION_REQUIRED";
    return "ACTIVE";
  }
  license(){return this.state?.grant||null}
  async request(body){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json();if(!r.ok)throw new Error(j.error||"RK_SERVER_ERROR");return j.data;
  }
  async accept(data){
    if(!data?.license_grant||!data?.signature||!data?.signing?.public_key)throw new Error("RK_SIGNED_GRANT_REQUIRED");
    const ok=await verify(data.signature,data.license_grant,data.signing.public_key);
    if(!ok)throw new Error("RK_GRANT_INVALID");
    this.state={grant:data.license_grant,signature:data.signature,signingPublicKey:data.signing.public_key,updatedAt:new Date().toISOString()};
    await put("state",this.state);
  }
  async activate(code){
    const data=await this.request({action:"activate",product_code:this.product,installation_code:this.installationCode(),activation_code:code,platform:"web",public_key:this.publicKey(),client_version:"dummy-1.0.0"});
    await this.accept(data);return this.license();
  }
  async revalidate(){
    const g=this.license();if(!g)throw new Error("RK_ACTIVATION_REQUIRED");
    const data=await this.request({action:"revalidate",product_code:this.product,license_id:g.license_id,installation_id:g.installation_id,public_key:this.publicKey(),client_version:"dummy-1.0.0"});
    await this.accept(data);return this.license();
  }
  async clear(){await del("state");await del("identity");this.state=null;this.identity=null}
}