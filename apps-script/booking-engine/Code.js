// ═══════════════════════════════════════════════════════════════════════════
// D' Econo-Space — Booking Engine (attached to the admin Sheet)
//
// What it does
//   GET  ?action=availability  → per room, per date: reserved | booked
//                                (free dates are left out). Never names.
//   POST {action:'reserve',…}  → checks dates + price on the server, saves a
//                                24-hour reservation in the Bookings tab
//   expireHolds() (every 15 min) → unpaid reservations past 24h → "Expired"
//
// Source of truth
//   CURRENT OCCUPANCY STATUS  → 5 rows per day; slots 1–4 used (slot 5 legacy)
//   Rate table tab            → columns "JW" and "A2/A19"
//   Bookings tab              → website reservations
//
// This file lives in GitHub (apps-script/booking-engine). Edit it there and
// push with clasp; don't edit in the browser editor, or the copies drift.
// ═══════════════════════════════════════════════════════════════════════════

var SHEET_ID      = '1jRxAW-lICqF6ZCQGlWVhOJ1dcZNrjsIU6tU2dvLk_84';
var TZ            = 'Asia/Manila';
var ADMIN_EMAIL   = 'd.econospace.cebu@gmail.com';
var GRID_TAB      = 'CURRENT OCCUPANCY STATUS';
var BOOKINGS_TAB  = 'Bookings';
var HOLD_HOURS    = 24;
var MAX_NIGHTS    = 30;
var LOOKAHEAD_DAYS = 240;
var SLOTS_USED    = 4;                       // slot 5 is from the old 5-pax setup
var ROOM_COL      = { d1: 4, d2: 5 };        // 0-based: E = Room D1, F = Room D2
var MAX_PAX       = { d1: 4, d2: 4, whole: 8 };
var ROOM_LABEL    = { d1: 'Room D1', d2: 'Room D2', whole: "D' Whole Space" };
var CAPACITY      = { jw: 'JW', a2: 'A-2', a19: 'A-19' };

var STATUS_HOLD    = 'Reserved (24h)';
var STATUS_PAID    = 'Paid';
var STATUS_EXPIRED = 'Expired';

var EXTRA_COLUMNS = ['Email', 'Congregation', 'Sisters', 'Brothers', 'Capacity',
                     'Arrival', 'Departure', 'Purpose', 'Hold Expires', 'Source'];

// ── Entry points ────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'availability') return json_({ ok: true, rooms: availability_(true) });
    return json_({ ok: true, service: "D' Econo-Space booking engine" });
  } catch (err) {
    return json_({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.action === 'reserve') return json_(reserve_(data));
    return json_({ ok: false, error: 'Unknown request.' });
  } catch (err) {
    return json_({ ok: false, error: err.userMessage || 'Something went wrong. Please try again.' });
  }
}

// ── Availability ────────────────────────────────────────────────────────────

// Returns { d1: { 'YYYY-MM-DD': 'booked'|'reserved' }, d2: {…} }
function availability_(useCache) {
  var cache = CacheService.getScriptCache();
  if (useCache) {
    var hit = cache.get('availability');
    if (hit) return JSON.parse(hit);
  }
  var today = todayStr_();
  var last  = addDays_(today, LOOKAHEAD_DAYS);
  var rooms = { d1: {}, d2: {} };

  // 1. The occupancy grid (what the data manager types)
  var grid = sheet_(GRID_TAB).getDataRange().getDisplayValues();
  for (var i = 0; i < grid.length; i++) {
    var date = gridDate_(grid[i]);
    if (!date || date < today || date > last) continue;
    ['d1', 'd2'].forEach(function (room) {
      for (var s = 0; s < SLOTS_USED && i + s < grid.length; s++) {
        var cell = String(grid[i + s][ROOM_COL[room]] || '').trim();
        if (!cell) continue;
        var st = /^WR\b/i.test(cell) ? 'reserved' : 'booked';
        if (rooms[room][date] !== 'booked') rooms[room][date] = st;
      }
    });
  }

  // 2. Website reservations still on hold or paid
  var now = new Date();
  bookingRows_().forEach(function (b) {
    var st = b.status === STATUS_PAID ? 'booked'
           : (b.status === STATUS_HOLD && b.holdExpires && b.holdExpires > now) ? 'reserved'
           : null;
    if (!st || !b.checkin || !b.checkout) return;
    var targets = b.room === 'whole' ? ['d1', 'd2'] : [b.room];
    for (var d = b.checkin; d < b.checkout; d = addDays_(d, 1)) {
      if (d < today || d > last) continue;
      targets.forEach(function (r) {
        if (!r || !rooms[r]) return;
        if (rooms[r][d] !== 'booked') rooms[r][d] = st;
      });
    }
  });

  cache.put('availability', JSON.stringify(rooms), 60);
  return rooms;
}

