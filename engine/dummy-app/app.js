import { RizogKeyDummyClient } from "./rizogkey-client.js";

const $ = (id) => document.getElementById(id);
const screen = $("screen");
const PRODUCT_CODE = "RUPKAS";

const MASCOT_INPUT = "https://lh3.googleusercontent.com/aida-public/AB6AXuDBNAjoe3aW6Z8u58wBBs5bV8748oozprkW_eWcEOu9zejTOoL_wE5OeAhgRocW726lFJNWkW8-O-9cpFotxzBZ2LwLn51_gaPnesc5Q9fZuiHzFoQ7zosB3JhJVoVacBEbG30DP-r8eAuKnRaigXsJw69U4K2MfWmUSvX1inaCmAOSLcu0BhKzOTFA61_sot7sOmZVxxZVkHQgL2tAod7TSahXHAYra0funuBkNESFVHL17Kneut3rzyuT-FceU7F9zw";
const MASCOT_SUCCESS = "https://lh3.googleusercontent.com/aida-public/AB6AXuDniRLdsx9TePzbe0e7nio_KNAGVFYz0a1EB4VgJAvWXkv2C-nQiv-9fOVgTOp3tQ_NLPXyn09X7WdRZHv2upLPJcokPkXvm0INXHlrKTxzXPaGE5fbQP9QktNnFA0VV0I6FjDFQYzmlJrmeKLh_Yl7Cbjiuu8-PJ-4pS4pdfS0BtfnvrVYrYHl1N_iQL4_ywceLUEpID0DcT8F8pZiGlZOqRuQ9-fHMoReUmS6zyzO-h1BgsreR3tAIUjEDFr8AhHFQw";
const MASCOT_ERROR = "https://lh3.googleusercontent.com/aida-public/AB6AXuABWOOWPsLr1_IkvFG8cyKkQKNPjM4ocyXSaWS9_x0EbuXn7Uty9_vtAhMGD5Y3Vrod2o-AriJBI79mjDbLuMuuEBrxafHzOcAxXHpm5yczPmM8SN1_YOaPTclkV_FFzEZvow4FPb9TYXYGFF_pGFXaVHNIdTKRgzd64CAtco9-Nkuy-GIhXUMb7aVKsei1gmttsBEX2jimk6M44pnlLV9blBv90DUaev9wd9JYY5AaN6q0uonWYkHH_sMEMNBIfORA";

let client = new RizogKeyDummyClient(PRODUCT_CODE);
let view = "input";

const log = (message) => {
  const line = new Date().toLocaleTimeString() + "  " + message;
  $("log").textContent = line + "\n" + ($("log").textContent || "");
};

function setHarnessState() {
  $("installationCode").value = client.installationCode?.() || "";
  $("publicKey").value = client.publicKey?.() || "";
  $("licenseState").textContent = client.license()
    ? JSON.stringify(client.license(), null, 2)
    : "Belum ada license grant.";

  const status = client.status();
  $("statusBadge").textContent = status;
  $("statusBadge").dataset.status = status;
}

function icon(name, extra = "") {
  return `<span class="material-symbols-outlined ${extra}">${name}</span>`;
}

function mascot(src, type = "check") {
  const badge = type === "check"
    ? `<div class="mascot-check">${icon("check_circle")}</div>`
    : type === "error"
      ? `<div class="mascot-error">${icon("close")}</div>`
      : "";
  return `
    <div class="mascot-wrap">
      <div class="mascot-ring"><img alt="Maskot KASIR Toko Musik" src="${src}"></div>
      ${badge}
    </div>
  `;
}

function segmentedCode(value = "") {
  const clean = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 18);
  const lengths = [3, 3, 4, 4, 4];
  const parts = [];
  let offset = 0;
  for (const len of lengths) {
    parts.push(clean.slice(offset, offset + len));
    offset += len;
  }
  return parts;
}

