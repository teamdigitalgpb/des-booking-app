// Booking form — pricing, conflict check, GHL webhook submit

const RATES = {
  d1:    { 1: 650, 2: 750, 3: 750, 4: 900, 5: 900 },
  d2:    { 1: 450, 2: 550, 3: 650, 4: 750 },
  whole: { 1: 1500, 2: 1500, 3: 1500, 4: 1500, 5: 1500, 6: 1500, 7: 1600, 8: 1700 },
};

const PAX_MAX  = { d1: 5, d2: 4, whole: 8 };
const A2A19_DISCOUNT = 100; // applies to d2 only

function calcTotal(room, nights, pax, rateType) {
  if (!RATES[room] || !RATES[room][pax]) return 0;
  let ratePerNight = RATES[room][pax];
  if (room === 'd2' && rateType === 'a2a19') ratePerNight -= A2A19_DISCOUNT;
  return ratePerNight * nights;
}

function nightsBetween(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  return Math.round(ms / 86400000);
}

// ── Pax select builder ────────────────────────────────────────────────────────

function populatePaxSelect(room) {
  const sel      = document.getElementById('guests');
  const noteEl   = document.getElementById('guests-note');
  sel.innerHTML  = '<option value="">— Select number of guests —</option>';

  if (!room || !RATES[room]) {
    sel.innerHTML = '<option value="">— Select a room first —</option>';
    noteEl && noteEl.classList.add('hidden');
    return;
  }

  const max = PAX_MAX[room];
  for (let i = 1; i <= max; i++) {
    const rate  = RATES[room][i];
    const label = `${i} guest${i > 1 ? 's' : ''} — ₱${rate.toLocaleString()}/night`;
    const opt   = document.createElement('option');
    opt.value   = i;
    opt.textContent = label;
    sel.appendChild(opt);
  }

  if (noteEl) noteEl.classList.toggle('hidden', room !== 'whole');
}

// ── Conflict checking (localStorage) ────────────────────────────────────────

function getBookings() {
  return JSON.parse(localStorage.getItem('des_bookings') || '[]');
}

function hasConflict(room, checkin, checkout) {
  const newIn  = new Date(checkin).getTime();
  const newOut = new Date(checkout).getTime();
  return getBookings().some(b => {
    if (b.room !== room) return false;
    const bIn  = new Date(b.checkin).getTime();
    const bOut = new Date(b.checkout).getTime();
    return newIn < bOut && newOut > bIn;
  });
}

