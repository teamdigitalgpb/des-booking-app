// Booking form — pricing, conflict check, server API submit & Google Sheets sync

let _bookingSubmitted = false;
let _donationReservation = false;

const RATES = {
  d1: {
    regular: { 1: 650,  2: 650,  3: 850,  4: 950  },
    jw:      { 1: 500,  2: 600,  3: 750,  4: 900  },
    a2a19:   { 1: 400,  2: 550,  3: 700,  4: 850  },
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
  if (!checkin || !checkout) return 0;
  const d1 = new Date(checkin + 'T12:00:00+08:00');
  const d2 = new Date(checkout + 'T12:00:00+08:00');
  return Math.round((d2 - d1) / 86400000);
}

// ── Timezone-Safe Date Helpers (Asia/Manila) ──────────────────────────────────

function getTodayDateStr() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

function normalizeDateStr(val) {
  if (!val) return '';
  const clean = String(val).trim().split('T')[0];
  const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const m = ('0' + match[2]).slice(-2);
    const d = ('0' + match[3]).slice(-2);
    return `${match[1]}-${m}-${d}`;
  }
  return clean;
}

// ── Pax Select Builder ────────────────────────────────────────────────────────

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

// ── Availability & Conflict Management ────────────────────────────────────────

let _serverBookings = [];
let _blockedDates = { d1: new Set(), d2: new Set(), both: new Set() };

