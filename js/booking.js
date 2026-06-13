// Booking form — pricing, conflict check, GHL webhook submit

const RATES = {
  d1: {
    regular: { 1: 650,  2: 650,  3: 850,  4: 950  },
    jw:      { 1: 500,  2: 600,  3: 750,  4: 800  },
    a2a19:   { 1: 400,  2: 550,  3: 700,  4: 750  },
  },
  d2: {
    regular: { 1: 550,  2: 600,  3: 750,  4: 800  },
    jw:      { 1: 400,  2: 550,  3: 650,  4: 750  },
    a2a19:   { 1: 350,  2: 500,  3: 600,  4: 700  },
  },
  whole: {
    regular: { 1: 1700, 2: 1700, 3: 1700, 4: 1700, 5: 1700, 6: 1800, 7: 1800, 8: 1900 },
    jw:      { 1: 1500, 2: 1500, 3: 1500, 4: 1500, 5: 1500, 6: 1650, 7: 1650, 8: 1800 },
    a2a19:   { 1: 1400, 2: 1400, 3: 1400, 4: 1400, 5: 1400, 6: 1550, 7: 1550, 8: 1700 },
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
  const discountNote = rateType === 'a2a19' ? ' · A2/A19 volunteer rate' : rateType === 'jw' ? ' · JW volunteer rate' : '';

  const breakdown = `${roomLabels[room] || room} · ${nights} night${nights > 1 ? 's' : ''} · ${pax} guest${pax > 1 ? 's' : ''}${discountNote}`;

  document.getElementById('price-total').textContent = `₱${total.toLocaleString()}`;
  document.getElementById('price-breakdown').textContent = breakdown;
  display.style.display = 'block';
}

// ── Discount eligibility ──────────────────────────────────────────────────────

let activeVoucherType = 'regular';
let preVerified       = false;

function saveVerification(type, email) {
  localStorage.setItem('des_verified', JSON.stringify({
    type, email: (email || '').toLowerCase(), verifiedAt: Date.now(),
  }));
}

function checkStoredVerification(email) {
  try {
    const rec = JSON.parse(localStorage.getItem('des_verified') || 'null');
    if (!rec || !rec.type) return null;
    if (rec.type === 'jw' && Date.now() - (rec.verifiedAt || 0) > 7 * 24 * 60 * 60 * 1000) return null;
    if (email && rec.email && rec.email !== email.toLowerCase()) return null;
    return rec;
  } catch (e) { return null; }
}

function applyVerified(type) {
  preVerified = true;
  activeVoucherType = type;
  const discGroup = document.querySelector('.disc-checks')?.closest('.form-group');
  if (discGroup) discGroup.style.display = 'none';
  const room = document.getElementById('room').value;
  if (type === 'jw') {
    document.getElementById('jw-panel').classList.remove('hidden');
    document.getElementById('jw-q').style.display = 'none';
    document.getElementById('jw-ans').style.display = 'none';
    const statusEl = document.getElementById('jw-ans-status');
    statusEl.className   = 'voucher-status valid';
    statusEl.textContent = '✓ Verified — JW volunteer rate applied';
    document.getElementById('jw-donate-btn').href = `payment.html?donate=1&verified=1&room=${room}&rate=jw`;
    document.getElementById('jw-donate-wrap').classList.remove('hidden');
  } else {
    document.getElementById('a2a19-panel').classList.remove('hidden');
    updateA2A19Panel();
    document.getElementById('a2a19-donate-btn').href = `payment.html?donate=1&verified=1&room=${room}&rate=a2a19`;
    document.getElementById('a2a19-donate-wrap').classList.remove('hidden');
  }
  updatePaymentNote(true);
  populatePaxSelect(room, type);
  recalc();
}

function getWeekRange() {
  const today = new Date();
  const day   = today.getDay();
  const mon   = new Date(today);
  mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sun   = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' });
  return `${fmt(mon)}–${fmt(sun)}`;
}

function updateA2A19Panel() {
  const room    = document.getElementById('room').value;
  const pax     = parseInt(document.getElementById('guests').value) || 0;
  const msgEl   = document.getElementById('a2a19-msg');
  if (!room || !pax) {
    msgEl.innerHTML = `<p class="disc-intro">A2/A19 discount applied.</p><p class="disc-info">Complete your booking — we'll verify your details and send your confirmation voucher to your email.</p>`;
    return;
  }
  const reg    = RATES[room]?.regular?.[pax] || 0;
  const jw     = RATES[room]?.jw?.[pax] || 0;
  const a2a19  = RATES[room]?.a2a19?.[pax] || 0;
  if (a2a19 < jw) {
    msgEl.innerHTML = `
      <p class="disc-congrats">✓ Volunteer rate — ₱${a2a19.toLocaleString()}/night</p>
      <p class="disc-info" style="margin-top:.6rem;">Submit your booking to hold your dates. If you can, a donation helps keep this place running for everyone.</p>`;
  } else {
    msgEl.innerHTML = `
      <p class="disc-congrats">✓ Volunteer rate — ₱${a2a19.toLocaleString()}/night</p>
      <p class="disc-info" style="margin-top:.6rem;">This is the lowest rate for this room and guest count. Submit your booking to hold your dates.</p>`;
  }
}

function updatePaymentNote(isVolunteer) {
  const note = document.getElementById('payment-note');
  if (!note) return;
  note.innerHTML = isVolunteer
    ? 'Payment is via GCash, Maya, or Bank transfer — send your screenshot via Messenger to confirm.<br>Check-in: 2:00 PM &nbsp;|&nbsp; Check-out: 12:00 NN'
    : 'Payment is via GCash, Maya, or Bank transfer — send your screenshot via Messenger to confirm.<br>Check-in: 2:00 PM &nbsp;|&nbsp; Check-out: 12:00 NN';
}

// ── Whole Space recommendation ───────────────────────────────────────────────
// D1 and D2 cap at 4 guests, so any party of 5+ must take the Whole Space.
// Show the nudge whenever an individual room is selected; hide for Whole Space.

function toggleWholeRec(room) {
  const rec = document.getElementById('whole-space-rec');
  if (!rec) return;
  rec.classList.toggle('hidden', !(room === 'd1' || room === 'd2'));
}

// ── Solo Share Waitlist ───────────────────────────────────────────────────────
// Show the opt-in for D1/D2 when 1–3 guests are booking, so they can opt in
// to share the room with another group and split the cost.

function toggleShareWaitlist() {
  const wrap = document.getElementById('share-waitlist');
  if (!wrap) return;
  const room   = document.getElementById('room').value;
  const guests = parseInt(document.getElementById('guests').value) || 0;
  const eligible = (room === 'd1' || room === 'd2') && guests >= 1 && guests <= 3;
  wrap.classList.toggle('hidden', !eligible);
  if (!eligible) document.getElementById('share-optin').checked = false;
}

function toggleExclusiveNote() {
  const el = document.getElementById('exclusive-note');
  if (!el) return;
  const room   = document.getElementById('room').value;
  const guests = parseInt(document.getElementById('guests').value) || 0;
  el.classList.toggle('hidden', !(room === 'whole' && guests >= 5));
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
  if (activeVoucherType === 'a2a19') updateA2A19Panel();

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

  const firstName = document.getElementById('firstName').value.trim();
  const lastName  = document.getElementById('lastName').value.trim();
  const name      = `${firstName} ${lastName}`.trim();
  const mobile   = document.getElementById('mobile').value.trim();
  const email    = document.getElementById('email').value.trim();
  const room     = document.getElementById('room').value;
  const checkin  = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const guests   = parseInt(document.getElementById('guests').value);
  const referral = document.getElementById('referral').value.trim();
  const requests = document.getElementById('requests').value.trim();

  if (!firstName) return showAlert('Please enter your first name.');
  if (!lastName)  return showAlert('Please enter your last name.');
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
    showAlert('Note: these dates may overlap with a recent booking from this device. Your request will still be submitted — our team will confirm availability.', 'info');
  }

  const shareWrap     = document.getElementById('share-waitlist');
  const shareWaitlist = !!(shareWrap && !shareWrap.classList.contains('hidden') && document.getElementById('share-optin').checked);

  const totalPrice = calcTotal(room, nights, guests, activeVoucherType);
  const tags = ['DES', 'DES-booked', `DES-${room}`];
  if (shareWaitlist) tags.push('DES-share-waitlist');

  const payload = {
    firstName, lastName, name, mobile, email, room, checkin, checkout,
    guests, discountType: activeVoucherType !== 'regular' ? activeVoucherType : '', referral, specialRequests: requests,
    totalPrice, nights, rateType: activeVoucherType,
    shareWaitlist: shareWaitlist ? 'yes' : '',
    tags: tags.join(','),
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    await postToWebhook(CONFIG.WEBHOOK_BOOKING, payload);

    saveBooking({ room, checkin, checkout, name, id: Date.now() });

    sessionStorage.setItem('des_booking_summary', JSON.stringify({
      name, email, mobile, room, checkin, checkout, guests, totalPrice, nights, rateType: activeVoucherType,
    }));

    const q = new URLSearchParams({
      name, email, room, checkin, checkout,
      nights: nights.toString(), guests: guests.toString(),
      totalPrice: totalPrice.toString(), rateType: activeVoucherType,
      verified: activeVoucherType !== 'regular' ? '1' : '0',
    }).toString();
    window.location.href = 'payment.html?' + q;
  } catch (err) {
    showAlert('Something went wrong. Please try again or contact us directly.');
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
});