function renderInput() {
  view = "input";
  $("topTitle").innerHTML = 'Aktivasi Perangkat <span class="live-dot" aria-hidden="true"></span>';
  $("topSubtitle").textContent = "";
  screen.className = "screen initial";
  screen.innerHTML = `
    <section class="hero">
      ${mascot(MASCOT_INPUT, "check")}
      <div class="brand-name">KASIR TOKO MUSIK</div>
      <div class="status-pill"><span class="dot"></span>Aktivasi<br class="status-break"> Perangkat</div>
      <h1 class="page-title">Aktivasi Perangkat</h1>
      <p class="hero-copy">Salin Kode Instalasi perangkat ini dan kirimkan ke tim pengembang untuk mendapatkan Kode Aktivasi resmi kasir Anda.</p>
    </section>

    <section class="card tint">
      <div class="card-header">
        <div>
          <div class="card-title">${icon("fingerprint")} Kode Instalasi Perangkat</div>
          <div class="card-desc">Kirim kode instalasi unik ini ke pengembang atau admin untuk menerima kode aktivasi Anda.</div>
        </div>
        <span class="card-step">LANGKAH<br>1</span>
      </div>
      <div class="code-box">
        <div class="code-display muted" id="installationCodeDisplay">${client.installationCode()}</div>
        <button id="copyInstallationBtn" class="action-btn action-btn soft copy-btn" type="button">${icon("content_copy")} Salin Kode</button>
      </div>
      <button id="sendDeveloperBtn" class="link-btn" type="button">${icon("send")} Kirim ke Pengembang via WhatsApp / Email</button>
    </section>

    <section class="card tint">
      <div class="card-header">
        <div>
          <div class="card-title">${icon("key")} Kode Aktivasi</div>
          <div class="card-desc">Masukkan 18 karakter kode lisensi resmi yang Anda terima dari pengembang.</div>
        </div>
        <span class="card-step">LANGKAH<br>2</span>
      </div>

      <div class="activation-shell">
        <input id="activationCodeUi" class="activation-real" type="text" inputmode="latin" autocomplete="off" spellcheck="false" aria-label="Kode Aktivasi">
        <div id="activationGrid" class="activation-grid">
          ${segmentedCode("").map((part, i) => `<div class="activation-chip" data-index="${i}">${part || " "}</div>`).join("")}
        </div>
      </div>

      <div class="activation-actions">
        <button id="pasteBtn" class="action-btn" type="button">${icon("content_paste")} Tempel dari<br>Papan Klip</button>
        <button id="qrBtn" class="action-btn" type="button">${icon("qr_code_2")} Pindai Kode<br>QR Aktivasi</button>
      </div>
    </section>

    <div class="notice">
      ${icon("verified_user")}
      <div>Perangkat ini akan terdaftar sebagai terminal kasir resmi toko musik. Sistem berjalan 100% mandiri di memori lokal setelah aktivasi.</div>
    </div>

    <button id="verifyBtn" class="action-btn primary primary-commit" type="button">${icon("verified_user")} Verifikasi &amp; Aktifkan<br>Perangkat</button>

    <div class="divider"></div>

    <div class="support">
      <div>${icon("support_agent")} <strong>Belum punya kode aktivasi? Hubungi Pengembang / Pemilik Toko</strong></div>
      <button id="demoBtn" class="link-btn support-link" type="button">${icon("play_circle")} Coba Mode Demo</button>
    </div>

    <div class="bottom-meta">
      <span>ID TERMINAL:<br>${client.installationCode().replace("RPK-INST-", "STUDIO-POS-").replace(/-/g, "-")}</span>
      <span style="padding:0 18px">•</span>
      <span>STATUS LOKAL:<br>${client.status() === "ACTIVE" ? "TERVERIFIKASI" : "MENUNGGU"}</span>
      <span style="padding:0 18px">•</span>
      <span>VERSI<br>2.4.0</span>
    </div>
  `;

  const uiInput = $("activationCodeUi");
  const sync = () => {
    $("activationCode").value = uiInput.value.toUpperCase();
    const parts = segmentedCode(uiInput.value);
    document.querySelectorAll(".activation-chip").forEach((el, i) => {
      el.textContent = parts[i] || " ";
    });
  };
  uiInput.addEventListener("input", sync);

  $("copyInstallationBtn").onclick = async () => {
    try {
      await navigator.clipboard.writeText(client.installationCode());
      log("Installation Code disalin.");
    } catch {
      log("COPY ERROR");
    }
  };
  $("sendDeveloperBtn").onclick = () => log("Pengiriman ke pengembang dipicu dari Dummy App.");
  $("pasteBtn").onclick = async () => {
    try {
      uiInput.value = await navigator.clipboard.readText();
      sync();
      uiInput.focus();
      log("Activation Code ditempel dari clipboard.");
    } catch {
      log("CLIPBOARD_READ_BLOCKED");
    }
  };
  $("qrBtn").onclick = () => log("QR scanner placeholder — certification UI only.");
  $("verifyBtn").onclick = () => $("activateBtn").click();
  $("demoBtn").onclick = () => log("Mode demo tidak mengubah license lifecycle.");
}

