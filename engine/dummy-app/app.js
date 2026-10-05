import { RizogKeyDummyClient } from "./rizogkey-client.js";
const PRODUCT="RUPKAS";
const root=document.getElementById("dummy-app-root");
let client=new RizogKeyDummyClient(PRODUCT,{trustedSigningKeys:globalThis.__RIZOGKEY_TEST_CONFIG__?.trustedSigningKeys});
let currentView="input";
const templates=new Map();

async function getTemplate(name){
  if(templates.has(name)) return templates.get(name);
  const r=await fetch(`./templates/${name}.html?rev=20261005-6`,{cache:"no-store"});
  if(!r.ok) throw new Error("RK_TEMPLATE_"+name.toUpperCase());
  const html=await r.text(); templates.set(name,html); return html;
}
function replaceTokens(html,map){for(const [k,v] of Object.entries(map)) html=html.split(k).join(v??""); return html;}

const ICONS={
  arrow_back:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  help_outline:'<circle cx="12" cy="12" r="9"/><path d="M9.75 9a2.35 2.35 0 1 1 4.1 1.58c-.95.99-1.85 1.25-1.85 2.67"/><path d="M12 17h.01"/>',
  check:'<path d="m6 12 4 4 8-8"/>',
  check_circle:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  verified:'<path d="m12 3 2 1.2 2.3-.1.9-2.1 1.9 1.2.5 2.2-.5 2.2-1.9 1.2-.9 2.1-2.3-.1-2 1.2-2.3-.1-.9-2.1-1.9-1.2-.5-2.2.5-2.2 1.9-1.2.9-2.1 2.3.1z"/><path d="m9 12 2 2 4-4"/>',
  verified_user:'<path d="M12 3 20 6v5c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6z"/><path d="m8.7 12 2.1 2.1 4.5-4.5"/>',
  fingerprint:'<path d="M6.5 10.5A5.5 5.5 0 0 1 17.5 11"/><path d="M7.5 14.5c.4-2.8.6-4.8 3.5-5.6 2.7-.8 5.1 1.2 5.5 4"/><path d="M8.5 18.5c1-1.8 1-4.7 1.5-6.5.5-1.6 1.6-2.5 3.1-2.5 2 0 3.3 1.6 3.4 3.6"/><path d="M12 13c.6 0 .9.4.8 1.1-.2 1.4-.5 2.6-1.1 3.9"/>',
  key:'<circle cx="8.2" cy="15.8" r="3.8"/><path d="m11.2 12.8 8.3-8.3 2 2 1.5 1.5-1.9 1.9-1.5-1.5-2.2 2.2"/>',
  content_copy:'<rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  content_paste:'<path d="M9 5h6"/><path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Z"/><rect x="6" y="5" width="12" height="16" rx="2"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  qr_code_scanner:'<path d="M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4z"/><path d="M15 15h2M19 15h1v2M15 19h4v1M19 18h1"/>',
  support_agent:'<path d="M5 13a7 7 0 0 1 14 0"/><path d="M5 13v4a2 2 0 0 0 2 2h2M19 13v4a2 2 0 0 1-2 2h-2"/><path d="M9 19h6"/>',
  play_circle:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  error_outline:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  warning:'<path d="M12 4 21 19H3z"/><path d="M12 9v4M12 16h.01"/>',
  refresh:'<path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 5v6h-6"/>',
  print:'<path d="M7 8V4h10v4"/><rect x="5" y="8" width="14" height="8" rx="2"/><path d="M8 16h8v4H8z"/><path d="M16 11h.01"/>',
  storefront:'<path d="M4 10v9h16v-9"/><path d="M3 10h18l-2-5H5z"/><path d="M8 19v-5h8v5"/>',
  arrow_forward:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  point_of_sale:'<path d="M5 7h14v10H5z"/><path d="M8 4h8v3H8z"/><path d="M8 11h8M8 14h3"/>'
};
function hardenIcons(){
  document.querySelectorAll(".material-symbols-outlined").forEach((el)=>{
    const name=(el.textContent||"").trim();
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 24 24"); svg.setAttribute("fill","none"); svg.setAttribute("stroke","currentColor"); svg.setAttribute("stroke-width","1.8"); svg.setAttribute("stroke-linecap","round"); svg.setAttribute("stroke-linejoin","round"); svg.setAttribute("aria-hidden","true");
    svg.setAttribute("class",(el.getAttribute("class")||"")+" inline-icon");
    svg.innerHTML=ICONS[name]||'<circle cx="12" cy="12" r="9"/>';
    el.replaceWith(svg);
  });
}
function setHeaderActions(){
  document.getElementById("backBtn")?.addEventListener("click",()=>currentView==="input"?history.back():renderInput());
  document.getElementById("helpBtn")?.addEventListener("click",()=>alert("Gunakan Kode Instalasi untuk mendapatkan Kode Aktivasi resmi."));
}
function splitCode(code){
  const raw=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,""), lens=[3,3,4,4,4]; let i=0;
  return lens.map(n=>{const p=raw.slice(i,i+n);i+=n;return p;});
}
function assembleCode(){return ["part-1","part-2","part-3","part-4","part-5"].map(id=>document.getElementById(id)?.value.trim().toUpperCase()||"").join("-");}
function wireInput(){
  setHeaderActions();
  const fields=["part-1","part-2","part-3","part-4","part-5"], lens=[3,3,4,4,4];
  fields.forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.value="";
    el.addEventListener("input",()=>{el.value=el.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,lens[i]); if(el.value.length===lens[i]&&i<fields.length-1) document.getElementById(fields[i+1])?.focus();});
    el.addEventListener("keydown",(e)=>{if(e.key==="Backspace"&&!el.value&&i>0) document.getElementById(fields[i-1])?.focus();});
  });
  document.getElementById("install-code-text").textContent=client.installationCode();
  document.getElementById("btn-copy-install")?.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(client.installationCode())}catch{}});
  document.getElementById("sendDeveloperLink")?.addEventListener("click",(e)=>{e.preventDefault();window.open("https://wa.me/?text="+encodeURIComponent("Halo Tim Pengembang, ini Kode Instalasi Kasir Toko Musik saya: "+client.installationCode()),"_blank","noopener");});
  document.getElementById("btn-paste")?.addEventListener("click",async()=>{try{const p=splitCode(await navigator.clipboard.readText());fields.forEach((id,i)=>document.getElementById(id).value=p[i]||"");document.getElementById("part-5")?.focus();}catch{}});
  document.getElementById("btn-scan")?.addEventListener("click",()=>alert("Pemindaian QR akan tersedia pada adapter produksi."));
  document.getElementById("btn-activate")?.addEventListener("click",activate);
  document.getElementById("btn-support")?.addEventListener("click",()=>alert("Hubungi pengembang atau pemilik toko untuk mendapatkan Kode Aktivasi resmi."));
  document.getElementById("btn-demo")?.addEventListener("click",()=>alert("Mode Demo tidak mengubah status lisensi."));
}
async function activate(){
  const code=assembleCode();
  if(code.replace(/-/g,"").length!==18){alert("Masukkan Kode Aktivasi lengkap.");return;}
  try{await client.activate(code);await renderSuccess();}catch(e){await renderFailure(e);}
}
async function renderInput(){
  currentView="input";
  root.innerHTML=replaceTokens(await getTemplate("input"),{
    "__INSTALLATION_CODE__":client.installationCode(),
    "__TERMINAL_ID__":client.installationCode().replace(/^RPK-INST-/,"STODIO-POS-"),
    "__LOCAL_STATUS__":client.status()==="ACTIVE"?"TERVERIFIKASI":"TERKONEKSI"
  });
  hardenIcons(); wireInput();
}
async function renderSuccess(){
  currentView="success";
  const g=client.license()||{};
  root.innerHTML=replaceTokens(await getTemplate("success"),{"__LICENSE_ID__":(g.license_id||"RZGL-8824-MUSK-2025").slice(0,19).toUpperCase(),"__TERMINAL_ID__":client.installationCode()});
  const t=document.getElementById("licenseTypeDisplay");
  if(t)t.innerHTML=`Lisensi Toko Musik v1.0 <span class="text-outline text-body-sm font-normal">(${g.duration_code==="LIFETIME"?"Permanen":g.duration_code||"Aktif"})</span>`;
  hardenIcons(); setHeaderActions();
  document.getElementById("btn-print")?.addEventListener("click",()=>window.print());
  document.getElementById("btn-open-store")?.addEventListener("click",()=>alert("Profil toko akan tersedia pada aplikasi kasir produksi."));
}
async function renderFailure(err){
  currentView="failure";
  const errorCode=err?.message==="RK_GRANT_INVALID"?"ERR_GRANT_SIG":err?.message==="LICENSE_REVOKED"?"ERR_LICENSE":"ERR_AUTH_404";
  root.innerHTML=replaceTokens(await getTemplate("failure"),{"__ERROR_CODE__":errorCode,"__ACTIVATION_CODE__":assembleCode()||"RZGL-8824-XXXX-XXXX"});
  hardenIcons(); setHeaderActions();
  document.getElementById("btn-retry")?.addEventListener("click",renderInput);
  document.getElementById("btn-scan-failure")?.addEventListener("click",()=>alert("Pemindaian QR akan tersedia pada adapter produksi."));
  document.getElementById("btn-support")?.addEventListener("click",()=>alert("Hubungi dukungan pemilik toko."));
}
window.__RIZOGKEY_TEST__={renderInput,renderSuccess,renderFailure,assembleCode,client:()=>client};
await client.initialize();
if(client.status()==="ACTIVE") await renderSuccess(); else await renderInput();