// ── Wire up listeners ────────────────────────────────────────────────────────

document.getElementById('room').addEventListener('change', (e) => {
  if (!preVerified) {
    populatePaxSelect(e.target.value, 'regular');
    activeVoucherType = 'regular';
    const statusEl = document.getElementById('jw-ans-status');
    if (statusEl) { statusEl.className = 'voucher-status'; statusEl.textContent = ''; }
  } else {
    populatePaxSelect(e.target.value, activeVoucherType);
    const btnId = activeVoucherType === 'jw' ? 'jw-donate-btn' : 'a2a19-donate-btn';
    const donateBtn = document.getElementById(btnId);
    if (donateBtn) donateBtn.href = `payment.html?donate=1&verified=1&room=${e.target.value}&rate=${activeVoucherType}`;
  }
  toggleWholeRec(e.target.value);
  toggleShareWaitlist();
  toggleExclusiveNote();
  recalc();
});

const switchBtn = document.getElementById('switch-to-whole');
if (switchBtn) {
  switchBtn.addEventListener('click', () => {
    const roomSel = document.getElementById('room');
    roomSel.value = 'whole';
    roomSel.dispatchEvent(new Event('change'));
  });
}
document.getElementById('checkin').addEventListener('change', () => {
  const room = document.getElementById('room').value;
  if (room) populatePaxSelect(room, activeVoucherType);
  recalc();
});
document.getElementById('checkout').addEventListener('change', recalc);
document.getElementById('guests').addEventListener('change', () => { toggleShareWaitlist(); toggleExclusiveNote(); recalc(); });
document.getElementById('email').addEventListener('blur', (e) => {
  if (preVerified) return;
  const email = e.target.value.trim();
  if (!email) return;
  const rec = checkStoredVerification(email);
  if (rec) { saveVerification(rec.type, email); applyVerified(rec.type); }
});
// ── Discount checkbox listeners ───────────────────────────────────────────────