function renderSuccess() {
  view = "success";
  $("topTitle").textContent = "Status Aktivasi";
  $("topSubtitle").textContent = "KASIR TOKO MUSIK";
  screen.className = "screen status-screen";
  const grant = client.license() || {};
  const expires = grant.expires_at ? new Date(grant.expires_at).toLocaleDateString("id-ID", { day:"2-digit", month:"2-digit", year:"numeric" }) : "Selamanya";
  const licenseLabel = grant.duration_code === "LIFETIME" ? "Lisensi Toko Musik v1.0" : `Lisensi Toko Musik v1.0 (${grant.duration_code || "Aktif"})`;
  screen.innerHTML = `
    <section class="hero success-hero">
      ${mascot(MASCOT_SUCCESS, "check")}
      <div class="status-pill success">${icon("verified")} Perangkat<br class="status-break"> Tervalidasi</div>
      <h1 class="success-title">Aktivasi Berhasil!</h1>
      <p class="hero-copy success-copy">Perangkat ini resmi terhubung dan terverifikasi sebagai Terminal Kasir Toko Musik. Seluruh data transaksi tersimpan aman di perangkat Anda.</p>
    </section>

    <section class="card license-card">
      <div class="card-header">
        <div class="card-title">${icon("shield")} Informasi Lisensi Perangkat</div>
        <span class="active-chip"><span class="dot"></span> Aktif</span>
      </div>

      <div class="license-grid">
        <div class="detail-row">
          <div>
            <div class="detail-label">ID Lisensi</div>
            <div class="detail-value detail-code">${grant.license_id ? grant.license_id.slice(0, 19).toUpperCase() : "RZGL-8824-MUSK-2025"}</div>
          </div>
          <div class="verification">${icon("check_circle")} Terverifikasi</div>
        </div>
        <div>
          <div class="detail-label">ID Terminal</div>
          <div class="detail-value detail-code">${client.installationCode()}</div>
        </div>
        <div>
          <div class="detail-label">Tipe Lisensi</div>
          <div class="detail-value">${licenseLabel}</div>
          <div class="detail-label" style="margin-top:2px">Berlaku sampai: ${expires}</div>
        </div>
        <div>
          <div class="detail-label">Penyimpanan</div>
          <div class="verification">${icon("check_circle")} Memori Lokal<br>Siap</div>
        </div>
      </div>
    </section>

    <section class="next-card">
      <div class="next-icon">${icon("storefront")}</div>
      <div>
        <div class="next-title">Langkah Selanjutnya</div>
        <div class="next-copy">Lengkapi profil toko musik Anda untuk mulai mencatat transaksi.</div>
      </div>
    </section>

    <div class="success-actions">
      <button id="openStoreBtn" class="action-btn primary" type="button">Lanjut ke Buka Toko Baru ${icon("arrow_forward")}</button>
      <button id="printBtn" class="action-btn receipt-btn" type="button">${icon("print")} Cetak Bukti<br>Aktivasi</button>
    </div>
  `;

  $("openStoreBtn").onclick = () => log("Dummy App: buka toko belum diimplementasikan.");
  $("printBtn").onclick = () => window.print();
}

