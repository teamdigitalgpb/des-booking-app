// Admin panel — blocked dates management (read + write)

let _blocks = [];

// ── Auth ──────────────────────────────────────────────────────────────────────

document.getElementById('gate-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('gate-password').value;
  if (pwd === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem('des_admin_auth', '1');
    showPanel();
  } else {
    const err = document.getElementById('gate-error');
    err.textContent = 'Incorrect password.';
    err.classList.remove('hidden');
  }
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
  sessionStorage.removeItem('des_admin_auth');
  location.reload();
});

if (sessionStorage.getItem('des_admin_auth') === '1') showPanel();

function showPanel() {
  document.getElementById('admin-gate').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  loadBlocks();
  document.dispatchEvent(new CustomEvent('des:admin-unlocked'));
}

// ── Load + render ─────────────────────────────────────────────────────────────

document.getElementById('refresh-btn').addEventListener('click', loadBlocks);

async function loadBlocks() {
  const url    = CONFIG.BLOCKED_DATES_CSV_URL;
  const listEl = document.getElementById('block-list');

  if (!url || url.startsWith('PLACEHOLDER')) {
    listEl.innerHTML = '<p class="empty-state">BLOCKED_DATES_CSV_URL not configured yet.</p>';
    return;
  }

  listEl.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res    = await fetch(url, { cache: 'no-store' });
    const csv    = await res.text();
    const lines  = csv.trim().split(/\r?\n/).slice(1);
    _blocks = lines
      .map(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        return { room: cols[0] || '', startDate: cols[1] || '', endDate: cols[2] || '', reason: cols[3] || '' };
      })
      .filter(b => b.room && b.startDate);
    renderBlocks();
    renderToggles();
  } catch {
    listEl.innerHTML = '<p class="empty-state" style="color:#b34040;">Could not load. Check your CSV URL.</p>';
  }
}

function renderBlocks() {
  const listEl = document.getElementById('block-list');
  if (!_blocks.length) {
    listEl.innerHTML = '<p class="empty-state">No dates blocked — the unit is fully open.</p>';
    return;
  }
  const roomLabel = { d1: 'Room D1', d2: 'Room D2', both: 'Both Rooms' };
  listEl.innerHTML = _blocks.map((b, i) => {
    const range = (b.endDate && b.endDate !== b.startDate)
      ? `${b.startDate} → ${b.endDate}`
      : b.startDate;
    return `
      <div class="block-row">
        <div style="display:flex;flex-direction:column;gap:.3rem;">
          <span class="block-room">${roomLabel[b.room] || b.room}</span>
          <span class="block-dates">${range}</span>
          ${b.reason ? `<span class="block-reason">${b.reason}</span>` : ''}
        </div>
        <button type="button" class="btn-remove" onclick="removeBlock(${i})">Remove</button>
      </div>`;
  }).join('');
}

// ── Add block ─────────────────────────────────────────────────────────────────

document.getElementById('add-block-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn       = document.getElementById('add-btn');
  const room      = document.getElementById('block-room').value;
  const startDate = document.getElementById('block-start').value;
  const endDate   = document.getElementById('block-end').value || startDate;
  const reason    = document.getElementById('block-reason').value.trim();

  if (!room)      { setStatus('Please select a room.', 'error');      return; }
  if (!startDate) { setStatus('Please select a start date.', 'error'); return; }

  btn.disabled = true; btn.textContent = 'Saving…';
  setStatus('', '');

  try {
    await postToWebhook(CONFIG.WEBHOOK_ADMIN, { action: 'addBlock', room, startDate, endDate, reason });
    e.target.reset();
    setStatus('Block saved. Refreshing…', 'ok');
    setTimeout(loadBlocks, 1500);
  } catch {
    setStatus('Failed to save. Please try again.', 'error');
  }

  btn.disabled = false; btn.textContent = 'Add Block';
});

// ── Remove block ──────────────────────────────────────────────────────────────

async function removeBlock(index) {
  const block = _blocks[index];
  if (!block) return;
  const range = (block.endDate && block.endDate !== block.startDate)
    ? `${block.startDate} to ${block.endDate}`
    : block.startDate;
  if (!confirm(`Remove block: ${(block.room || '').toUpperCase()} — ${range}?`)) return;

  setStatus('Removing…', '');
  try {
    await postToWebhook(CONFIG.WEBHOOK_ADMIN, {
      action: 'removeBlock', room: block.room, startDate: block.startDate, endDate: block.endDate || block.startDate,
    });
    setStatus('Block removed. Refreshing…', 'ok');
    setTimeout(loadBlocks, 1500);
  } catch {
    setStatus('Failed to remove. Please try again.', 'error');
  }
}

// ── Room Status Toggle ────────────────────────────────────────────────────────

function isRoomCurrentlyBlocked(room) {
  const today = new Date().toISOString().split('T')[0];
  return _blocks.some(b => {
    if (b.room !== room && b.room !== 'both') return false;
    const end = b.endDate || b.startDate;
    return b.startDate <= today && today <= end;
  });
}

function findActiveBlock(room) {
  const today = new Date().toISOString().split('T')[0];
  return _blocks.find(b => {
    if (b.room !== room) return false;
    const end = b.endDate || b.startDate;
    return b.startDate <= today && today <= end;
  });
}

function renderToggles() {
  ['d1', 'd2'].forEach(room => {
    const blocked = isRoomCurrentlyBlocked(room);
    const statusEl = document.getElementById(`status-${room}`);
    const btnEl    = document.getElementById(`btn-${room}`);
    const formEl   = document.getElementById(`form-${room}`);
    if (!statusEl) return;
    if (blocked) {
      const block = findActiveBlock(room);
      statusEl.textContent = `Unavailable${block?.reason ? ' — ' + block.reason : ''}`;
      statusEl.className   = 'toggle-status unavailable';
      btnEl.textContent    = 'Mark Available';
      btnEl.className      = 'btn-toggle unblock-room';
    } else {
      statusEl.textContent = 'Available';
      statusEl.className   = 'toggle-status available';
      btnEl.textContent    = 'Mark Unavailable';
      btnEl.className      = 'btn-toggle block-room';
    }
    formEl.classList.add('hidden');
  });
}

function toggleRoom(room) {
  const blocked = isRoomCurrentlyBlocked(room);
  if (blocked) {
    const idx = _blocks.findIndex(b => {
      const today = new Date().toISOString().split('T')[0];
      const end = b.endDate || b.startDate;
      return b.room === room && b.startDate <= today && today <= end;
    });
    if (idx >= 0) removeBlock(idx);
  } else {
    document.getElementById(`form-${room}`).classList.toggle('hidden');
  }
}

async function confirmBlock(room) {
  const today   = new Date().toISOString().split('T')[0];
  const reason  = document.getElementById(`reason-${room}`).value;
  const endDate = document.getElementById(`end-${room}`).value || '2099-12-31';
  setStatus('Saving…', '');
  try {
    await postToWebhook(CONFIG.WEBHOOK_ADMIN, {
      action: 'addBlock', room, startDate: today, endDate, reason,
    });
    setStatus('Room marked unavailable. Refreshing…', 'ok');
    setTimeout(loadBlocks, 1500);
  } catch {
    setStatus('Failed. Please try again.', 'error');
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function setStatus(msg, type) {
  const el = document.getElementById('admin-status');
  el.textContent = msg;
  el.className   = type === 'ok' ? 'status-ok' : type === 'error' ? 'status-error' : '';
}
