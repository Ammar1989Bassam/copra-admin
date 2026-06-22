// ═══════════════════════════════════════════════════════════════
// COPRA — config.js
// Supabase Edge Function calls, Auth, DB helpers, ISO 27001 policy
// No service key. All writes go through Edge Functions.
// ═══════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────────
const SK      = 'copra_session_v1';
const SB_URL  = 'https://edopxfjzwxyctqdbzagr.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkb3B4Zmp6d3h5Y3RxZGJ6YWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTMyMTQsImV4cCI6MjA5NzUyOTIxNH0.55wDddJZ6g5_jM-o8UhYb0yvJ2xMKKyZ-FzFFC7F0qI';
const FN_BASE = 'https://edopxfjzwxyctqdbzagr.supabase.co/functions/v1';

// ── Session ───────────────────────────────────────────────────────
let SESSION_TOKEN = null;
let CURRENT_ROLE  = '';
let CURRENT_USER  = null;
function isAdmin() { return CURRENT_ROLE === 'admin'; }
function isSales() { return CURRENT_ROLE === 'sales'; }

// ── ISO 27001 Password Policy ─────────────────────────────────────
const PWD_POLICY = {
  minLength:          12,
  requireUppercase:   true,
  requireLowercase:   true,
  requireNumbers:     true,
  requireSpecial:     true,
  maxFailedAttempts:  5,
  lockoutMinutes:     15,
  sessionTimeoutHours:8
};
let _failedAttempts = 0;
let _lockoutUntil   = null;

function validatePassword(pw) {
  const e = [];
  if (pw.length < PWD_POLICY.minLength)        e.push('Minimum ' + PWD_POLICY.minLength + ' characters');
  if (!/[A-Z]/.test(pw))                       e.push('At least one uppercase letter (A-Z)');
  if (!/[a-z]/.test(pw))                       e.push('At least one lowercase letter (a-z)');
  if (!/[0-9]/.test(pw))                       e.push('At least one number (0-9)');
  if (!/[^A-Za-z0-9]/.test(pw))               e.push('At least one special character (!@#$%^&*)');
  return e;
}
function isLockedOut() {
  if (!_lockoutUntil) return false;
  if (Date.now() > _lockoutUntil) { _lockoutUntil = null; _failedAttempts = 0; return false; }
  return true;
}