async function fetchAvailability() {
  // 1. Fetch live availability from Google Apps Script if configured
  if (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_URL) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAvailability`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (Array.isArray(data.bookings)) {
            _serverBookings = data.bookings.map(b => ({
              ...b,
              room: (String(b.room || '').toLowerCase().indexOf('d1') !== -1) ? 'd1' : (String(b.room || '').toLowerCase().indexOf('d2') !== -1) ? 'd2' : (String(b.room || '').toLowerCase().indexOf('whole') !== -1) ? 'whole' : String(b.room || '').toLowerCase(),
              checkin: normalizeDateStr(b.checkin),
              checkout: normalizeDateStr(b.checkout),
              status: String(b.status || 'booked').toLowerCase()
            }));
          }

          if (Array.isArray(data.blocks)) {
            _blockedDates = { d1: new Set(), d2: new Set(), both: new Set() };
            data.blocks.forEach(b => {
              const rawRoom = (b.room || 'both').toLowerCase();
              const start = normalizeDateStr(b.startDate || b.startdate);
              const end = normalizeDateStr(b.endDate || b.enddate || start);
              if (!start) return;

              const roomKey = rawRoom.includes('d1') ? 'd1' : rawRoom.includes('d2') ? 'd2' : rawRoom.includes('both') ? 'both' : 'both';
              if (!_blockedDates[roomKey]) _blockedDates[roomKey] = new Set();

              let cur = new Date(start + 'T12:00:00+08:00');
              const endDate = new Date(end + 'T12:00:00+08:00');
              while (cur <= endDate) {
                const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
                _blockedDates[roomKey].add(ymd);
                cur.setDate(cur.getDate() + 1);
              }
            });
          }
          recalc();
          return;
        }
      }
    } catch (e) {
      // Continue to CSV fallback
    }
  }

  // 2. Fallback: load directly from configured CSVs
  fetchBlockedDates();
}

function fetchBlockedDates() {
  const url = CONFIG.BLOCKED_DATES_CSV_URL;
  if (!url || url.startsWith('PLACEHOLDER')) return;
  fetch(url, { cache: 'no-store' })
    .then(r => r.text())
    .then(csv => {
      const lines = csv.trim().split(/\r?\n/).slice(1);
      lines.forEach(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const [room, startStr, endStr] = cols;
        if (!room || !startStr) return;
        const key = room.toLowerCase();
        if (!_blockedDates[key]) _blockedDates[key] = new Set();
        const start = normalizeDateStr(startStr);
        const end   = normalizeDateStr(endStr || startStr);
        if (!start) return;
        let cur = new Date(start + 'T12:00:00+08:00');
        const endDate = new Date(end + 'T12:00:00+08:00');
        while (cur <= endDate) {
          const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
          _blockedDates[key].add(ymd);
          cur.setDate(cur.getDate() + 1);
        }
      });
      recalc();
    })
    .catch(() => {});
}

function isRoomClosed(room, date) {
  const closures = (typeof CONFIG !== 'undefined' && CONFIG.ROOM_CLOSURES) || [];
  return closures.some(c =>
    (c.room === room || room === 'whole') &&
    date >= c.from && (!c.until || date <= c.until));
}

function isDateBlocked(room, date) {
  if (isRoomClosed(room, date)) return true;
  if (_blockedDates.both?.has(date)) return true;
  if (room === 'd1')    return !!_blockedDates.d1?.has(date);
  if (room === 'd2')    return !!_blockedDates.d2?.has(date);
  if (room === 'whole') return !!_blockedDates.d1?.has(date) || !!_blockedDates.d2?.has(date);
  return false;
}

function isRangeBlocked(room, checkin, checkout) {
  if (!checkin) return false;
  const end = checkout || checkin;
  let cur = new Date(checkin + 'T12:00:00+08:00');
  const endDate = new Date(end + 'T12:00:00+08:00');
  const isSameDay = checkin === end;

  // Nights stayed are [checkin, checkout)
  while (isSameDay ? cur <= endDate : cur < endDate) {
    const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    if (isDateBlocked(room, ymd)) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

// ── LocalStorage Booking Cache Helpers ────────────────────────────────────────

function cleanupPendingBookings() {
  try {
    const raw = localStorage.getItem('des_bookings') || '[]';
    const bookings = JSON.parse(raw);
    if (!Array.isArray(bookings)) return;

    const now = Date.now();
    const valid = bookings.filter(b => {
      if (!b || !b.room || !b.checkin || !b.checkout) return false;
      if (b.status === 'pending' && b.createdAt) {
        const age = now - new Date(b.createdAt).getTime();
        return age < 48 * 60 * 60 * 1000;
      }
      return true;
    });

    if (valid.length !== bookings.length) {
      localStorage.setItem('des_bookings', JSON.stringify(valid));
    }
  } catch (err) {
    localStorage.removeItem('des_bookings');
  }
}

function getLocalBookings() {
  cleanupPendingBookings();
  return JSON.parse(localStorage.getItem('des_bookings') || '[]');
}

function getAllBookings() {
  const local = getLocalBookings();
  const all = [..._serverBookings];

  local.forEach(lb => {
    const rm = String(lb.room || '').toLowerCase();
    const ci = normalizeDateStr(lb.checkin);
    const co = normalizeDateStr(lb.checkout);
    const exists = all.some(b => b.room === rm && b.checkin === ci && b.checkout === co);
    if (!exists && ci && co) {
      all.push({
        room: rm,
        checkin: ci,
        checkout: co,
        status: lb.status || 'pending',
        name: lb.name || ''
      });
    }
  });

  return all;
}

// ── Strict Double-Booking & Overlap Check ──────────────────────────────────────

function hasConflict(room, checkin, checkout) {
  if (!room || !checkin || !checkout) return false;
  const bookings = getAllBookings();

  return bookings.some(b => {
    const st = String(b.status || '').toLowerCase().trim();
    if (st === 'declined' || st === 'cancelled') return false;

    // 24-hour hold expiration check: Unpaid 'new' or 'pending' reservations expire after 24 hours
    if ((st === 'new' || st === 'pending') && b.timestamp) {
      const bookedTime = new Date(b.timestamp).getTime();
      if (!isNaN(bookedTime) && (Date.now() - bookedTime) > 24 * 60 * 60 * 1000) {
        return false; // Released after 24 hours!
      }
    }

    const bRoom = String(b.room || '').toLowerCase().trim();

    // Overlap applies when:
    // - same room (d1 with d1, d2 with d2)
    // - either booking is 'whole' (since whole occupies both d1 and d2)
    const isConflictRoom = (bRoom === room) ||
                           (bRoom === 'whole') ||
                           (room === 'whole' && (bRoom === 'd1' || bRoom === 'd2' || bRoom === 'whole'));

    if (!isConflictRoom) return false;

    const bIn = normalizeDateStr(b.checkin);
    const bOut = normalizeDateStr(b.checkout);
    if (!bIn || !bOut) return false;

    // Check-in and check-out intervals: [checkin, checkout) and [bIn, bOut)
    return (checkin < bOut && checkout > bIn);
  });
}

function saveBooking(data) {
  const bookings = getLocalBookings();
  bookings.push(data);
  localStorage.setItem('des_bookings', JSON.stringify(bookings));
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

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

  const roomLabels = { d1: 'Room D1', d2: 'Room D2', whole: "D' Whole Space" };
  const discountNote = rateType === 'a2a19' ? ' · A2/A19 volunteer rate' : rateType === 'jw' ? ' · JW volunteer rate' : '';

  const breakdown = `${roomLabels[room] || room} · ${nights} night${nights > 1 ? 's' : ''} · ${pax} guest${pax > 1 ? 's' : ''}${discountNote}`;

  document.getElementById('price-total').textContent = `₱${total.toLocaleString()}`;
  document.getElementById('price-breakdown').textContent = breakdown;
  display.style.display = 'block';
}

// ── Discount Eligibility ──────────────────────────────────────────────────────

let activeVoucherType = 'regular';
let preVerified       = false;

function normalizeAnswer(s) {
  return String(s || '').replace(/\D/g, '');
}

function isA2JWAnswerValid(code) {
  if (!CONFIG.JW_ANSWER || CONFIG.JW_ANSWER === 'PLACEHOLDER_update_every_monday') return false;
  return normalizeAnswer(code) === normalizeAnswer(CONFIG.JW_ANSWER);
}

function updateA2A19Validation() {
  const jwAns = document.getElementById('a2a19-jw-ans').value.trim();
  const acct  = document.getElementById('a2a19-acct').value.trim();
  const jwStatus = document.getElementById('a2a19-jw-ans-status');
  const acctStatus = document.getElementById('a2a19-acct-status');
  const msgEl = document.getElementById('a2a19-msg');
  const donateWrap = document.getElementById('a2a19-donate-wrap');
  const donateBtn  = document.getElementById('a2a19-donate-btn');
  const room = document.getElementById('room').value;

  const jwValid = jwAns ? isA2JWAnswerValid(jwAns) : false;
  const acctValid = /^\d{7}$/.test(acct);

  if (jwAns) {
    jwStatus.className = jwValid ? 'voucher-status valid' : 'voucher-status invalid';
    jwStatus.textContent = jwValid ? '✓ Correct song number' : '✗ Incorrect song number';
  } else {
    jwStatus.className = 'voucher-status';
    jwStatus.textContent = '';
  }

  if (acct) {
    acctStatus.className = acctValid ? 'voucher-status valid' : 'voucher-status invalid';
    acctStatus.textContent = acctValid ? '✓ Account number looks good' : 'Please enter a 7-digit account number.';
  } else {
    acctStatus.className = 'voucher-status';
    acctStatus.textContent = '';
  }

  if (jwValid && acctValid) {
    activeVoucherType = 'a2a19';
    msgEl.style.display = '';
    updateA2A19Panel();
    donateBtn.href = `payment.html?donate=1&verified=1&room=${room}&rate=a2a19`;
    donateWrap.classList.remove('hidden');
    updatePaymentNote(true);
  } else {
    activeVoucherType = 'regular';
    msgEl.style.display = 'none';
    donateWrap.classList.add('hidden');
    updatePaymentNote(false);
  }

  populatePaxSelect(room, activeVoucherType);
  recalc();
}

function applyVerified(type) {
  preVerified = true;
  activeVoucherType = type;
  const discGroup = document.querySelector('.disc-checks')?.closest('.form-group');
  if (discGroup) discGroup.style.display = 'none';
  const room = document.getElementById('room').value;
  if (type === 'jw') {
    document.getElementById('jw-panel').classList.remove('hidden');
    document.querySelector('#jw-panel .disc-intro').style.display = 'none';
    document.getElementById('jw-q').style.display = 'none';
    document.getElementById('jw-ans').style.display = 'none';
    const statusEl = document.getElementById('jw-ans-status');
    statusEl.className   = 'voucher-status valid';
    statusEl.textContent = '✓ Verified — JW volunteer rate applied';
    document.getElementById('jw-donate-btn').href = `payment.html?donate=1&verified=1&room=${room}&rate=jw`;
    document.getElementById('jw-donate-wrap').classList.remove('hidden');
  } else {
    document.getElementById('a2a19-panel').classList.remove('hidden');
    document.getElementById('a2a19-gate').style.display = 'none';
    document.getElementById('a2a19-msg').style.display = '';
    updateA2A19Panel();
    document.getElementById('a2a19-donate-btn').href = `payment.html?donate=1&verified=1&room=${room}&rate=a2a19`;
    document.getElementById('a2a19-donate-wrap').classList.remove('hidden');
  }
  updatePaymentNote(true);
  populatePaxSelect(room, type);
  recalc();
}

function updateA2A19Panel() {
  const room    = document.getElementById('room').value;
  const pax     = parseInt(document.getElementById('guests').value) || 0;
  const msgEl   = document.getElementById('a2a19-msg');
  if (!room || !pax) {
    msgEl.innerHTML = `<p class="disc-intro">A2/A19 discount applied.</p><p class="disc-info">Complete your booking — we'll verify your details and send your confirmation voucher to your email.</p>`;
    return;
  }
  const a2a19  = RATES[room]?.a2a19?.[pax] || 0;
  msgEl.innerHTML = `
    <p class="disc-congrats">✓ Volunteer rate — ₱${a2a19.toLocaleString()}/night</p>
    <p class="disc-info" style="margin-top:.6rem;">Submit your booking to hold your dates. If you can, a donation helps keep this place running for everyone.</p>`;
}

