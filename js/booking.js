// Booking form — pricing, conflict check, GHL webhook submit

const RATES = {
  d1: {
    regular: { '1-4': 950,  '5-7': 950,  '8-15': 900, '16-30': 800 },
    jw:      { '1-4': 850,  '5-7': 850,  '8-15': 800, '16-30': 720 },
    a2a19:   { '1-4': 750,  '5-7': 750,  '8-15': 700, '16-30': 650 },
  },
  d2: {
    regular: { '1-4': 650,  '5-7': 650,  '8-15': 600, '16-30': 600 },
    jw:      { '1-4': 600,  '5-7': 600,  '8-15': 550, '16-30': 550 },
    a2a19:   { '1-4': 550,  '5-7': 550,  '8-15': 500, '16-30': 500 },
  },
  whole: { base: 1500, extraPax: 150 },
  bunk:  { '1-7': 150, '8-15': 140, '16-30': 135 },
};

function bracket(nights) {
  if (nights <= 4)  return '1-4';
  if (nights <= 7)  return '5-7';
  if (nights <= 15) return '8-15';
  return '16-30';
}

function bunkBracket(nights) {
  if (nights <= 7)  return '1-7';
  if (nights <= 15) return '8-15';
  return '16-30';
}

function calcTotal(room, nights, pax, rateType) {
  if (room === 'whole') {
    return RATES.whole.base * nights + Math.max(0, pax - 8) * RATES.whole.extraPax * nights;
  }
  if (room === 'bunk') return RATES.bunk[bunkBracket(nights)] * pax * nights;
  const rate = RATES[room][rateType][bracket(nights)];
  let total = rate * nights;
  // Extra-pax surcharge (5th person D1, 3rd person D2)
  const maxFree = room === 'd1' ? 4 : 2;
  const extraPax = Math.max(0, pax - maxFree);
  total += extraPax * 150 * nights;
  return total;
}

function nightsBetween(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  return Math.round(ms / 86400000);
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
  if (!room || !nights || nights < 1) { display.style.display = 'none'; return; }

  const total = calcTotal(room, nights, pax, rateType);
  const roomLabels = { d1: 'Room D1', d2: 'Room D2', bunk: 'Bunk Bed', whole: 'D\' Whole Space' };
  const rateLabels = { regular: 'Regular rate', jw: 'JW rate', a2a19: 'A2/A19 rate' };

  let breakdown = `${roomLabels[room] || room} · ${nights} night${nights > 1 ? 's' : ''} · ${pax} guest${pax > 1 ? 's' : ''}`;
  if (room !== 'whole' && room !== 'bunk') breakdown += ` · ${rateLabels[rateType]}`;

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
  const room = document.getElementById('room').value;
  const result = await validateVoucher(code.trim().toUpperCase(), room);
  if (result.valid) {
    activeVoucherType = result.type === 'jw' ? 'jw' : 'a2a19';
    statusEl.className = 'voucher-status valid';
    statusEl.textContent = `✓ Valid ${result.type.toUpperCase()} voucher — discounted rate applied`;
  } else {
    activeVoucherType = 'regular';
    statusEl.className = 'voucher-status invalid';
    statusEl.textContent = `✗ ${result.reason}`;
  }
  recalc();
}

// ── Recalc on any field change ───────────────────────────────────────────────

function recalc() {
  const room    = document.getElementById('room').value;
  const checkin = document.getElementById('checkin').value;
  const checkout= document.getElementById('checkout').value;
  const pax     = parseInt(document.getElementById('guests').value) || 1;

  if (!checkin || !checkout) { document.getElementById('price-display').style.display = 'none'; return; }
  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) { document.getElementById('price-display').style.display = 'none'; return; }

  updatePriceDisplay(room, nights, pax, activeVoucherType);

  // Conflict check
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

  // Basic validation
  if (!name)    return showAlert('Please enter your full name.');
  if (!mobile)  return showAlert('Please enter your mobile number.');
  if (!room)    return showAlert('Please select a room.');
  if (!checkin) return showAlert('Please select a check-in date.');
  if (!checkout)return showAlert('Please select a check-out date.');

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

    // Mark voucher used if one was applied
    if (voucher) markVoucherUsed(voucher);

    // Save booking locally for conflict checking
    saveBooking({ room, checkin, checkout, name, id: Date.now() });

    // Pass summary to thank-you page via sessionStorage
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

document.getElementById('room').addEventListener('change', recalc);
document.getElementById('checkin').addEventListener('change', recalc);
document.getElementById('checkout').addEventListener('change', recalc);
document.getElementById('guests').addEventListener('input', recalc);
document.getElementById('voucher').addEventListener('blur', (e) => checkVoucher(e.target.value));
document.getElementById('voucher').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Pre-select room from URL param ───────────────────────────────────────────

(function () {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    const sel = document.getElementById('room');
    if ([...sel.options].some(o => o.value === room)) {
      sel.value = room;
      recalc();
    }
  }

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('checkin').min = today;
  document.getElementById('checkout').min = today;

  document.getElementById('checkin').addEventListener('change', (e) => {
    document.getElementById('checkout').min = e.target.value;
  });
})();
