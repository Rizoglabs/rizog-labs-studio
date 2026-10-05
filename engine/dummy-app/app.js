import { RizogKeyDummyClient } from "./rizogkey-client.js";

const $=(id)=>document.getElementById(id);
const log=(msg)=>{
  const line=new Date().toLocaleTimeString()+"  "+msg;
  $("log").textContent=line+"\n"+$("log").textContent;
};
const badge=(status)=>{
  const b=$("statusBadge");b.textContent=status.replaceAll("_"," ");
  b.className="badge "+(status==="ACTIVE"?"badge-active":status==="UNACTIVATED"?"badge-muted":"badge-error");
};

let client=new RizogKeyDummyClient($("productCode").value.trim().toUpperCase());

async function render(){
  $("installationCode").value=client.installationCode?.()||"";
  $("publicKey").value=client.publicKey?.()||"";
  $("licenseState").textContent=client.license()?JSON.stringify(client.license(),null,2):"Belum ada license grant.";
  badge(client.status());
}

$("initBtn").onclick=async()=>{
  try{
    client=new RizogKeyDummyClient($("productCode").value.trim().toUpperCase()||"RUPKAS");
    await client.initialize();
    await render();
    log("Engine initialized.");
    log("Installation Code: "+client.installationCode());
  }catch(e){log("INIT ERROR: "+e.message);badge("ERROR")}
};

$("activateBtn").onclick=async()=>{
  try{
    if(!client.identity)await client.initialize();
    const code=$("activationCode").value.trim();
    if(!code)throw new Error("Activation Code belum diisi.");
    await client.activate(code);
    await render();
    log("Activation berhasil. License Grant signature verified.");
  }catch(e){log("ACTIVATE ERROR: "+e.message);badge("ERROR")}
};

$("revalidateBtn").onclick=async()=>{
  try{
    await client.revalidate();
    await render();
    log("Revalidation berhasil.");
  }catch(e){log("REVALIDATE ERROR: "+e.message);badge("ERROR")}
};

$("clearBtn").onclick=async()=>{
  await client.clear();
  await client.initialize();
  await render();
  log("Local engine state cleared. New installation identity created.");
};

$("productCode").onchange=async()=>{
  client=new RizogKeyDummyClient($("productCode").value.trim().toUpperCase()||"RUPKAS");
  await client.initialize();await render();
};

await client.initialize();
await render();
log("Dummy App ready. This app is for RizogKey Engine certification only.");