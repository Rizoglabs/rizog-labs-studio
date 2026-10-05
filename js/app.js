const { supabaseUrl, supabasePublishableKey } = window.RIZOG_CONFIG;
const { createClient } = window.supabase;
const sb = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const inputCustomer = document.getElementById('input-customer');
const inputInstall = document.getElementById('input-install');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
let generatedActivationCode = '';
let toastTimer = null;
let historyRecords = [];

function durationLabel(code) {
  return ({ '1M': '1 Bulan', '6M': '6 Bulan', '1Y': '1 Tahun', 'LIFETIME': 'Selamanya' })[code] || '-';
}
function normalizeInstallation(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64); }
function maskInstallation(value) { const code = normalizeInstallation(value); if (!code) return '-'; return code.length <= 8 ? `${code.slice(0, 4)}••••` : `${code.slice(0, 8)}...`; }
function maskCode(record) {
  const hint = String(record?.codeHint || '').toUpperCase();
  const rawProduct = String(record?.productCode || record?.product || 'RPK');
  const prefix = rawProduct.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  return `${prefix}-ACT-••••-••••-${hint || '••••'}`;
}
function generateTestInstallationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = len => { const bytes = new Uint8Array(len); crypto.getRandomValues(bytes); let out = ''; for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]; return out; };
  inputInstall.value = `TEST-RPK-${part(4)}-${part(4)}-${part(4)}`; checkFormValidity(); showToast('Test Installation Code dibuat.');
}
function checkFormValidity() { const valid = inputCustomer.value.trim() !== '' && normalizeInstallation(inputInstall.value) !== ''; btnSubmit.toggleAttribute('disabled', !valid); }
async function invokeRizogKey(body) {
  const { data, error } = await sb.functions.invoke('rizogkey-admin', { body });
  if (error) {
    let detail = error.message || 'Request gagal.';
    try { const bodyText = await error.context?.text?.(); if (bodyText) detail = JSON.parse(bodyText)?.error || detail; } catch (_) {}
    if (error.status === 401 || detail === 'Unauthorized' || detail === 'UNAUTHENTICATED') throw new Error('AUTH_REQUIRED');
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
async function signIn(email, password) { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; return data; }
function showLoginScreen(message = '') { document.getElementById('auth-screen').classList.remove('hidden'); loginError.textContent = message; loginError.classList.toggle('hidden', !message); loginEmail.focus(); }
async function handleSignedIn(session) {
  if (!session?.user) { showLoginScreen(); return; }
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('admin-email').textContent = session.user.email || 'Studio User';
  const badge = document.getElementById('connection-badge');
  badge.textContent = 'Studio Connected';
  badge.className = 'draft-badge bg-teal-100 text-teal-800 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap';
  await refreshData(); checkFormValidity();
}
loginForm.addEventListener('submit', async event => {
  event.preventDefault(); loginError.classList.add('hidden'); loginButton.disabled = true; loginButton.textContent = 'LOGGING IN...';
  try { await signIn(loginEmail.value.trim(), loginPassword.value); }
  catch (error) { console.error(error); loginError.textContent = error?.message || 'Email atau password tidak valid.'; loginError.classList.remove('hidden'); }
  finally { loginButton.disabled = false; loginButton.textContent = 'LOGIN TO STUDIO'; }
});
async function signOut() {
  try { await sb.auth.signOut(); } catch (error) { console.error('Sign out failed.', error); }
  finally { historyRecords = []; generatedActivationCode = ''; dashboardCounts.GENERATED = 0; dashboardCounts.USED = 0; dashboardCounts.REVOKED = 0; renderDashboard(); renderHistory(); showLoginScreen(); }
}
let authBootstrapComplete = false;
sb.auth.onAuthStateChange((event, session) => {
  queueMicrotask(async () => {
    if (!authBootstrapComplete) return;
    try {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) await handleSignedIn(session);
      else if (event === 'SIGNED_OUT') showLoginScreen();
    } catch (error) { console.error('Auth state handling failed.', error); showToast('Gagal memperbarui session.', true); }
  });
});
async function refreshData() { await Promise.all([refreshHistory(), refreshDashboardCounts()]); }
async function refreshHistory() {
  const response = await invokeRizogKey({ action: 'list' });
  historyRecords = (response.data || []).map(row => ({
    id: row.id, product: row.product_name || row.product_code || 'Unknown', productCode: row.product_code || '', customer: row.customer_name,
    installation: row.installation_code, licenseDuration: row.duration_code, licenseDurationLabel: row.duration_label || durationLabel(row.duration_code),
    codeHint: row.code_hint || '', status: row.status, generatedAt: row.generated_at, revokedAt: row.revoked_at
  }));
  renderHistory();
}
async function refreshDashboardCounts() {
  const response = await invokeRizogKey({ action: 'stats' });
  Object.assign(dashboardCounts, response.data || {});
  renderDashboard();
}
function statusBadge(status) {
  const cls = status === 'REVOKED' ? 'bg-red-100 text-red-700' : status === 'USED' ? 'bg-yellow-100 text-yellow-800' : 'bg-teal-100 text-teal-700';
  return `<span class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${cls}">${escapeHtml(status || '-')}</span>`;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
}
document.getElementById('activation-form').addEventListener('submit', async event => {
  event.preventDefault();
  const customer = inputCustomer.value.trim();
  const installation = normalizeInstallation(inputInstall.value);
  const duration = document.getElementById('input-duration').value;
  const product = document.getElementById('input-product').value;
  if (!customer || !installation) return;
  btnSubmit.disabled = true; btnText.textContent = 'GENERATING...';
  try {
    const response = await invokeRizogKey({ action: 'generate', product_code: product, customer_name: customer, installation_code: installation, duration_code: duration, device_limit: 1 });
    const data = response.data;
    generatedActivationCode = data.activation_code || '';
    document.getElementById('display-customer').textContent = data.customer_name || customer;
    document.getElementById('display-install').textContent = maskInstallation(data.installation_code || installation);
    document.getElementById('display-duration').textContent = data.duration_label || durationLabel(duration);
    document.getElementById('display-code').textContent = generatedActivationCode || '-';
    document.getElementById('result-empty').classList.add('hidden');
    document.getElementById('result-success').classList.remove('hidden');
    await refreshData();
    showToast('Activation code berhasil dibuat.');
  } catch (error) {
    console.error(error);
    showToast(error?.message || 'Generate gagal.', true);
  } finally {
    btnText.textContent = 'GENERATE ACTIVATION';
    checkFormValidity();
  }
});
async function copyCode() {
  if (!generatedActivationCode) return;
  try { await navigator.clipboard.writeText(generatedActivationCode); }
  catch (_) { const area = document.createElement('textarea'); area.value = generatedActivationCode; area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); }
  showToast('Activation code disalin.');
}
function renderHistory() {
  const body = document.getElementById('history-body');
  const query = document.getElementById('history-search').value.trim().toLowerCase();
  const statusFilter = document.getElementById('history-status').value;
  const filtered = historyRecords.filter(record => {
    const haystack = `${record.product} ${record.customer} ${record.installation} ${record.codeHint} ${record.licenseDurationLabel}`.toLowerCase();
    return (!query || haystack.includes(query)) && (statusFilter === 'All Status' || record.status === statusFilter);
  });
  if (!filtered.length) { body.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400">No activation records found.</td></tr>'; return; }
  body.innerHTML = filtered.map(record => `
    <tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="px-6 py-4 font-semibold">${escapeHtml(record.product)}</td>
      <td class="px-6 py-4">${escapeHtml(record.customer)}</td>
      <td class="px-6 py-4 font-mono text-xs text-gray-500">${escapeHtml(maskInstallation(record.installation))}</td>
      <td class="px-6 py-4">${escapeHtml(record.licenseDurationLabel)}</td>
      <td class="px-6 py-4 font-mono text-xs text-gray-500">${escapeHtml(maskCode(record))}</td>
      <td class="px-6 py-4">${statusBadge(record.status)}</td>
      <td class="px-6 py-4 text-right">${record.status === 'GENERATED' ? `<button type="button" data-revoke-id="${escapeHtml(record.id)}" class="text-red-500 hover:text-red-700 font-semibold text-xs">REVOKE</button>` : '<span class="text-gray-400 text-xs">-</span>'}</td>
    </tr>`).join('');
}
async function revokeRecord(id) {
  const record = historyRecords.find(item => item.id === id);
  if (!record || record.status !== 'GENERATED') return;
  const ok = window.confirm(`Revoke activation code for ${record.customer}?\n\nThe activation code will no longer be usable.`);
  if (!ok) return;
  try { const data = await invokeRizogKey({ action: 'revoke', id, reason: 'ADMIN_ACTION' }); if (!data?.data) throw new Error('Revoke gagal.'); await refreshData(); showToast('Activation code revoked.'); }
  catch (error) { console.error(error); showToast(error?.message || 'Revoke gagal.', true); }
}
const dashboardCounts = { GENERATED: 0, USED: 0, REVOKED: 0 };
function renderDashboard() {
  const total = dashboardCounts.GENERATED + dashboardCounts.USED + dashboardCounts.REVOKED;
  document.getElementById('stat-generated').textContent = total;
  document.getElementById('stat-used').textContent = dashboardCounts.USED;
  document.getElementById('stat-revoked').textContent = dashboardCounts.REVOKED;
}
function showToast(message, error = false) {
  const toast = document.getElementById('toast'); clearTimeout(toastTimer); toast.textContent = message;
  toast.className = `fixed left-4 right-4 sm:left-auto sm:right-6 bottom-4 sm:bottom-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold toast-enter ${error ? 'bg-red-600' : 'bg-gray-900'}`;
  toast.classList.remove('hidden'); toastTimer = setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-leave'); setTimeout(() => toast.classList.add('hidden'), 250); }, 2500);
}
function openSidebar() { document.getElementById('app-sidebar').classList.add('is-open'); document.getElementById('sidebar-overlay').classList.add('is-open'); document.body.classList.add('overflow-hidden'); }
function closeSidebar() { document.getElementById('app-sidebar').classList.remove('is-open'); document.getElementById('sidebar-overlay').classList.remove('is-open'); document.body.classList.remove('overflow-hidden'); }
window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeSidebar(); });
function switchTab(tabName) {
  closeSidebar(); const titles = { dashboard:'Overview', generator:'Generate New Activation', history:'Activation History' }; document.getElementById('header-title').textContent = titles[tabName];
  ['dashboard','generator','history'].forEach(view => {
    const element = document.getElementById(`view-${view}`); element.classList.toggle('hidden', view !== tabName); element.classList.toggle('block', view === tabName);
    const navBtn = document.getElementById(`nav-${view}`);
    navBtn.className = view === tabName ? 'w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-teal-50 text-teal-700' : 'w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-gray-500 hover:bg-gray-50 hover:text-gray-900';
  });
  if (tabName === 'dashboard') renderDashboard(); if (tabName === 'history') renderHistory();
}
inputCustomer.addEventListener('input', checkFormValidity);
inputInstall.addEventListener('input', () => { inputInstall.value = normalizeInstallation(inputInstall.value); checkFormValidity(); });
document.getElementById('history-search').addEventListener('input', renderHistory);
document.getElementById('history-status').addEventListener('change', renderHistory);
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]'); if (tab) { switchTab(tab.dataset.tab); return; }
  const action = event.target.closest('[data-action]');
  if (action) {
    const name = action.dataset.action;
    if (name === 'open-sidebar') openSidebar(); else if (name === 'close-sidebar') closeSidebar(); else if (name === 'sign-out') signOut(); else if (name === 'generate-test-code') generateTestInstallationCode(); else if (name === 'copy-code') copyCode();
    return;
  }
  const revoke = event.target.closest('[data-revoke-id]'); if (revoke) revokeRecord(revoke.dataset.revokeId);
});
(async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession(); authBootstrapComplete = true;
    if (session?.user) { await handleSignedIn(session); return; }
  } catch (error) { console.error('Session bootstrap failed.', error); authBootstrapComplete = true; }
  showLoginScreen();
})();