// First row of each day has "Month YYYY" in A and the day number in B
function gridDate_(row) {
  var label = String(row[0] || '').trim();
  var day = parseInt(String(row[1] || '').trim(), 10);
  var m = label.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m || !day) return null;
  var month = ['january','february','march','april','may','june','july','august',
               'september','october','november','december'].indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  return m[2] + '-' + pad_(month + 1) + '-' + pad_(day);
}

// ── Reservations ────────────────────────────────────────────────────────────

function reserve_(d) {
  var room     = String(d.room || '').toLowerCase();
  var checkin  = String(d.checkin || '');
  var checkout = String(d.checkout || '');
  var sisters  = toInt_(d.sisters);
  var brothers = toInt_(d.brothers);
  var pax      = sisters + brothers;
  var cap      = String(d.capacity || '').toLowerCase();
  var name     = clean_(d.contactName, 80);
  var mobile   = clean_(d.mobile, 30);
  var email    = clean_(d.email, 120);

  if (!ROOM_LABEL[room])                       fail_('Please choose a room.');
  if (!isDate_(checkin) || !isDate_(checkout)) fail_('Please choose your dates.');
  if (checkin < todayStr_())                   fail_('Check-in can\'t be in the past.');
  if (checkout <= checkin)                     fail_('Check-out must be after check-in.');
  var nights = daysBetween_(checkin, checkout);
  if (nights > MAX_NIGHTS)                     fail_('For stays over ' + MAX_NIGHTS + ' nights, please message us on Messenger.');
  if (pax < 1 || pax > MAX_PAX[room])          fail_(ROOM_LABEL[room] + ' takes 1 to ' + MAX_PAX[room] + ' guests.');
  if (!CAPACITY[cap])                          fail_('Please choose JW, A-2 or A-19.');
  if (!name || !mobile || !email)              fail_('Please fill in your name, mobile number and email.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail_('Please check your email address.');
  rateLimit_(mobile);

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) fail_('Many people are booking right now. Please try again in a moment.');
  try {
    // Re-check availability inside the lock, with fresh data
    var rooms = availability_(false);
    var targets = room === 'whole' ? ['d1', 'd2'] : [room];
    for (var day = checkin; day < checkout; day = addDays_(day, 1)) {
      targets.forEach(function (r) {
        if (rooms[r][day]) fail_('Sorry, ' + ROOM_LABEL[room] + ' is no longer free on ' + day + '. Please pick other dates.');
      });
    }

    var nightly = rate_(room, pax, cap);
    var total   = nightly * nights;
    var expires = new Date(Date.now() + HOLD_HOURS * 3600 * 1000);
    var id      = nextBookingId_();

    writeBooking_({
      'Booking ID': id,
      'Booking Date': new Date(),
      'Check-in': checkin,
      'Check-out': checkout,
      'Full Name': name,
      'Gender': sisters + 'F ' + brothers + 'M',
      'Contact': mobile,
      'Room Type': ROOM_LABEL[room],
      'Pax': pax,
      'Payment Status': STATUS_HOLD,
      'Discount': CAPACITY[cap],
      'Amount': total,
      'Balance': total,
      'Notes': clean_(d.notes, 500),
      'Email': email,
      'Congregation': clean_(d.congregation, 120),
      'Sisters': sisters,
      'Brothers': brothers,
      'Capacity': CAPACITY[cap],
      'Arrival': clean_(d.eta, 20),
      'Departure': clean_(d.etd, 20),
      'Purpose': clean_(d.purpose, 300),
      'Hold Expires': expires,
      'Source': 'Website'
    });
    CacheService.getScriptCache().remove('availability');

    notifyAdmin_(id, room, checkin, checkout, nights, pax, sisters, brothers, cap, total, d);

    return {
      ok: true,
      bookingId: id,
      room: ROOM_LABEL[room],
      checkin: checkin,
      checkout: checkout,
      nights: nights,
      nightly: nightly,
      total: total,
      holdExpires: Utilities.formatDate(expires, TZ, "MMM d, yyyy 'at' h:mm a")
    };
  } finally {
    lock.releaseLock();
  }
}