function updatePaymentNote(isVolunteer) {
  const note = document.getElementById('payment-note');
  if (!note) return;
  note.innerHTML = 'Payment is via GCash, Maya, or Bank transfer — send your screenshot via Messenger to confirm.<br>Check-in: 2:00 PM &nbsp;|&nbsp; Check-out: 12:00 NN<br>Arriving before 2:00 PM? Your stay counts from the night before — e.g. arriving 5:00 AM on the 15th means booking the 14th as your check-in date.';
}

function toggleWholeRec(room) {
  const rec = document.getElementById('whole-space-rec');
  if (!rec) return;
  rec.classList.toggle('hidden', !(room === 'd1' || room === 'd2'));
}

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

// ── Recalc on Field Changes ───────────────────────────────────────────────────

function recalc() {
  const room     = document.getElementById('room').value;
  const checkin  = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const pax      = parseInt(document.getElementById('guests').value) || 0;

  // D2 is an independent room — hide any legacy coupling warning
  const d2WarnEl = document.getElementById('d2-availability-warning');
  if (d2WarnEl) d2WarnEl.classList.add('hidden');

  if (!checkin || !checkout) {
    document.getElementById('price-display').style.display = 'none';
    return;
  }
  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) {
    document.getElementById('price-display').style.display = 'none';
    return;
  }

  updatePriceDisplay(room, nights, pax, activeVoucherType);
  if (activeVoucherType === 'a2a19') updateA2A19Panel();

  let hasDateConflict = false;
  let isBlocked = false;

  if (room && checkin && checkout) {
    hasDateConflict = hasConflict(room, checkin, checkout);
    isBlocked = isRangeBlocked(room, checkin, checkout);
  }

  const conflictWarnEl = document.getElementById('conflict-warning');
  if (conflictWarnEl) {
    conflictWarnEl.classList.toggle('hidden', !hasDateConflict);
  }

  const blockedWarnEl = document.getElementById('blocked-dates-warning');
  if (blockedWarnEl) {
    blockedWarnEl.classList.toggle('hidden', !isBlocked);
  }

  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = hasDateConflict || isBlocked;
  }
}