// ── UI helpers ────────────────────────────────────────────────────
function showLoader(msg) {
  let el = document.getElementById('global-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loader';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(27,42,74,.75);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff;font-size:15px;font-weight:600';
    el.innerHTML = '<div style="width:42px;height:42px;border:4px solid rgba(255,255,255,.15);border-top-color:#C9993A;border-radius:50%;animation:_spin .75s linear infinite"></div><div id="loader-msg"></div>';
    document.body.appendChild(el);
    const st = document.createElement('style');
    st.textContent = '@keyframes _spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }
  document.getElementById('loader-msg').textContent = msg || 'Loading...';
  el.style.display = 'flex';
}
function hideLoader() {
  const el = document.getElementById('global-loader');
  if (el) el.style.display = 'none';
}

function showToast(msg, type) {
  type = type || 'error';
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:22px;right:22px;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:600;z-index:99998;max-width:320px;box-shadow:0 4px 16px rgba(0,0,0,.18);animation:_toastIn .2s ease';
  t.style.background = type === 'error' ? '#DC2626' : type === 'ok' ? '#16A34A' : '#1B2A4A';
  t.style.color = '#fff';
  t.textContent = msg;
  document.body.appendChild(t);
  const style = document.createElement('style');
  style.textContent = '@keyframes _toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
  document.head.appendChild(style);
  setTimeout(() => t.remove(), 5000);
}

// ── Edge Function caller ──────────────────────────────────────────
async function callFn(fnName, body, requireAuth) {
  if (requireAuth === undefined) requireAuth = true;
  const headers = { 'Content-Type': 'application/json', 'apikey': SB_ANON };
  if (requireAuth && SESSION_TOKEN) headers['Authorization'] = 'Bearer ' + SESSION_TOKEN;
  const res = await fetch(FN_BASE + '/' + fnName, {
    method: 'POST', headers, body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || res.statusText);
  }
  return res.json();
}

// ── RPC helper (for login RPCs that use Supabase directly) ────────
async function callRpc(rpcName, params) {
  const res = await fetch(SB_URL + '/rest/v1/rpc/' + rpcName, {
    method: 'POST',
    headers: {
      'apikey': SB_ANON,
      'Authorization': 'Bearer ' + (SESSION_TOKEN || SB_ANON),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params || {})
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json') && res.status !== 204) return res.json();
  return null;
}

// ── In-memory DB store ────────────────────────────────────────────
let DB = {
  products:[], variants:[], batches:[], stock_costs:[], sales:[],
  collection_batches:[], wholesale_customers:[], suppliers:[],
  supplier_payments:[], expenses:[], payments:[], purchases:[],
  settings:[], fixed_assets:[], users:[], reservations:[],
  cash_handovers:[], supplier_batches:[], wholesale_batches:[], vehicle_catalog:{}
};
let DB_LOADED = false;
let GAS_URL   = '';

// ── Load all data via data-read Edge Function ─────────────────────
async function loadAllData() {
  showLoader('Loading data...');
  try {
    const data = await callFn('data-read', {});
    DB.products            = data.products            || [];
    DB.variants            = data.variants            || [];
    DB.batches             = data.batches             || [];
    DB.stock_costs         = data.stock_costs         || [];
    DB.sales               = data.sales               || [];
    DB.collection_batches  = data.collection_batches  || [];
    DB.wholesale_customers = data.wholesale_customers || [];
    DB.suppliers           = data.suppliers           || [];
    DB.supplier_payments   = data.supplier_payments   || [];
    DB.expenses            = data.expenses            || [];
    DB.payments            = data.partner_payments    || [];
    DB.purchases           = data.purchases           || [];
    DB.settings            = data.settings            || [];
    DB.fixed_assets        = data.fixed_assets        || [];
    DB.users               = data.app_users           || [];
    DB.reservations        = data.reservations        || [];
    DB.cash_handovers      = data.cash_handovers      || [];
    DB.supplier_batches    = data.supplier_batches    || [];
    DB.wholesale_batches   = data.wholesale_batches   || [];
    DB.vehicle_catalog     = {};
    (data.vehicle_catalog || []).forEach(r => {
      if (!DB.vehicle_catalog[r.make]) DB.vehicle_catalog[r.make] = [];
      DB.vehicle_catalog[r.make].push(r.model);
    });
    DB_LOADED = true;
    hideLoader();
  } catch(e) {
    hideLoader();
    showToast('Failed to load data: ' + e.message);
  }
}

// ── Write helpers — all go through data-write Edge Function ───────
const _DATE_FIELDS = ['date','collection_date','payment_date','shipment_date','confirmed_at','datetime'];

function _sanitizeRow(row) {
  const r = { ...row };
  for (const k of Object.keys(r)) {
    if ((r[k] === '' || r[k] === undefined) && _DATE_FIELDS.includes(k)) r[k] = null;
  }
  return r;
}

async function dbInsert(table, row) {
  const sbTable = table === 'payments' ? 'partner_payments'
                : table === 'users'    ? 'app_users'
                : table;
  let sbRow = _sanitizeRow(row);
  if (table === 'expenses' && sbRow.desc !== undefined) {
    sbRow.description = sbRow.desc; delete sbRow.desc;
  }
  try {
    const result = await callFn('data-write', { action: 'insert', table: sbTable, row: sbRow });
    if (result && result.error) showToast('Save error (' + sbTable + '): ' + result.error);
  } catch(e) {
    console.error('Insert failed [' + sbTable + ']:', e.message);
    showToast('Save error (' + sbTable + '): ' + e.message);
  }
}

async function dbUpdate(table, id, updates) {
  const sbTable = table === 'payments' ? 'partner_payments'
                : table === 'users'    ? 'app_users'
                : table;
  let u = _sanitizeRow(updates);
  if (table === 'expenses' && u.desc !== undefined) { u.description = u.desc; delete u.desc; }
  try {
    await callFn('data-write', { action: 'update', table: sbTable, id, updates: u });
  } catch(e) {
    console.error('Update failed [' + sbTable + ']:', e.message);
  }
}

async function dbDelete(table, id) {
  const sbTable = table === 'users' ? 'app_users' : table;
  try {
    await callFn('data-write', { action: 'delete', table: sbTable, id });
    if (DB[table]) DB[table] = DB[table].filter(r => r.id !== id);
  } catch(e) {
    console.error('Delete failed [' + sbTable + ']:', e.message);
  }
}

function pushRow(table, row) {
  dbInsert(table, row).catch(e => console.error('pushRow error:', e));
}

// Legacy stubs
function gasCall() { return Promise.resolve({}); }
async function sbFetch(path, opts, svc) {
  opts = opts || {};
  const method = opts.method || 'GET';
  if (method === 'GET') {
    const res = await fetch(SB_URL + path, {
      headers: { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + (SESSION_TOKEN || SB_ANON), 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(await res.text());
    const ct = res.headers.get('content-type') || '';
    return ct.includes('json') && res.status !== 204 ? res.json() : null;
  }
  // Writes route through Edge Function
  const tbl = (path.match(/\/rest\/v1\/(\w+)/) || [])[1];
  const id  = (path.match(/id=eq\.([^&]+)/) || [])[1];
  const body = opts.body ? JSON.parse(opts.body) : {};
  if (tbl) {
    if (method === 'POST')   return callFn('data-write', { action: 'insert', table: tbl, row: body });
    if (method === 'PATCH')  return callFn('data-write', { action: 'update', table: tbl, id, updates: body });
    if (method === 'DELETE') return callFn('data-write', { action: 'delete', table: tbl, id });
  }
}
async function sbInsert(t, r)   { return callFn('data-write', { action: 'insert', table: t, row: r }); }
async function sbUpdate(t, i, u){ return callFn('data-write', { action: 'update', table: t, id: i, updates: u }); }
async function sbDelete(t, i)   { return callFn('data-write', { action: 'delete', table: t, id: i }); }
async function sbSelect(t, q)   { return sbFetch('/rest/v1/' + t + '?' + (q || '') + '&limit=10000'); }

// ── Settings helpers ──────────────────────────────────────────────
function getSetting(k) {
  const s = (DB.settings || []).find(x => x.key === k); return s ? s.value : '';
}
function setSetting(k, v) {
  const s = (DB.settings || []).find(x => x.key === k);
  if (s) { s.value = v; dbUpdate('settings', k, { value: v }).catch(() => {}); }
  else { DB.settings.push({ key: k, value: v }); dbInsert('settings', { key: k, value: v }).catch(() => {}); }
}

function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Authentication ────────────────────────────────────────────────
async function doLogin() {
  const username = (document.getElementById('login-username').value || '').trim().toLowerCase();
  const pin = document.getElementById('login-pin').value;
  const errEl = document.getElementById('login-err');

  if (isLockedOut()) {
    const rem = Math.ceil((_lockoutUntil - Date.now()) / 60000);
    errEl.textContent = 'Account locked. Try again in ' + rem + ' minute(s).';
    return;
  }
  if (!username || !pin) { errEl.textContent = 'Enter username and password.'; return; }
  errEl.textContent = '';
  showLoader('Signing in...');
  try {
    const res = await callFn('auth-login', { username, password: pin }, false);
    if (!res || !res.token) {
      hideLoader();
      _failedAttempts++;
      const rem = PWD_POLICY.maxFailedAttempts - _failedAttempts;
      if (_failedAttempts >= PWD_POLICY.maxFailedAttempts) {
        _lockoutUntil = Date.now() + PWD_POLICY.lockoutMinutes * 60000;
        errEl.textContent = 'Too many failed attempts. Account locked for ' + PWD_POLICY.lockoutMinutes + ' minutes.';
      } else {
        errEl.textContent = 'Incorrect username or password. ' + rem + ' attempt(s) remaining.';
      }
      document.getElementById('login-pin').value = '';
      return;
    }
    _failedAttempts = 0; _lockoutUntil = null;
    SESSION_TOKEN = res.token;
    CURRENT_USER  = res.user;
    CURRENT_ROLE  = res.user.role;

    // Auto-logout on session timeout (ISO 27001)
    setTimeout(() => {
      showToast('Session expired. Please log in again.', 'info');
      doLogout();
    }, PWD_POLICY.sessionTimeoutHours * 3600000);

    sessionStorage.setItem(SK, JSON.stringify({ token: res.token, user: res.user, loginTime: Date.now() }));
    await loadAllData();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    document.getElementById('login-pin').value = '';
    document.getElementById('login-username').value = '';
    applyRoleRestrictions();
    populateSels();
    renderDash();
  } catch(e) {
    hideLoader();
    errEl.textContent = 'Login failed: ' + e.message;
  }
}

async function checkSession() {
  const s = sessionStorage.getItem(SK);
  if (s) {
    try {
      const sess = JSON.parse(s);
      const age = (Date.now() - (sess.loginTime || 0)) / 3600000;
      if (age > PWD_POLICY.sessionTimeoutHours) {
        sessionStorage.removeItem(SK);
      } else {
        SESSION_TOKEN = sess.token;
        CURRENT_USER  = sess.user;
        CURRENT_ROLE  = sess.user.role;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';
        await loadAllData();
        applyRoleRestrictions();
        populateSels();
        renderDash();
        return;
      }
    } catch(e) { sessionStorage.removeItem(SK); }
  }
  document.getElementById('login-screen').style.display = 'flex';
  setTimeout(() => document.getElementById('login-pin')?.focus(), 150);
}

function doLogout() {
  sessionStorage.removeItem(SK);
  SESSION_TOKEN = null; CURRENT_ROLE = ''; CURRENT_USER = null;
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pin').value = '';
  document.getElementById('login-username').value = '';
}
function logout() { doLogout(); }

async function savePins() {
  const ap = document.getElementById('set-admin-pin')?.value || '';
  const msg = document.getElementById('pin-msg');
  if (!ap) { if (msg) { msg.style.color = 'var(--rd)'; msg.textContent = 'Enter new password.'; } return; }
  const errs = validatePassword(ap);
  if (errs.length) {
    if (msg) { msg.style.color = 'var(--rd)'; msg.textContent = 'Requirements: ' + errs.join(', '); }
    return;
  }
  try {
    await callRpc('update_user_password', { p_username: CURRENT_USER?.username, p_password: ap });
    if (msg) { msg.style.color = 'var(--gn)'; msg.textContent = 'Password updated successfully.'; }
    document.getElementById('set-admin-pin').value = '';
    setTimeout(() => { if (msg) msg.textContent = ''; }, 4000);
  } catch(e) {
    if (msg) { msg.style.color = 'var(--rd)'; msg.textContent = 'Error: ' + e.message; }
  }
}

async function saveUser() {
  const uname  = (document.getElementById('user-username').value || '').trim().toLowerCase();
  const dname  = document.getElementById('user-display').value.trim();
  const pin    = document.getElementById('user-pin').value;
  const active = document.getElementById('user-active').value === 'true';
  const editId = document.getElementById('user-edit-id').value;
  if (!uname) { alert('Enter username.'); return; }
  if (!editId && !pin) { alert('Enter password for new user.'); return; }
  if (pin) { const errs = validatePassword(pin); if (errs.length) { alert('Password requirements:\n- ' + errs.join('\n- ')); return; } }
  const dup = (DB.users || []).find(u => u.username === uname && u.id !== editId);
  if (dup) { alert('Username already taken.'); return; }
  showLoader('Saving...');
  try {
    if (editId) {
      await dbUpdate('users', editId, { username: uname, display_name: dname, active });
      if (pin) await callRpc('update_user_password', { p_username: uname, p_password: pin });
      const u = (DB.users || []).find(x => x.id === editId);
      if (u) { u.username = uname; u.display_name = dname; u.active = active; }
    } else {
      const res = await callRpc('create_user', { p_username: uname, p_display_name: dname, p_password: pin, p_role: 'sales' });
      DB.users.push({ id: res?.user_id || uid(), username: uname, display_name: dname, role: 'sales', active });
    }
    hideLoader(); closeM('m-adduser'); renderSetupUsers();
  } catch(e) { hideLoader(); alert('Error: ' + e.message); }
}

async function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  await dbDelete('users', id); renderSetupUsers();
}

document.addEventListener('DOMContentLoaded', () => { checkSession(); });
