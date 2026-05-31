// Booking form — pricing, conflict check, GHL webhook submit

const RATES = {
  d1: {
    regular: { 1: 750,  2: 750,  3: 850,  4: 950  },
    jw:      { 1: 700,  2: 700,  3: 800,  4: 850  },
    a2a19:   { 1: 650,  2: 650,  3: 750,  4: 800  },
  },
  d2: {
    regular: { 1: 550,  2: 600,  3: 750,  4: 750  },
    jw:      { 1: 500,  2: 500,  3: 700,  4: 700  },
    a2a19:   { 1: 450,  2: 500,  3: 700,  4: 700  },
  },
  whole: {
    regular: { 1: 1700, 2: 1700, 3: 1700, 4: 1700, 5: 1700, 6: 1700, 7: 1800, 8: 1900 },
    jw:      { 1: 1500, 2: 1500, 3: 1500, 4: 1500, 5: 1500, 6: 1500, 7: 1600, 8: 1700 },
    a2a19:   { 1: 1300, 2: 1300, 3: 1300, 4: 1300, 5: 1300, 6: 1300, 7: 1450, 8: 1500 },
  },
};

const PAX_MAX = { d1: 4, d2: 4, whole: 8 };

function calcTotal(room, nights, pax, rateType) {
  const tier = RATES[room]?.[rateType || 'regular'];
  if (!tier || !tier[pax]) return 0;
  return tier[pax] * nights;
}

function nightsBetween(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  return Math.round(ms / 86400000);
}

// ── Pax select builder ────────────────────────────────────────────────────────

function populatePaxSelect(room, rateType) {
  const sel      = document.getElementById('guests');
  const noteEl   = document.getElementById('guests-note');
  const prevVal  = sel.value;
  sel.innerHTML  = '<option value="">— Select number of guests —</option>';

  if (!room || !RATES[room]) {
    sel.innerHTML = '<option value="">— Select a room first —</option>';
    noteEl && noteEl.classList.add('hidden');
    return;
  }

  const type    = rateType || 'regular';
  const checkin = document.getElementById('checkin').value;
  let   max     = PAX_MAX[room];
  if (checkin && CONFIG.PAX_OVERRIDES?.[room]?.[checkin]) {
    max = Math.min(max, CONFIG.PAX_OVERRIDES[room][checkin]);
  }
  for (let i = 1; i <= max; i++) {
    const rate   = RATES[room][type]?.[i] ?? RATES[room].regular[i];
    const suffix = (i === max) ? ' (max)' : '';
    const label  = `${i} guest${i > 1 ? 's' : ''}${suffix} — ₱${rate.toLocaleString()}/night`;
    const opt    = document.createElement('option');
    opt.value    = i;
    opt.textContent = label;
    sel.appendChild(opt);
  }

  if (prevVal && [...sel.options].some(o => o.value === prevVal)) sel.value = prevVal;
  if (noteEl) noteEl.classList.toggle('hidden', room !== 'whole');
}

// ── Conflict checking (localStorage) ────────────────────────────────────────

function getBookings() {
  return JSON.parse(localStorage.getItem('des_bookings') || '[]');
}

function hasD1Booking(checkin, checkout) {
  const newIn  = new Date(checkin).getTime();
  const newOut = new Date(checkout).getTime();
  return getBookings().some(b => {
    if (b.room !== 'd1' && b.room !== 'whole') return false;
    const bIn  = new Date(b.checkin).getTime();
    const bOut = new Date(b.checkout).getTime();
    return newIn < bOut && newOut > bIn;
  });
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
  const discountNote = rateType === 'a2a19' ? ' · A2/A19 rate' : rateType === 'jw' ? ' · JW rate' : '';

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
    if (type === 'jw') {
      activeVoucherType = 'jw';
      statusEl.className = 'voucher-status valid';
      statusEl.textContent = '✓ Valid JW voucher — JW rates applied';
    } else if (type === 'a2a19') {
      activeVoucherType = 'a2a19';
      statusEl.className = 'voucher-status valid';
      statusEl.textContent = '✓ Valid A2/A19 voucher — A2/A19 rates applied';
    } else {
      activeVoucherType = 'regular';
      statusEl.className = 'voucher-status invalid';
      statusEl.textContent = '✗ Unrecognized voucher type';
    }
    populatePaxSelect(room, activeVoucherType);
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

  function hideD2Warning() {
    const el = document.getElementById('d2-availability-warning');
    if (el) el.classList.add('hidden');
  }

  if (!checkin || !checkout) { document.getElementById('price-display').style.display = 'none'; hideD2Warning(); return; }
  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) { document.getElementById('price-display').style.display = 'none'; hideD2Warning(); return; }

  updatePriceDisplay(room, nights, pax, activeVoucherType);

  if (room && checkin && checkout) {
    const conflict = hasConflict(room, checkin, checkout);
    document.getElementById('conflict-warning').classList.toggle('hidden', !conflict);
  }

  const d2WarnEl = document.getElementById('d2-availability-warning');
  if (d2WarnEl) {
    if (room === 'd2' && checkin && checkout && nights >= 1) {
      d2WarnEl.classList.toggle('hidden', hasD1Booking(checkin, checkout));
    } else {
      d2WarnEl.classList.add('hidden');
    }
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

  if (room === 'd2' && !hasD1Booking(checkin, checkout)) {
    return showAlert('Room D2 is only available when Room D1 is occupied for the same dates. Please book Room D1 first, or contact us to arrange both rooms.');
  }

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
  populatePaxSelect(e.target.value, 'regular');
  activeVoucherType = 'regular';
  const statusEl = document.getElementById('voucher-status');
  statusEl.className = 'voucher-status';
  statusEl.textContent = '';
  recalc();
});
document.getElementById('checkin').addEventListener('change', () => {
  const room = document.getElementById('room').value;
  if (room) populatePaxSelect(room, activeVoucherType);
  recalc();
});
document.getElementById('checkout').addEventListener('change', recalc);
document.getElementById('guests').addEventListener('change', recalc);
document.getElementById('voucher').addEventListener('blur', (e) => checkVoucher(e.target.value));
document.getElementById('voucher').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Pre-select room from URL param ───────────────────────────────────────────

(function () {
  const params  = new URLSearchParams(window.location.search);
  const room    = params.get('room');
  const guests  = params.get('guests');
  if (room) {
    const sel = document.getElementById('room');
    if ([...sel.options].some(o => o.value === room)) {
      sel.value = room;
      populatePaxSelect(room);
      if (guests) {
        const gSel = document.getElementById('guests');
        if ([...gSel.options].some(o => o.value === guests)) gSel.value = guests;
      }
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