document.getElementById('jw-q').textContent =
  `What is the last song number for the ${getWeekRange()} midweek meeting?`;

document.getElementById('disc-jw').addEventListener('change', (e) => {
  const jwPanel    = document.getElementById('jw-panel');
  const a2Panel    = document.getElementById('a2a19-panel');
  const optJW      = document.getElementById('opt-jw');
  const optA2      = document.getElementById('opt-a2a19');
  const statusEl   = document.getElementById('jw-ans-status');

  if (e.target.checked) {
    document.getElementById('disc-a2a19').checked = false;
    optA2.classList.remove('selected');
    a2Panel.classList.add('hidden');
    jwPanel.classList.remove('hidden');
    optJW.classList.add('selected');
    activeVoucherType = 'regular';
    statusEl.className = 'voucher-status';
    statusEl.textContent = '';
    document.getElementById('jw-ans').value = '';
  } else {
    jwPanel.classList.add('hidden');
    optJW.classList.remove('selected');
    activeVoucherType = 'regular';
    document.getElementById('jw-donate-wrap').classList.add('hidden');
    updatePaymentNote(false);
  }
  const room = document.getElementById('room').value;
  populatePaxSelect(room, activeVoucherType);
  recalc();
});

document.getElementById('disc-a2a19').addEventListener('change', (e) => {
  const jwPanel  = document.getElementById('jw-panel');
  const a2Panel  = document.getElementById('a2a19-panel');
  const optJW    = document.getElementById('opt-jw');
  const optA2    = document.getElementById('opt-a2a19');

  if (e.target.checked) {
    document.getElementById('disc-jw').checked = false;
    optJW.classList.remove('selected');
    jwPanel.classList.add('hidden');
    a2Panel.classList.remove('hidden');
    optA2.classList.add('selected');
    activeVoucherType = 'a2a19';
    updateA2A19Panel();
    const donateWrap = document.getElementById('a2a19-donate-wrap');
    const donateBtn  = document.getElementById('a2a19-donate-btn');
    donateBtn.href = 'payment.html?donate=1&verified=1&room=' + document.getElementById('room').value + '&rate=a2a19';
    donateWrap.classList.remove('hidden');
    updatePaymentNote(true);
  } else {
    a2Panel.classList.add('hidden');
    optA2.classList.remove('selected');
    activeVoucherType = 'regular';
    document.getElementById('a2a19-donate-wrap').classList.add('hidden');
    updatePaymentNote(false);
  }
  const room = document.getElementById('room').value;
  populatePaxSelect(room, activeVoucherType);
  recalc();
});