function rate_(room, pax, cap) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var tab = ss.getSheets().filter(function (s) {
    return /RATE TABLE/i.test(String(s.getRange(1, 1).getDisplayValue()));
  })[0];
  if (!tab) fail_('Prices are being updated. Please message us on Messenger.');
  var v = tab.getDataRange().getDisplayValues();
  var h = -1;
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === 'Key') { h = i; break; }
  if (h < 0) fail_('Prices are being updated. Please message us on Messenger.');
  var col = v[h].map(function (x) { return String(x).trim(); })
                .indexOf(cap === 'jw' ? 'JW' : 'A2/A19');
  var key = ROOM_LABEL[room] + '|' + pax;
  for (var r = h + 1; r < v.length; r++) {
    if (String(v[r][0]).trim() === key) {
      var n = parseFloat(String(v[r][col]).replace(/[^\d.]/g, ''));
      if (n > 0) return n;
    }
  }
  fail_('Prices are being updated. Please message us on Messenger.');
}

// ── 24-hour expiry (time trigger) ───────────────────────────────────────────

function expireHolds() {
  var tab = sheet_(BOOKINGS_TAB);
  var v = tab.getDataRange().getValues();
  var h = headerMap_(v[0]);
  var now = new Date();
  var changed = false;
  for (var i = 1; i < v.length; i++) {
    var exp = v[i][h['Hold Expires']];
    if (v[i][h['Payment Status']] === STATUS_HOLD && exp instanceof Date && exp < now) {
      tab.getRange(i + 1, h['Payment Status'] + 1).setValue(STATUS_EXPIRED);
      changed = true;
    }
  }
  if (changed) CacheService.getScriptCache().remove('availability');
}

// ── One-time setup (safe to run again) ─────────────────────────────────────
// Run from the editor once: it asks Google for permission, adds the missing
// Bookings columns, applies the new rate headers, and starts the 15-min timer.

function setup() {
  ensureBookingColumns_();
  applyNewRateHeaders_();
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'expireHolds';
  });
  if (!exists) ScriptApp.newTrigger('expireHolds').timeBased().everyMinutes(15).create();
  Logger.log('Setup done.');
}

// Regular → JW, JW → A2/A19, old A2/A19 → retired (decided 2026-11-21)
function applyNewRateHeaders_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ss.getSheets().forEach(function (s) {
    if (!/RATE TABLE/i.test(String(s.getRange(1, 1).getDisplayValue()))) return;
    var v = s.getDataRange().getDisplayValues();
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][0]).trim() !== 'Key') continue;
      var row = v[i].map(function (x) { return String(x).trim(); });
      var reg = row.indexOf('Regular');
      if (reg < 0) return;                             // already done
      var jw = row.indexOf('JW'), a2 = row.indexOf('A2/A19');
      if (a2 >= 0) s.getRange(i + 1, a2 + 1).setValue('A2/A19 (old, retired)');
      if (jw >= 0) s.getRange(i + 1, jw + 1).setValue('A2/A19');
      s.getRange(i + 1, reg + 1).setValue('JW');
      return;
    }
  });
}

