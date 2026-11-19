// Shared calendar engine — reads /api/availability, Google Apps Script, and Google Sheets CSVs
(function () {

  const ROOM_LABELS    = { d1: 'Room D1', d2: 'Room D2' };
  const ROOM_KEYS      = ['d1', 'd2'];
  const ROOM_CAPACITY  = { d1: 4, d2: 4, whole: 8 };

  let _blocks   = [];
  let _bookings = [];
  let _isAdmin  = false;
  let _year, _month;

  // ── Timezone-Safe Date Helpers (Asia/Manila UTC+8) ───────────────────────────

  // Format year, month (0-11), day as 'YYYY-MM-DD' without UTC conversion
  function formatYMD(y, m, d) {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  // Get current date string in Asia/Manila timezone
  function getTodayYMD() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch (e) {
      const now = new Date();
      return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  // Normalize any date representation to 'YYYY-MM-DD'
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

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/[\s\-_]/g, ''));
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj  = {};
      headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
      return obj;
    }).filter(r => Object.values(r).some(v => v));
  }

  function loadLocalBookings() {
    try {
      const raw = localStorage.getItem('des_bookings') || '[]';
      const bookings = JSON.parse(raw);
      if (!Array.isArray(bookings)) return [];

      const now = Date.now();
      const valid = bookings.filter(b => {
        if (!b || !b.room || !b.checkin || !b.checkout) return false;
        // Keep non-pending or recent bookings (within 30 days)
        if (b.status === 'pending' && b.createdAt) {
          const age = now - new Date(b.createdAt).getTime();
          return age < 48 * 60 * 60 * 1000;
        }
        return true;
      });

      if (valid.length !== bookings.length) {
        localStorage.setItem('des_bookings', JSON.stringify(valid));
      }

      return valid;
    } catch (err) {
      return [];
    }
  }

  // ── Data Loading: Server API with Resilient Fallbacks ─────────────────────────

  async function loadData() {
    _blocks = [];
    _bookings = [];
    const fetches = [];

    // 1. Google Apps Script direct GET
    if (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_URL) {
      fetches.push(
        fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAvailability`, { cache: 'no-store' })
          .then(r => r.json())
          .then(data => {
            if (data && data.success) {
              if (Array.isArray(data.bookings)) _bookings.push(...data.bookings.map(normalizeBooking));
              if (Array.isArray(data.blocks)) _blocks.push(...data.blocks);
            }
          })
          .catch(() => {})
      );
    }

    // 2. Blocked dates CSV
    if (typeof CONFIG !== 'undefined' && CONFIG.BLOCKED_DATES_CSV_URL && !CONFIG.BLOCKED_DATES_CSV_URL.startsWith('PL')) {
      fetches.push(
        fetch(CONFIG.BLOCKED_DATES_CSV_URL, { cache: 'no-store' })
          .then(r => r.text())
          .then(t => {
            const parsed = parseCSV(t);
            parsed.forEach(p => {
              _blocks.push({
                room: (p.room || '').toLowerCase(),
                startDate: normalizeDateStr(p.startdate || p.start || ''),
                endDate: normalizeDateStr(p.enddate || p.end || p.startdate || ''),
                reason: p.reason || ''
              });
            });
          })
          .catch(() => {})
      );
    }

    // 3. Bookings CSV if published
    if (typeof CONFIG !== 'undefined' && CONFIG.BOOKINGS_CALENDAR_CSV_URL && !CONFIG.BOOKINGS_CALENDAR_CSV_URL.startsWith('PL')) {
      fetches.push(
        fetch(CONFIG.BOOKINGS_CALENDAR_CSV_URL, { cache: 'no-store' })
          .then(r => r.text())
          .then(t => {
            const parsed = parseCSV(t);
            _bookings.push(...parsed.map(normalizeBooking));
          })
          .catch(() => {})
      );
    }

    await Promise.all(fetches);

    // 4. Merge Local Bookings (from current device/session)
    const localBookings = loadLocalBookings();
    if (localBookings.length) {
      localBookings.forEach(lb => {
        const norm = normalizeBooking(lb);
        const exists = _bookings.some(b =>
          b.room === norm.room && b.checkin === norm.checkin && b.checkout === norm.checkout
        );
        if (!exists) _bookings.push(norm);
      });
    }
  }

  function normalizeBooking(b) {
    const rawRoom = String(b.room || b.roomKey || '').toLowerCase().trim();
    const room = (rawRoom.indexOf('d1') !== -1) ? 'd1' : (rawRoom.indexOf('d2') !== -1) ? 'd2' : (rawRoom.indexOf('whole') !== -1) ? 'whole' : rawRoom;
    return {
      id: b.id || b.bookingid || '',
      room: room,
      checkin: normalizeDateStr(b.checkin || b['check-in'] || b['checkindate'] || b['check_in']),
      checkout: normalizeDateStr(b.checkout || b['check-out'] || b['checkoutdate'] || b['check_out']),
      guestname: b.guestname || b.guestName || b.name || '',
      status: String(b.status || 'booked').toLowerCase().trim(),
      pax: parseInt(b.pax || b.guests || '1', 10) || 1
    };
  }

  // ── Status Logic ─────────────────────────────────────────────────────────────

  // Date d is in range [start, end] inclusive for admin blocks
  function inBlockRange(dateStr, start, end) {
    if (!start) return false;
    const s = normalizeDateStr(start);
    const e = normalizeDateStr(end || start);
    return dateStr >= s && dateStr <= e;
  }

  // Booking covers night where checkin <= dateStr < checkout
  function getBookingForDate(dateStr, room) {
    return _bookings.find(b => {
      const rm = b.room;
      // Room match logic:
      // - room 'd1' matches bookings for 'd1' or 'whole'
      // - room 'd2' matches bookings for 'd2' or 'whole'
      // - room 'whole' matches bookings for 'd1', 'd2', or 'whole'
      const isRoomMatch = (rm === room) ||
                          (rm === 'whole') ||
                          (room === 'whole' && (rm === 'd1' || rm === 'd2' || rm === 'whole'));
      if (!isRoomMatch) return false;

      if (b.status === 'declined' || b.status === 'cancelled') return false;

      const ci = b.checkin;
      const co = b.checkout;
      if (!ci || !co) return false;

      // Guest stays from check-in date up to (exclusive) check-out date
      return dateStr >= ci && dateStr < co;
    }) || null;
  }

  function getStatus(dateStr, room) {
    // 1. Admin blocks check
    const blocked = _blocks.some(b => {
      const rm = (b.room || '').toLowerCase().trim();
      const isMatch = (rm === room) || (rm === 'both') ||
                      (rm === 'whole' && (room === 'd1' || room === 'd2')) ||
                      (room === 'whole' && (rm === 'd1' || rm === 'd2' || rm === 'both' || rm === 'whole'));
      return isMatch && inBlockRange(dateStr, b.startDate || b.startdate, b.endDate || b.enddate);
    });
    if (blocked) return 'blocked';

    // 2. Active bookings check
    const bk = getBookingForDate(dateStr, room);
    if (bk) {
      const st = bk.status;
      if (st === 'pending') return 'pending';
      if (st === 'declined' || st === 'cancelled') return 'available';
      return 'booked';
    }

    return 'available';
  }

  function getBookingInfo(dateStr, room) {
    if (room === 'whole') {
      return getBookingForDate(dateStr, 'whole') || getBookingForDate(dateStr, 'd1') || getBookingForDate(dateStr, 'd2');
    }
    return getBookingForDate(dateStr, room);
  }

  function getBookedPax(dateStr, room) {
    let total = 0;
    _bookings.forEach(b => {
      const rm = b.room;
      const isRoomMatch = (rm === room) || (rm === 'whole') ||
                          (room === 'whole' && (rm === 'd1' || rm === 'd2' || rm === 'whole'));
      if (!isRoomMatch) return;
      if (b.status === 'declined' || b.status === 'cancelled') return;

      if (b.checkin && b.checkout && dateStr >= b.checkin && dateStr < b.checkout) {
        total += (b.pax || 1);
      }
    });
    return total;
  }

  function getAvailablePax(dateStr, room) {
    if (room === 'whole') return null;
    const capacity = ROOM_CAPACITY[room] || 4;
    const booked = getBookedPax(dateStr, room);
    return Math.max(0, capacity - booked);
  }

  // ── Month Rendering ──────────────────────────────────────────────────────────

  function renderMonth(year, month, containerId) {
    _year  = year;
    _month = month;

    const el = document.getElementById(containerId);
    if (!el) return;

    const todayYMD = getTodayYMD();
    const first    = new Date(year, month, 1);
    const last     = new Date(year, month + 1, 0);

    // Mon-based offset
    let offset = first.getDay() - 1;
    if (offset < 0) offset = 6;

    const monthLabel = first.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    let html = `
      <div class="cal-header">
        <button type="button" class="cal-nav" onclick="calNav('${containerId}',-1)" aria-label="Previous month">&#8249;</button>
        <span class="cal-month-label">${monthLabel}</span>
        <button type="button" class="cal-nav" onclick="calNav('${containerId}',1)" aria-label="Next month">&#8250;</button>
      </div>

      <div class="cal-legend">
        <span><span class="cp available"></span> Available</span>
        <span><span class="cp booked"></span> Booked</span>
        <span><span class="cp pending"></span> Pending</span>
        <span><span class="cp blocked"></span> Closed</span>
      </div>

      <div class="cal-grid">
        <div class="cal-dow">Mo</div><div class="cal-dow">Tu</div><div class="cal-dow">We</div>
        <div class="cal-dow">Th</div><div class="cal-dow">Fr</div><div class="cal-dow">Sa</div>
        <div class="cal-dow">Su</div>
    `;

    for (let i = 0; i < offset; i++) html += '<div class="cal-cell cal-empty"></div>';

    for (let d = 1; d <= last.getDate(); d++) {
      const dateStr = formatYMD(year, month, d);
      const isPast  = dateStr < todayYMD;
      const isToday = dateStr === todayYMD;

      let cellCls = 'cal-cell';
      if (isPast)  cellCls += ' cal-past';
      if (isToday) cellCls += ' cal-today';

      let pips = '';
      let tooltipParts = [];

      ROOM_KEYS.forEach(r => {
        const st   = isPast ? 'past' : getStatus(dateStr, r);
        const info = (_isAdmin && !isPast) ? getBookingInfo(dateStr, r) : null;

        let tip = ROOM_LABELS[r] + ': ';
        if (isPast) {
          tip += 'past';
        } else if (st === 'available') {
          tip += 'available';
          const availPax = getAvailablePax(dateStr, r);
          if (availPax !== null) tip += ` (${availPax} pax open)`;
        } else if (st === 'blocked') {
          tip += 'closed';
        } else {
          tip += st;
          if (info && info.guestname) tip += ' — ' + info.guestname;
          if (info && info.status)    tip += ' [' + info.status + ']';
        }
        tooltipParts.push(tip);
        pips += `<span class="cp ${st}" aria-label="${tip}"></span>`;
      });

      const tooltip = tooltipParts.join(' | ');

      html += `<div class="${cellCls}" title="${tooltip}">
        <span class="cal-day-num${isToday ? ' cal-today-num' : ''}">${d}</span>
        <div class="cal-pips">${pips}</div>
      </div>`;
    }

    html += '</div>';

    // Room key explanation
    html += `<div class="cal-roomkey">
      <span class="roomkey-item"><span class="cp booked"></span><span class="cp available"></span> Room D1</span>
      <span class="roomkey-item"><span class="cp available"></span><span class="cp booked"></span> Room D2</span>
      <span class="roomkey-item"><span class="cp booked"></span><span class="cp booked"></span> Whole Space</span>
      <small>— left dot: D1 · right dot: D2</small>
    </div>`;

    el.innerHTML = html;
  }

  // ── Public Calendar API ──────────────────────────────────────────────────────

  window.initCalendar = async function (containerId, isAdmin) {
    _isAdmin = !!isAdmin;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<p class="cal-loading">Loading availability calendar…</p>';
    await loadData();
    const now = new Date();
    renderMonth(now.getFullYear(), now.getMonth(), containerId);
  };

  window.calNav = function (containerId, dir) {
    _month += dir;
    if (_month > 11) { _month = 0;  _year++; }
    if (_month < 0)  { _month = 11; _year--; }
    renderMonth(_year, _month, containerId);
  };

  window.refreshCalendar = async function (containerId) {
    await loadData();
    if (_year !== undefined && _month !== undefined) {
      renderMonth(_year, _month, containerId || 'cal-public');
    }
  };

  // Expose loaded bookings and blocks for availability conflict checking in booking.js
  window.getCalendarData = function () {
    return {
      bookings: [..._bookings],
      blocks: [..._blocks]
    };
  };

  window.getManilaToday = getTodayYMD;

})();