// ── Form Submit: Secure Server-Side Sync ──────────────────────────────────────

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
  const arrivalTime   = document.getElementById('arrivalTime')?.value || '14:00';
  const departureTime = document.getElementById('departureTime')?.value || '12:00';
  const guests   = parseInt(document.getElementById('guests').value, 10);
  const femaleGuests = parseInt(document.getElementById('femaleGuests').value, 10);
  const maleGuests   = parseInt(document.getElementById('maleGuests').value, 10);
  const referral = document.getElementById('referral').value.trim();
  const requests = document.getElementById('requests').value.trim();

  // Field validations
  if (!firstName) return showAlert('Please enter your first name.');
  if (!lastName)  return showAlert('Please enter your last name.');
  if (!mobile)    return showAlert('Please enter your mobile number.');
  if (!email)     return showAlert('Please enter your email address.');
  if (!room)      return showAlert('Please select a room.');
  if (!checkin)   return showAlert('Please select a check-in date.');
  if (!checkout)  return showAlert('Please select a check-out date.');
  if (!guests)    return showAlert('Please select the number of guests.');
  if (Number.isNaN(femaleGuests) || femaleGuests < 0) return showAlert('Please enter the number of female guests.');
  if (Number.isNaN(maleGuests) || maleGuests < 0) return showAlert('Please enter the number of male guests.');
  if (femaleGuests + maleGuests !== guests) return showAlert('The number of female and male guests must add up to your total guest count.');

  const nights = nightsBetween(checkin, checkout);
  if (nights < 1) return showAlert('Check-out must be after check-in.');

  if (document.getElementById('disc-a2a19')?.checked && activeVoucherType !== 'a2a19') {
    return showAlert('Please answer the song number and enter your A2/A19 account number to apply the volunteer rate.');
  }

  // Double-booking check: block immediately if selected dates are reserved
  if (hasConflict(room, checkin, checkout)) {
    return showAlert('The dates you selected are already reserved for this room. Please choose different dates or select another room.');
  }

  if (isRangeBlocked(room, checkin, checkout)) {
    return showAlert('These dates are not available for booking (closed for maintenance or private event). Please choose different dates.');
  }

  const shareWrap     = document.getElementById('share-waitlist');
  const shareWaitlist = !!(shareWrap && !shareWrap.classList.contains('hidden') && document.getElementById('share-optin').checked);
  const totalPrice    = calcTotal(room, nights, guests, activeVoucherType);

  const payload = {
    action: 'booking',
    firstName, lastName, name, mobile, email, room, checkin, checkout,
    arrivalTime, departureTime,
    guests, femaleGuests, maleGuests,
    discountType: activeVoucherType !== 'regular' ? activeVoucherType : '',
    referral, specialRequests: requests,
    totalPrice, nights, rateType: activeVoucherType,
    shareWaitlist: shareWaitlist ? 'yes' : '',
    bookingType: _donationReservation ? 'donation-reservation' : '',
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting Booking…';

  try {
    const webhookUrl = CONFIG.WEBHOOK_BOOKING || CONFIG.APPS_SCRIPT_URL;
    const result = await postToWebhook(webhookUrl, payload);

    if (result && result.error) {
      throw new Error(result.error);
    }

    _bookingSubmitted = true;

    // Save to local cache so calendar reflects it immediately on this device
    saveBooking({
      id: result?.bookingId || ('DES-' + Date.now()),
      room,
      checkin,
      checkout,
      name,
      guests,
      pax: guests,
      status: result?.status || 'New',
      createdAt: new Date().toISOString(),
    });

    // Populate session storage for thankyou page
    sessionStorage.removeItem('des_voucher_approved');
    sessionStorage.setItem('des_booking_summary', JSON.stringify({
      name, email, mobile, room, checkin, checkout, arrivalTime, departureTime, guests, totalPrice, nights,
      rateType: activeVoucherType,
      verified: activeVoucherType !== 'regular' ? '1' : '0',
      donation: _donationReservation ? '1' : '0',
      bookingId: result?.bookingId || '',
    }));
    sessionStorage.setItem('des_booking_submitted', JSON.stringify({
      timestamp: Date.now(), room, checkin,
    }));

    window.location.href = 'thankyou-booking.html';
  } catch (err) {
    console.error('[Booking Submit Error]', err);
    showAlert(err.message || 'Something went wrong while submitting your booking. Please try again or contact us directly.');
    btn.disabled = false;
    btn.textContent = 'Submit Reservation Request';
  }
});