function saveBooking(data) {
  const bookings = getBookings();
  bookings.push(data);
  localStorage.setItem('des_bookings', JSON.stringify(bookings));
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function showAlert(msg, type = 'error') {
  const el = document.getElementById('booking-alert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  document.getElementById('booking-alert').classList.add('hidden');
}

function updatePriceDisplay(room, nights, pax, rateType) {
  const display = document.getElementById('price-display');
  if (!room || !nights || nights < 1 || !pax) { display.style.display = 'none'; return; }

  const total = calcTotal(room, nights, pax, rateType);
  if (!total) { display.style.display = 'none'; return; }

  const roomLabels = { d1: 'Room D1', d2: 'Room D2', whole: 'D\' Whole Space' };
  const discountNote = (room === 'd2' && rateType === 'a2a19') ? ' · A2/A19 rate' : '';

  const breakdown = `${roomLabels[room] || room} · ${nights} night${nights > 1 ? 's' : ''} · ${pax} guest${pax > 1 ? 's' : ''}${discountNote}`;

  document.getElementById('price-total').textContent = `₱${total.toLocaleString()}`;
  document.getElementById('price-breakdown').textContent = breakdown;
  display.style.display = 'block';
}

// ── Voucher check ────────────────────────────────────────────────────────────

let activeVoucherType = 'regular';

async function checkVoucher(code) {
  const statusEl = document.getElementById('voucher-status');
  if (!code) {
    statusEl.className = 'voucher-status';
    statusEl.textContent = '';
    activeVoucherType = 'regular';
    return;
  }
  const room   = document.getElementById('room').value;
  const result = await validateVoucher(code.trim().toUpperCase(), room);

  if (result.valid) {
    const type = result.type === 'a2' || result.type === 'a19' ? 'a2a19' : result.type;
    if (type === 'a2a19' && room !== 'd2') {
      activeVoucherType = 'regular';
      statusEl.className = 'voucher-status invalid';
      statusEl.textContent = '✗ A2/A19 discount is only applicable to Room D2';
    } else if (type === 'jw') {
      activeVoucherType = 'regular';
      statusEl.className = 'voucher-status invalid';
      statusEl.textContent = '✗ JW discount is no longer offered';
    } else {
      activeVoucherType = type;
      statusEl.className = 'voucher-status valid';
      statusEl.textContent = '✓ Valid A2/A19 voucher — ₱100 off applied';
    }
  } else {
    activeVoucherType = 'regular';
    statusEl.className = 'voucher-status invalid';
    statusEl.textContent = `✗ ${result.reason}`;
  }
  recalc();
}

// ── Recalc on any field change ───────────────────────────────────────────────

function recalc() {
  const room     = document.getElementById('room').value;
  const checkin  = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const pax      = parseInt(document.getElementById('guests').value) || 0;

  if (!checkin || !checkout) { document.getElementById('price-display').style.display = 'none'; return; }
  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) { document.getElementById('price-display').style.display = 'none'; return; }

  updatePriceDisplay(room, nights, pax, activeVoucherType);

  if (room && checkin && checkout) {
    const conflict = hasConflict(room, checkin, checkout);
    document.getElementById('conflict-warning').classList.toggle('hidden', !conflict);
  }
}

// ── Form submit ──────────────────────────────────────────────────────────────

document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const name     = document.getElementById('name').value.trim();
  const mobile   = document.getElementById('mobile').value.trim();
  const email    = document.getElementById('email').value.trim();
  const room     = document.getElementById('room').value;
  const checkin  = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const guests   = parseInt(document.getElementById('guests').value);
  const voucher  = document.getElementById('voucher').value.trim().toUpperCase();
  const requests = document.getElementById('requests').value.trim();

  if (!name)    return showAlert('Please enter your full name.');
  if (!mobile)  return showAlert('Please enter your mobile number.');
  if (!room)    return showAlert('Please select a room.');
  if (!checkin) return showAlert('Please select a check-in date.');
  if (!checkout)return showAlert('Please select a check-out date.');
  if (!guests)  return showAlert('Please select the number of guests.');

  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) return showAlert('Check-out must be after check-in.');

  if (hasConflict(room, checkin, checkout)) {
    return showAlert('These dates conflict with an existing booking. Please choose different dates or contact us.');
  }

  const totalPrice = calcTotal(room, nights, guests, activeVoucherType);
  const tags = ['DES', 'DES-booked', `DES-${room}`];

  const payload = {
    name, mobile, email, room, checkin, checkout,
    guests, voucherCode: voucher, specialRequests: requests,
    totalPrice, nights, rateType: activeVoucherType,
    tags: tags.join(','),
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    await postToWebhook(CONFIG.WEBHOOK_BOOKING, payload);

    if (voucher) markVoucherUsed(voucher);

    saveBooking({ room, checkin, checkout, name, id: Date.now() });

    sessionStorage.setItem('des_booking_summary', JSON.stringify({
      name, mobile, room, checkin, checkout, guests, totalPrice, nights, rateType: activeVoucherType,
    }));

    window.location.href = 'thankyou-booking.html';
  } catch (err) {
    showAlert('Something went wrong. Please try again or contact us directly.');
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
});

// ── Wire up listeners ────────────────────────────────────────────────────────

document.getElementById('room').addEventListener('change', (e) => {
  populatePaxSelect(e.target.value);
  activeVoucherType = 'regular';
  const statusEl = document.getElementById('voucher-status');
  statusEl.className = 'voucher-status';
  statusEl.textContent = '';
  recalc();
});
document.getElementById('checkin').addEventListener('change', recalc);
document.getElementById('checkout').addEventListener('change', recalc);
document.getElementById('guests').addEventListener('change', recalc);
document.getElementById('voucher').addEventListener('blur', (e) => checkVoucher(e.target.value));
document.getElementById('voucher').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Pre-select room from URL param ───────────────────────────────────────────

(function () {
  const params = new URLSearchParams(window.location.search);
  const room   = params.get('room');
  if (room) {
    const sel = document.getElementById('room');
    if ([...sel.options].some(o => o.value === room)) {
      sel.value = room;
      populatePaxSelect(room);
      recalc();
    }
  }

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('checkin').min  = today;
  document.getElementById('checkout').min = today;

  document.getElementById('checkin').addEventListener('change', (e) => {
    document.getElementById('checkout').min = e.target.value;
  });
})();