function renderFailure(message = "Kode aktivasi tidak terdaftar atau telah melebihi batas penggunaan terminal kasir.", errorCode = "ERR_AUTH_404") {
  view = "failure";
  $("topTitle").textContent = "Status Aktivasi";
  $("topSubtitle").textContent = "";
  screen.className = "screen status-screen";
  screen.innerHTML = `
    <section class="hero failure-hero">
      ${mascot(MASCOT_ERROR, "error")}
      <div class="status-pill error">${icon("warning")} Gagal Mengaktifkan<br class="status-break"> Perangkat</div>
      <h1 class="page-title compact">Aktivasi Gagal</h1>
      <p class="hero-copy failure-copy">${message}</p>
    </section>

    <section class="card error-card">
      <div class="card-header">
        <div class="card-title">${icon("error")} Detail<br>Aktivasi</div>
        <div class="error-code">${errorCode}</div>
      </div>

      <div class="detail-panel">
        <div class="detail-label">Kode Dimasukkan</div>
        <div class="detail-value detail-code" id="failedCodeDisplay">${$("activationCode").value || "RZGL-8824-XXXX-XXXX"}</div>
      </div>

      <div class="detail-panel">
        <div class="detail-label">Status Lisensi</div>
        <div class="error-status"><span class="dot"></span>Tidak Terdaftar</div>
      </div>

      <div class="check-title">Langkah Pemeriksaan:</div>
      <div class="check-list">
        <div class="check-row"><span class="check-num">1</span><span>Periksa kembali kombinasi karakter huruf kapital dan angka.</span></div>
        <div class="check-row"><span class="check-num">2</span><span>Pastikan lisensi belum digunakan di perangkat kasir lain.</span></div>
        <div class="check-row"><span class="check-num">3</span><span>Hubungi pemilik lisensi jika kode hilang atau kedaluwarsa.</span></div>
      </div>
    </section>

    <div class="failure-actions">
      <button id="retryBtn" class="action-btn primary" type="button">${icon("refresh")} Coba Masukkan Kode Lagi</button>
      <button id="failureQrBtn" class="action-btn secondary" type="button">${icon("qr_code_2")} Pindai Kode<br>QR</button>
    </div>

    <div class="support-row">${icon("support_agent")} Hubungi Dukungan Pemilik Toko</div>

    <footer class="failure-footer">
      <span>${icon("point_of_sale")} KASIR Toko Musik</span>
      <span class="sep"></span>
      <span>Versi<br>1.0.4</span>
    </footer>
  `;

  $("retryBtn").onclick = () => renderInput();
  $("failureQrBtn").onclick = () => log("QR scanner placeholder — certification UI only.");
}

function renderFromState() {
  const status = client.status();
  if (status === "ACTIVE") renderSuccess();
  else if (status === "REVOKED" || status === "EXPIRED" || status === "REVALIDATION_REQUIRED") renderFailure("Lisensi perangkat tidak lagi valid. Hubungkan ke server untuk verifikasi ulang.", "ERR_LICENSE_STATE");
  else renderInput();
}

$("initBtn").onclick = async () => {
  try {
    client = new RizogKeyDummyClient(PRODUCT_CODE);
    await client.initialize();
    setHarnessState();
    renderInput();
    log("Engine initialized.");
    log("Installation Code: " + client.installationCode());
  } catch (error) {
    log("INIT ERROR: " + error.message);
  }
};

$("activateBtn").onclick = async () => {
  try {
    if (!client.identity) await client.initialize();
    const code = $("activationCode").value.trim();
    if (!code) throw new Error("Activation Code belum diisi.");
    await client.activate(code);
    setHarnessState();
    renderSuccess();
    log("Activation berhasil. License Grant signature verified.");
  } catch (error) {
    setHarnessState();
    log("ACTIVATE ERROR: " + error.message);
    renderFailure(
      error.message === "RK_GRANT_INVALID"
        ? "Respons lisensi diterima tetapi tanda tangan digital tidak valid."
        : "Kode aktivasi tidak terdaftar atau telah melebihi batas penggunaan terminal kasir.",
      error.message === "RK_GRANT_INVALID" ? "ERR_GRANT_SIG" : "ERR_AUTH_404"
    );
  }
};

$("revalidateBtn").onclick = async () => {
  try {
    await client.revalidate();
    setHarnessState();
    renderSuccess();
    log("Revalidation berhasil.");
  } catch (error) {
    setHarnessState();
    log("REVALIDATE ERROR: " + error.message);
    renderFailure("Lisensi perangkat tidak lagi valid. Lakukan aktivasi ulang atau hubungi pemilik lisensi.", "ERR_LICENSE");
  }
};

$("clearBtn").onclick = async () => {
  await client.clear();
  await client.initialize();
  setHarnessState();
  renderInput();
  log("Local engine state cleared. New installation identity created.");
};

$("backBtn").onclick = () => {
  if (view === "input") history.back();
  else renderInput();
};

$("helpBtn").onclick = () => log("Bantuan: gunakan Kode Instalasi untuk mendapatkan Kode Aktivasi resmi.");

await client.initialize();
setHarnessState();
renderFromState();
log("Dummy App ready. This app is for RizogKey Engine certification only.");