function ensureBookingColumns_() {
  var tab = sheet_(BOOKINGS_TAB);
  var head = tab.getRange(1, 1, 1, Math.max(tab.getLastColumn(), 1)).getValues()[0]
               .map(function (x) { return String(x).trim(); });
  var next = head.filter(String).length + 1;
  EXTRA_COLUMNS.forEach(function (c) {
    if (head.indexOf(c) < 0) {
      tab.getRange(1, next).setValue(c).setFontWeight('bold');
      next++;
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function bookingRows_() {
  var v = sheet_(BOOKINGS_TAB).getDataRange().getValues();
  if (v.length < 2) return [];
  var h = headerMap_(v[0]);
  return v.slice(1).map(function (r) {
    var label = String(r[h['Room Type']] || '').toLowerCase();
    return {
      room: label.indexOf('whole') >= 0 ? 'whole' : label.indexOf('d1') >= 0 ? 'd1' : label.indexOf('d2') >= 0 ? 'd2' : '',
      checkin: dateStr_(r[h['Check-in']]),
      checkout: dateStr_(r[h['Check-out']]),
      status: String(r[h['Payment Status']] || '').trim(),
      holdExpires: h['Hold Expires'] !== undefined && r[h['Hold Expires']] instanceof Date ? r[h['Hold Expires']] : null
    };
  });
}

function writeBooking_(obj) {
  ensureBookingColumns_();
  var tab = sheet_(BOOKINGS_TAB);
  var head = tab.getRange(1, 1, 1, tab.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim(); });
  var row = head.map(function (c) { return obj.hasOwnProperty(c) ? obj[c] : ''; });
  // Write below the last real booking (the tab has blank formula rows)
  var ids = tab.getRange(1, 1, tab.getLastRow(), 1).getValues();
  var last = 1;
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim()) last = i + 1;
  tab.getRange(last + 1, 1, 1, row.length).setValues([row]);
}

function nextBookingId_() {
  var ids = sheet_(BOOKINGS_TAB).getRange('A:A').getValues();
  var max = 0;
  ids.forEach(function (r) {
    var m = String(r[0]).match(/^BK-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'BK-' + ('00' + (max + 1)).slice(-3);
}

function notifyAdmin_(id, room, ci, co, nights, pax, sis, bro, cap, total, d) {
  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: 'New reservation ' + id + ': ' + ROOM_LABEL[room] + ', ' + ci + ' to ' + co,
      htmlBody:
        '<p><b>' + id + '</b> is reserved for 24 hours, waiting for payment.</p>' +
        '<p>' + ROOM_LABEL[room] + ' · ' + ci + ' → ' + co + ' (' + nights + ' night' + (nights > 1 ? 's' : '') + ')<br>' +
        pax + ' guest(s): ' + sis + ' sister(s), ' + bro + ' brother(s) · ' + CAPACITY[cap] + '<br>' +
        'Total: ₱' + total.toLocaleString() + '</p>' +
        '<p>Contact: ' + esc_(d.contactName) + ' · ' + esc_(d.mobile) + ' · ' + esc_(d.email) + '<br>' +
        'Congregation: ' + esc_(d.congregation) + '</p>' +
        '<p>Details are in the Bookings tab.</p>'
    });
  } catch (err) { /* booking still stands if email fails */ }
}

function rateLimit_(key) {
  var cache = CacheService.getScriptCache();
  var k = 'rl_' + String(key).replace(/\D/g, '');
  var n = parseInt(cache.get(k) || '0', 10);
  if (n >= 5) fail_('Too many reservations from this number. Please message us on Messenger.');
  cache.put(k, String(n + 1), 3600);
}

function sheet_(name) {
  var s = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!s) throw new Error('Missing tab: ' + name);
  return s;
}
function headerMap_(row) { var m = {}; row.forEach(function (c, i) { m[String(c).trim()] = i; }); return m; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail_(msg) { var e = new Error(msg); e.userMessage = msg; throw e; }
function clean_(s, max) { return String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function esc_(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toInt_(n) { n = parseInt(n, 10); return isNaN(n) || n < 0 ? 0 : n; }
function pad_(n) { return ('0' + n).slice(-2); }
function isDate_(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function todayStr_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function dateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  var s = String(v || '').trim();
  if (isDate_(s)) return s;
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);           // M/D/YYYY
  return m ? m[3] + '-' + pad_(m[1]) + '-' + pad_(m[2]) : '';
}
function addDays_(s, n) {
  var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween_(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000); }