// ── Wire Up Event Listeners ───────────────────────────────────────────────────

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

// Discount Checkboxes
document.getElementById('disc-jw')?.addEventListener('change', (e) => {
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
    document.getElementById('jw-q').textContent = CONFIG.JW_QUESTION;
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

document.getElementById('disc-a2a19')?.addEventListener('change', (e) => {
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
    document.getElementById('a2a19-jw-q').textContent = CONFIG.JW_QUESTION;
    document.getElementById('a2a19-jw-ans').value = '';
    document.getElementById('a2a19-acct').value = '';
    const jwStatus = document.getElementById('a2a19-jw-ans-status');
    const acctStatus = document.getElementById('a2a19-acct-status');
    jwStatus.className = 'voucher-status';
    jwStatus.textContent = '';
    acctStatus.className = 'voucher-status';
    acctStatus.textContent = '';
    document.getElementById('a2a19-msg').style.display = 'none';
    document.getElementById('a2a19-donate-wrap').classList.add('hidden');
    activeVoucherType = 'regular';
    updatePaymentNote(false);
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

document.getElementById('a2a19-acct')?.addEventListener('input', updateA2A19Validation);
document.getElementById('a2a19-jw-ans')?.addEventListener('input', updateA2A19Validation);

document.getElementById('jw-ans')?.addEventListener('input', async (e) => {
  const code     = e.target.value.trim();
  const statusEl = document.getElementById('jw-ans-status');
  if (!code) { statusEl.className = 'voucher-status'; statusEl.textContent = ''; activeVoucherType = 'regular'; recalc(); return; }
  const result = await validateVoucher(code, '');
  if (result.valid && result.type === 'jw') {
    activeVoucherType = 'jw';
    sessionStorage.setItem('des_voucher_approved', JSON.stringify({ type: 'jw' }));
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

// ── Initialization ────────────────────────────────────────────────────────────

(function () {
  // Guard against accidental double-submission within 15 minutes
  const prevSubmit = sessionStorage.getItem('des_booking_submitted');
  if (prevSubmit) {
    try {
      const sub = JSON.parse(prevSubmit);
      if (Date.now() - (sub.timestamp || 0) < 15 * 60 * 1000) {
        const alertEl = document.getElementById('booking-alert');
        if (alertEl) {
          alertEl.innerHTML = 'You recently submitted a reservation request. Check your email, or <a href="#" style="color:var(--navy);font-weight:700;text-decoration:underline;" onclick="event.preventDefault();sessionStorage.removeItem(\'des_booking_submitted\');location.reload();">start another booking</a>.';
          alertEl.className = 'alert alert-info';
          alertEl.classList.remove('hidden');
        }
      } else {
        sessionStorage.removeItem('des_booking_submitted');
      }
    } catch (e) {
      sessionStorage.removeItem('des_booking_submitted');
    }
  }

  const params  = new URLSearchParams(window.location.search);
  const room    = params.get('room');
  const guests  = params.get('guests');

  _donationReservation = params.get('donation') === '1';
  if (_donationReservation) {
    const banner = document.getElementById('donation-rec');
    if (banner) banner.classList.remove('hidden');
  }

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
    }
  }

  // Set min dates using Asia/Manila current date
  const today = getTodayDateStr();
  document.getElementById('checkin').min  = today;
  document.getElementById('checkout').min = today;

  document.getElementById('checkin').addEventListener('change', (e) => {
    document.getElementById('checkout').min = e.target.value;
  });

  const ssToken = sessionStorage.getItem('des_voucher_approved');
  if (ssToken) {
    const token = JSON.parse(ssToken);
    applyVerified(token.type);
    if (token.firstName) document.getElementById('firstName').value = token.firstName;
    if (token.lastName)  document.getElementById('lastName').value  = token.lastName;
    if (token.mobile)    document.getElementById('mobile').value    = token.mobile;
    if (token.email)     document.getElementById('email').value     = token.email;
  }

  // Load live availability and blocked dates
  fetchAvailability();
})();

// ── Abandoned Booking Follow-Up ───────────────────────────────────────────────

window.addEventListener('pagehide', () => {
  if (_bookingSubmitted) return;
  const email = document.getElementById('email')?.value.trim();
  if (!email) return;
  const payload = JSON.stringify({
    action: 'bookingAbandoned',
    firstName: document.getElementById('firstName')?.value.trim() || '',
    lastName:  document.getElementById('lastName')?.value.trim()  || '',
    mobile:    document.getElementById('mobile')?.value.trim()    || '',
    email,
    room:      document.getElementById('room')?.value             || '',
    checkin:   document.getElementById('checkin')?.value          || '',
    checkout:  document.getElementById('checkout')?.value         || '',
  });

  const webhook = CONFIG.APPS_SCRIPT_URL || CONFIG.WEBHOOK_ADMIN;
  navigator.sendBeacon(webhook, new Blob([payload], { type: 'text/plain;charset=utf-8' }));
});
