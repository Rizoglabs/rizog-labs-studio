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
let productRecords = [];
let editingProductCode = null;

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
function checkFormValidity() { const valid = inputCustomer.value.trim() !== '' && normalizeInstallation(inputInstall.value) !== '' && document.getElementById('input-product').value !== ''; btnSubmit.toggleAttribute('disabled', !valid); }
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
async function refreshData() { await Promise.all([refreshHistory(), refreshDashboardCounts(), refreshProducts()]); }
async function refreshProducts() {
  const response = await invokeRizogKey({ action: 'product_list' });
  productRecords = response.data || [];
  renderProducts();
  populateProductSelector();
}
function populateProductSelector() {
  const select = document.getElementById('input-product');
  const previous = select.value;
  select.replaceChildren(new Option('Select active product', ''));
  productRecords.filter(product => product.status === 'ACTIVE').forEach(product => {
    select.add(new Option(`${product.display_name || product.name} — ${product.product_code}`, product.product_code));
  });
  select.value = productRecords.some(p => p.product_code === previous && p.status === 'ACTIVE') ? previous : '';
  checkFormValidity();
}
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
  if (!customer || !installation || !product) return;
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

function productStatusBadge(status) {
  const style = status === 'ACTIVE' ? 'bg-teal-100 text-teal-700' : status === 'ARCHIVED' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-800';
  return `<span class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${style}">${escapeHtml(status || '-')}</span>`;
}
function renderProducts() {
  const body = document.getElementById('products-body');
  const query = document.getElementById('product-search').value.trim().toLowerCase();
  const status = document.getElementById('product-status-filter').value;
  const rows = productRecords.filter(p => (!query || `${p.name} ${p.display_name} ${p.product_code}`.toLowerCase().includes(query)) && (status === 'ALL' || p.status === status));
  if (!rows.length) { body.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">${productRecords.length ? 'No products match these filters.' : 'No products registered yet.'}</td></tr>`; return; }
  body.innerHTML = rows.map(p => `
    <tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="px-6 py-4"><div class="font-semibold">${escapeHtml(p.display_name || p.name)}</div><div class="text-xs text-gray-500 mt-1">${escapeHtml(p.brand || 'RizogLabs')}</div></td>
      <td class="px-6 py-4 font-mono text-xs">${escapeHtml(p.product_code)}</td><td class="px-6 py-4">${escapeHtml(p.platform || 'UNKNOWN')}</td>
      <td class="px-6 py-4">${escapeHtml(p.current_version || '—')}</td><td class="px-6 py-4">${productStatusBadge(p.status)}</td>
      <td class="px-6 py-4 text-right whitespace-nowrap"><button type="button" data-product-view="${escapeHtml(p.product_code)}" class="text-teal-700 hover:text-teal-900 font-semibold text-xs mr-3">DETAILS</button><button type="button" data-action="edit-product" data-product-code="${escapeHtml(p.product_code)}" class="text-gray-500 hover:text-gray-900 font-semibold text-xs">EDIT</button></td>
    </tr>`).join('');
}
function showProductList() { document.getElementById('product-list-panel').classList.remove('hidden'); document.getElementById('product-detail-panel').classList.add('hidden'); }
async function openProductDetail(productCode) {
  try {
    const { data: p } = await invokeRizogKey({ action: 'product_detail', product_code: productCode });
    document.getElementById('header-title').textContent = p.display_name || p.name;
    document.getElementById('product-list-panel').classList.add('hidden'); document.getElementById('product-detail-panel').classList.remove('hidden');
    const fields = [['Product Name',p.name],['Display Name',p.display_name],['Brand',p.brand],['Product Code',p.product_code],['Platform',p.platform],['Status',p.status],['Current Version',p.current_version],['RizogKey Engine',p.rizogkey_engine_version],['Protocol',p.rizogkey_protocol_version],['Created',p.created_at ? new Date(p.created_at).toLocaleString() : '—'],['Updated',p.updated_at ? new Date(p.updated_at).toLocaleString() : '—']];
    document.getElementById('product-detail-content').innerHTML = `<div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><p class="text-xs uppercase tracking-wider text-gray-500 font-bold">Product Information</p><h3 class="text-2xl font-black mt-2">${escapeHtml(p.display_name || p.name)}</h3><p class="font-mono text-sm text-gray-500 mt-1">${escapeHtml(p.product_code)}</p></div>${productStatusBadge(p.status)}</div>
      <dl class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">${fields.map(([label,value]) => `<div><dt class="text-xs uppercase tracking-wide text-gray-500 font-bold">${escapeHtml(label)}</dt><dd class="font-semibold mt-1 break-words">${escapeHtml(value || '—')}</dd></div>`).join('')}</dl>
      <div class="mt-8 grid sm:grid-cols-2 gap-4"><div class="rounded-xl bg-gray-50 border border-gray-100 p-5"><p class="text-sm text-gray-500">Installations</p><p class="text-3xl font-black mt-1">${Number(p.installation_count) || 0}</p></div><div class="rounded-xl bg-gray-50 border border-gray-100 p-5"><p class="text-sm text-gray-500">Licenses</p><p class="text-3xl font-black mt-1">${Number(p.license_count) || 0}</p></div></div>
      ${p.description ? `<div class="mt-6"><p class="text-xs uppercase tracking-wide text-gray-500 font-bold">Description</p><p class="mt-2 text-sm whitespace-pre-wrap">${escapeHtml(p.description)}</p></div>` : ''}
      <p class="mt-6 text-xs text-gray-400">Installation and license records remain in RizogKey; this page displays their totals.</p></div>`;
  } catch (error) { console.error(error); showToast(error?.message || 'Gagal memuat product.', true); }
}
function openProductForm(p = null) {
  editingProductCode = p?.product_code || null;
  document.getElementById('product-form').reset();
  document.getElementById('product-modal-title').textContent = p ? 'Edit Product' : 'Add Product';
  document.getElementById('product-save-button').textContent = p ? 'Save Changes' : 'Create Product';
  document.getElementById('product-code').disabled = Boolean(p);
  document.getElementById('product-code').value = p?.product_code || '';
  document.getElementById('product-name').value = p?.name || '';
  document.getElementById('product-display-name').value = p?.display_name || '';
  document.getElementById('product-brand').value = p?.brand || 'RizogLabs';
  document.getElementById('product-platform').value = p?.platform || 'UNKNOWN';
  document.getElementById('product-status').value = p?.status || 'INACTIVE';
  document.getElementById('product-version').value = p?.current_version || '';
  document.getElementById('product-engine-version').value = p?.rizogkey_engine_version || '';
  document.getElementById('product-protocol-version').value = p?.rizogkey_protocol_version || '';
  document.getElementById('product-description').value = p?.description || '';
  document.getElementById('product-form-error').classList.add('hidden'); document.getElementById('product-modal').classList.remove('hidden'); document.getElementById('product-code').focus();
}
function closeProductForm() { document.getElementById('product-modal').classList.add('hidden'); }
async function saveProduct(event) {
  event.preventDefault();
  const isEditing = Boolean(editingProductCode);
  const errorBox = document.getElementById('product-form-error');
  const button = document.getElementById('product-save-button');
  const values = {
    product_code: editingProductCode || document.getElementById('product-code').value.trim().toUpperCase(),
    name: document.getElementById('product-name').value.trim(),
    display_name: document.getElementById('product-display-name').value.trim(),
    brand: document.getElementById('product-brand').value.trim(),
    platform: document.getElementById('product-platform').value,
    status: document.getElementById('product-status').value,
    current_version: document.getElementById('product-version').value.trim(),
    rizogkey_engine_version: document.getElementById('product-engine-version').value.trim(),
    rizogkey_protocol_version: document.getElementById('product-protocol-version').value.trim(),
    description: document.getElementById('product-description').value.trim()
  };
  button.disabled = true; button.textContent = 'Saving...'; errorBox.classList.add('hidden');
  try {
    await invokeRizogKey({ action: isEditing ? 'product_update' : 'product_create', ...values });
    closeProductForm(); editingProductCode = null; await refreshProducts(); showToast(isEditing ? 'Product updated.' : 'Product created.');
  } catch (error) {
    console.error(error); errorBox.textContent = error?.message === 'PRODUCT_CODE_EXISTS' ? 'Product Code tersebut sudah digunakan.' : error?.message || 'Product gagal disimpan.'; errorBox.classList.remove('hidden');
  } finally { button.disabled = false; button.textContent = isEditing ? 'Save Changes' : 'Create Product'; }
}

function switchTab(tabName) {
  closeSidebar(); const titles = { dashboard:'Overview', products:'Products', generator:'Generate New Activation', history:'Activation History' }; document.getElementById('header-title').textContent = titles[tabName] || 'Product Detail';
  ['dashboard','products','generator','history'].forEach(view => {
    const element = document.getElementById(`view-${view}`); element.classList.toggle('hidden', view !== tabName); element.classList.toggle('block', view === tabName);
    const navBtn = document.getElementById(`nav-${view}`);
    navBtn.className = view === tabName ? 'w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-teal-50 text-teal-700' : 'w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-gray-500 hover:bg-gray-50 hover:text-gray-900';
  });
  if (tabName === 'dashboard') renderDashboard(); if (tabName === 'history') renderHistory(); if (tabName === 'products') showProductList();
}
document.getElementById('input-product').addEventListener('change', checkFormValidity);
inputCustomer.addEventListener('input', checkFormValidity);
inputInstall.addEventListener('input', () => { inputInstall.value = normalizeInstallation(inputInstall.value); checkFormValidity(); });
document.getElementById('history-search').addEventListener('input', renderHistory);
document.getElementById('history-status').addEventListener('change', renderHistory);
document.getElementById('product-search').addEventListener('input', renderProducts);
document.getElementById('product-status-filter').addEventListener('change', renderProducts);
document.getElementById('product-form').addEventListener('submit', saveProduct);
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]'); if (tab) { switchTab(tab.dataset.tab); return; }
  const action = event.target.closest('[data-action]');
  if (action) {
    const name = action.dataset.action;
    if (name === 'open-sidebar') openSidebar(); else if (name === 'close-sidebar') closeSidebar(); else if (name === 'sign-out') signOut(); else if (name === 'generate-test-code') generateTestInstallationCode(); else if (name === 'copy-code') copyCode(); else if (name === 'add-product') openProductForm(); else if (name === 'close-product-modal') closeProductForm(); else if (name === 'back-to-products') switchTab('products'); else if (name === 'edit-product') { const product = productRecords.find(item => item.product_code === action.dataset.productCode); if (product) openProductForm(product); }
    return;
  }
  const productView = event.target.closest('[data-product-view]'); if (productView) openProductDetail(productView.dataset.productView);
  const revoke = event.target.closest('[data-revoke-id]'); if (revoke) revokeRecord(revoke.dataset.revokeId);
});
(async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession(); authBootstrapComplete = true;
    if (session?.user) { await handleSignedIn(session); return; }
  } catch (error) { console.error('Session bootstrap failed.', error); authBootstrapComplete = true; }
  showLoginScreen();
})();