document.getElementById('jw-ans').addEventListener('input', async (e) => {
  const code     = e.target.value.trim();
  const statusEl = document.getElementById('jw-ans-status');
  if (!code) { statusEl.className = 'voucher-status'; statusEl.textContent = ''; activeVoucherType = 'regular'; recalc(); return; }
  const result = await validateVoucher(code, '');
  if (result.valid && result.type === 'jw') {
    activeVoucherType = 'jw';
    saveVerification('jw', document.getElementById('email').value.trim());
    statusEl.className = 'voucher-status valid';
    statusEl.textContent = '✓ Correct — JW volunteer rate applied';
    const donateWrap = document.getElementById('jw-donate-wrap');
    const donateBtn  = document.getElementById('jw-donate-btn');
    donateBtn.href = 'payment.html?donate=1&verified=1&room=' + document.getElementById('room').value + '&rate=jw';
    donateWrap.classList.remove('hidden');
    updatePaymentNote(true);
  } else {
    activeVoucherType = 'regular';
    statusEl.className = 'voucher-status invalid';
    statusEl.textContent = '✗ Incorrect answer — try again';
    document.getElementById('jw-donate-wrap').classList.add('hidden');
    updatePaymentNote(false);
  }
  const room = document.getElementById('room').value;
  populatePaxSelect(room, activeVoucherType);
  recalc();
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
      toggleWholeRec(room);
      toggleShareWaitlist();
      toggleExclusiveNote();
      recalc();
    }
  }

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('checkin').min  = today;
  document.getElementById('checkout').min = today;

  document.getElementById('checkin').addEventListener('change', (e) => {
    document.getElementById('checkout').min = e.target.value;
  });

  const ssToken = sessionStorage.getItem('des_voucher_approved');
  if (ssToken) {
    sessionStorage.removeItem('des_voucher_approved');
    const token = JSON.parse(ssToken);
    saveVerification(token.type, '');
    applyVerified(token.type);
  } else {
    const lsRec = checkStoredVerification('');
    if (lsRec) applyVerified(lsRec.type);
  }
})();
