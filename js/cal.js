// Shared calendar engine — reads BLOCKED_DATES_CSV + optional BOOKINGS_CALENDAR_CSV
(function () {

  const ROOM_LABELS    = { d1: 'Room D1', d2: 'Room D2' };
  const ROOM_KEYS      = ['d1', 'd2'];
  const ROOM_CAPACITY  = { d1: 4, d2: 4, whole: 8 };

  let _blocks   = [];
  let _bookings = [];
  let _isAdmin  = false;
  let _year, _month;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function ymd(d) { return d.toISOString().slice(0, 10); }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, ''));
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
        if (b.status === 'pending' && b.createdAt) {
          const age = now - new Date(b.createdAt).getTime();
          return age < 24 * 60 * 60 * 1000;
        }
        return true;
      });

      if (valid.length !== bookings.length) {
        localStorage.setItem('des_bookings', JSON.stringify(valid));
      }

      return valid;
    } catch (err) {
      localStorage.removeItem('des_bookings');
      return [];
    }
  }

  async function loadData() {
    const fetches = [];

    if (CONFIG.BLOCKED_DATES_CSV_URL && !CONFIG.BLOCKED_DATES_CSV_URL.startsWith('PL')) {
      fetches.push(
        fetch(CONFIG.BLOCKED_DATES_CSV_URL, { cache: 'no-store' })
          .then(r => r.text()).then(t => { _blocks = parseCSV(t); }).catch(() => {})
      );
    }

    if (CONFIG.BOOKINGS_CALENDAR_CSV_URL && !CONFIG.BOOKINGS_CALENDAR_CSV_URL.startsWith('PL')) {
      fetches.push(
        fetch(CONFIG.BOOKINGS_CALENDAR_CSV_URL, { cache: 'no-store' })
          .then(r => r.text()).then(t => { _bookings = parseCSV(t); }).catch(() => {})
      );
    }

    await Promise.all(fetches);
    const localBookings = loadLocalBookings();
    if (localBookings.length) {
      _bookings = _bookings.concat(localBookings);
    }
  }

  function inRange(date, start, end) {
    if (!start) return false;
    const d = ymd(date);
    return d >= start && (end ? d <= end : d === start);
  }

  // ── Status logic ─────────────────────────────────────────────────────────────

  function getBookingForDate(date, room) {
    const d = ymd(date);
    return _bookings.find(b => {
      const rm = (b.room || '').toLowerCase();
      const hit = rm === room || (room !== 'whole' && rm === 'whole');
      if (!hit) return false;
      const ci = b.checkin  || b['check-in']  || b['checkindate']  || '';
      const co = b.checkout || b['check-out'] || b['checkoutdate'] || '';
      return ci && co && d >= ci && d < co;
    }) || null;
  }

  function getStatus(date, room) {
    // Admin blocks
    const blocked = _blocks.some(b => {
      const rm = (b.room || '').toLowerCase();
      const hit = rm === room || rm === 'both' ||
                  ((room === 'd1' || room === 'd2') && rm === 'whole');
      const s = b.startdate || b['start date'] || '';
      const e = b.enddate   || b['end date']   || '';
      return hit && inRange(date, s, e);
    });
    if (blocked) return 'blocked';

    const bk = getBookingForDate(date, room);
    if (bk) {
      const status = bk.status || 'booked';
      return ['available', 'blocked', 'pending'].includes(status) ? status : 'booked';
    }

    return 'available';
  }

  function getBookingInfo(date, room) {
    if (room === 'whole') {
      return getBookingForDate(date, 'whole') || getBookingForDate(date, 'd1') || getBookingForDate(date, 'd2');
    }
    return getBookingForDate(date, room);
  }

  function getBookedPax(date, room) {
    const d = ymd(date);
    let total = 0;
    _bookings.forEach(b => {
      const rm = (b.room || '').toLowerCase();
      const hit = rm === room || (room !== 'whole' && rm === 'whole');
      if (!hit) return;
      const ci = b.checkin  || b['check-in']  || b['checkindate']  || '';
      const co = b.checkout || b['check-out'] || b['checkoutdate'] || '';
      if (ci && co && d >= ci && d < co) {
        const pax = parseInt(b.pax || b.guests || b['number of guests'] || '1', 10) || 1;
        if (!isNaN(pax)) total += pax;
      }
    });
    return total;
  }

  function getAvailablePax(date, room) {
    if (room === 'whole') return null;
    const capacity = ROOM_CAPACITY[room] || 4;
    const booked = getBookedPax(date, room);
    return Math.max(0, capacity - booked);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  function renderMonth(year, month, containerId) {
    _year  = year;
    _month = month;

    const el = document.getElementById(containerId);
    if (!el) return;

    const today    = new Date();
    const todayYMD = ymd(today);
    const first    = new Date(year, month, 1);
    const last     = new Date(year, month + 1, 0);

    // Mon-based offset
    let offset = first.getDay() - 1;
    if (offset < 0) offset = 6;

    const monthLabel = first.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    let html = `
      <div class="cal-header">
        <button class="cal-nav" onclick="calNav('${containerId}',-1)">&#8249;</button>
        <span class="cal-month-label">${monthLabel}</span>
        <button class="cal-nav" onclick="calNav('${containerId}',1)">&#8250;</button>
      </div>

      <div class="cal-legend">
        <span><span class="cp available"></span> Available</span>
        <span><span class="cp booked"></span> Booked</span>
        <span><span class="cp pending"></span> Pending payment</span>
        <span><span class="cp blocked"></span> Closed</span>
      </div>

      <div class="cal-grid">
        <div class="cal-dow">Mo</div><div class="cal-dow">Tu</div><div class="cal-dow">We</div>
        <div class="cal-dow">Th</div><div class="cal-dow">Fr</div><div class="cal-dow">Sa</div>
        <div class="cal-dow">Su</div>
    `;

    for (let i = 0; i < offset; i++) html += '<div class="cal-cell cal-empty"></div>';

    for (let d = 1; d <= last.getDate(); d++) {
      const date    = new Date(year, month, d);
      const dateStr = ymd(date);
      const isPast  = dateStr < todayYMD;
      const isToday = dateStr === todayYMD;

      let cellCls = 'cal-cell';
      if (isPast)  cellCls += ' cal-past';
      if (isToday) cellCls += ' cal-today';

      let pips = '';
      let tooltip = '';

      ROOM_KEYS.forEach(r => {
        const st   = isPast ? 'past' : getStatus(date, r);
        const info = (_isAdmin && !isPast) ? getBookingInfo(date, r) : null;

        let tip = ROOM_LABELS[r] + ': ';
        if (isPast)            tip += 'past';
        else if (st === 'available') {
          tip += 'available';
          const availPax = getAvailablePax(date, r);
          if (availPax !== null) {
            tip += ` — ${availPax} pax available`;
          }
        }
        else if (st === 'blocked')   tip += 'closed';
        else {
          tip += st;
          if (info && info.guestname) tip += ' — ' + info.guestname;
          if (info && info.status)    tip += ' (' + info.status + ')';
          const booked = getBookedPax(date, r);
          const avail = getAvailablePax(date, r);
          if (booked > 0 && avail !== null && avail > 0) {
            tip += ` — ${avail} pax still available`;
          }
        }
        tooltip += (tooltip ? ' | ' : '') + tip;
        pips += `<span class="cp ${st}" aria-label="${tip}"></span>`;
      });

      html += `<div class="${cellCls}" title="${tooltip}">
        <span class="cal-day-num${isToday ? ' cal-today-num' : ''}">${d}</span>
        <div class="cal-pips">${pips}</div>
      </div>`;
    }

    html += '</div>';

    // Room key
    html += `<div class="cal-roomkey">
      <span class="roomkey-item"><span class="cp booked"></span><span class="cp available"></span> Room D1</span>
      <span class="roomkey-item"><span class="cp available"></span><span class="cp booked"></span> Room D2</span>
      <span class="roomkey-item"><span class="cp booked"></span><span class="cp booked"></span> Whole Space</span>
      <small>— left to right per date</small>
    </div>`;

    // Admin note if booking CSV not yet configured
    if (_isAdmin && (!CONFIG.BOOKINGS_CALENDAR_CSV_URL || CONFIG.BOOKINGS_CALENDAR_CSV_URL.startsWith('PL'))) {
      html += `<div class="cal-setup-note">
        📋 <strong>Guest bookings not yet connected.</strong>
        Publish the <em>Booking Calendar</em> tab from the Google Sheet as CSV, then add the URL to
        <code>CONFIG.BOOKINGS_CALENDAR_CSV_URL</code> in <code>js/config.js</code>.
        Currently showing admin-blocked dates only.
      </div>`;
    }

    el.innerHTML = html;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  window.initCalendar = async function (containerId, isAdmin) {
    _isAdmin = !!isAdmin;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<p class="cal-loading">Loading calendar…</p>';
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

})();
