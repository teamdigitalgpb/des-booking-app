// Admin panel — login, bookings, voucher approval, stats, JW question

// ── Auth ─────────────────────────────────────────────────────────────────────

function doLogin() {
  const pw  = document.getElementById('pw-input').value;
  const err = document.getElementById('login-error');
  if (pw === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem('des_admin', '1');
    document.getElementById('login-screen').style.display  = 'none';
    document.getElementById('admin-panel').style.display   = 'block';
    loadAll();
  } else {
    err.textContent = 'Incorrect password.';
  }
}

function doLogout() {
  sessionStorage.removeItem('des_admin');
  location.reload();
}

// Auto-show panel if already logged in this session
if (sessionStorage.getItem('des_admin') === '1') {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display  = 'block';
}

// ── Data helpers ─────────────────────────────────────────────────────────────

function getBookings() { return JSON.parse(localStorage.getItem('des_bookings') || '[]'); }
function getVouchers() { return JSON.parse(localStorage.getItem('des_vouchers') || '[]'); }
function saveBookings(data) { localStorage.setItem('des_bookings', JSON.stringify(data)); }
function saveVouchers(data) { localStorage.setItem('des_vouchers', JSON.stringify(data)); }

// ── Tab switching ─────────────────────────────────────────────────────────────

function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  event.target.classList.add('active');
  if (name === 'settings') loadSettings();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function renderStats() {
  const bookings = getBookings();
  const vouchers = getVouchers();
  const stats = [
    { num: bookings.length,                                          lbl: 'Total Bookings' },
    { num: bookings.filter(b => b.status === 'checked-in').length,  lbl: 'Checked In' },
    { num: vouchers.filter(v => v.status === 'pending').length,     lbl: 'Pending Vouchers' },
    { num: vouchers.filter(v => v.status === 'approved').length,    lbl: 'Approved Vouchers' },
  ];
  document.getElementById('stats-row').innerHTML = stats.map(s =>
    `<div class="stat-card"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`
  ).join('');
}

// ── Bookings ──────────────────────────────────────────────────────────────────

const ROOM_LABELS = { d1: 'Room D1', d2: 'Room D2', bunk: 'Bunk Bed', whole: "D' Whole Space" };

function renderBookings() {
  const bookings = getBookings();
  const tbody = document.getElementById('bookings-body');
  document.getElementById('no-bookings').style.display = bookings.length ? 'none' : 'block';

  tbody.innerHTML = bookings.map((b, i) => {
    const status = b.status || 'booked';
    const badgeClass = { booked: 'badge-booked', 'checked-in': 'badge-checked-in', 'checked-out': 'badge-checked-out' }[status] || 'badge-booked';
    let actions = '';
    if (status === 'booked')      actions = `<button class="action-btn btn-checkin"  onclick="setBookingStatus(${i},'checked-in')">Check In</button>`;
    if (status === 'checked-in')  actions = `<button class="action-btn btn-checkout" onclick="setBookingStatus(${i},'checked-out')">Check Out</button>`;

    return `<tr>
      <td>${b.name || '—'}</td>
      <td>${b.mobile || '—'}</td>
      <td>${ROOM_LABELS[b.room] || b.room}</td>
      <td>${b.checkin || '—'}</td>
      <td>${b.checkout || '—'}</td>
      <td>${b.guests || '—'}</td>
      <td>${b.totalPrice ? '₱' + Number(b.totalPrice).toLocaleString() : '—'}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>${actions}</td>
    </tr>`;
  }).join('') || '';
}

function setBookingStatus(idx, status) {
  const bookings = getBookings();
  if (!bookings[idx]) return;
  bookings[idx].status = status;
  if (status === 'checked-in')  bookings[idx].checkedInAt  = new Date().toISOString();
  if (status === 'checked-out') bookings[idx].checkedOutAt = new Date().toISOString();
  saveBookings(bookings);
  loadAll();
}

// ── Vouchers ─────────────────────────────────────────────────────────────────

function renderVouchers() {
  const vouchers = getVouchers();
  const tbody = document.getElementById('vouchers-body');
  document.getElementById('no-vouchers').style.display = vouchers.length ? 'none' : 'block';

  const typeLabel = { jw: 'JW', a2: 'A2', a19: 'A19' };
  const badgeMap  = { pending: 'badge-pending', approved: 'badge-approved', used: 'badge-used', rejected: 'badge-rejected' };

  tbody.innerHTML = vouchers.map((v, i) => {
    const actions = v.status === 'pending'
      ? `<button class="action-btn btn-approve" onclick="approveVoucher(${i})">Approve</button>
         <button class="action-btn btn-reject"  onclick="rejectVoucher(${i})">Reject</button>`
      : '';
    const detail = v.idNumber || (v.answer ? `Answer: ${v.answer}` : '—');
    return `<tr>
      <td>${v.name || '—'}</td>
      <td>${v.mobile || '—'}</td>
      <td>${typeLabel[v.rateType] || v.rateType}</td>
      <td>${v.congregation || '—'}</td>
      <td style="font-size:.83rem;">${detail}</td>
      <td><span class="badge ${badgeMap[v.status] || 'badge-pending'}">${v.status}</span></td>
      <td style="font-size:.83rem;font-weight:600;">${v.code || '—'}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('') || '';
}

function approveVoucher(idx) {
  const vouchers = getVouchers();
  if (!vouchers[idx]) return;
  vouchers[idx].status     = 'approved';
  vouchers[idx].approvedAt = new Date().toISOString();
  vouchers[idx].code       = genVoucherCode(vouchers[idx].rateType);
  saveVouchers(vouchers);

  const v = vouchers[idx];
  alert(`Voucher approved!\n\nCode: ${v.code}\n\nSend this code to ${v.name} at ${v.mobile} via SMS or call.`);
  loadAll();
}

function rejectVoucher(idx) {
  if (!confirm('Reject this voucher request?')) return;
  const vouchers = getVouchers();
  if (!vouchers[idx]) return;
  vouchers[idx].status     = 'rejected';
  vouchers[idx].rejectedAt = new Date().toISOString();
  saveVouchers(vouchers);
  loadAll();
}

// ── JW Settings ───────────────────────────────────────────────────────────────

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('des_jw_settings') || '{}');
  document.getElementById('jw-q-field').value = saved.question || CONFIG.JW_QUESTION || '';
  document.getElementById('jw-a-field').value = saved.answer   || CONFIG.JW_ANSWER   || '';
}

function saveJWQuestion() {
  const question = document.getElementById('jw-q-field').value.trim();
  const answer   = document.getElementById('jw-a-field').value.trim();
  if (!question || !answer) return alert('Both question and answer are required.');
  localStorage.setItem('des_jw_settings', JSON.stringify({ question, answer }));
  // Patch runtime CONFIG so the voucher form picks it up without a page reload
  CONFIG.JW_QUESTION = question;
  CONFIG.JW_ANSWER   = answer;
  const saved = document.getElementById('settings-saved');
  saved.classList.remove('hidden');
  setTimeout(() => saved.classList.add('hidden'), 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function loadAll() {
  renderStats();
  renderBookings();
  renderVouchers();
}

// Load on page start if already authenticated
if (sessionStorage.getItem('des_admin') === '1') loadAll();
