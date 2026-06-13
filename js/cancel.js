(function () {
  const params   = new URLSearchParams(location.search);
  const name     = params.get('name')     || '';
  const email    = params.get('email')    || '';
  const room     = params.get('room')     || '';
  const checkin  = params.get('checkin')  || '';
  const checkout = params.get('checkout') || '';

  const roomLabels = { d1: 'Room D1', d2: 'Room D2', whole: "D' Whole Space" };

  function fmt(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function show(id) {
    ['cancel-state-expired', 'cancel-state-form', 'cancel-state-success'].forEach(s => {
      document.getElementById(s).classList.toggle('hidden', s !== id);
    });
  }

  function withinWindow() {
    if (!checkin) return false;
    const deadline = new Date(checkin + 'T14:00:00').getTime() - 12 * 60 * 60 * 1000;
    return Date.now() < deadline;
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  if (!withinWindow()) {
    show('cancel-state-expired');
    return;
  }

  // Populate summary
  const box = document.getElementById('cancel-summary-box');
  box.innerHTML = `
    <div class="row"><span>Name</span><strong>${name}</strong></div>
    ${email ? `<div class="row"><span>Email</span><strong>${email}</strong></div>` : ''}
    <div class="row"><span>Room</span><strong>${roomLabels[room] || room}</strong></div>
    <div class="row"><span>Check-in</span><strong>${fmt(checkin)}</strong></div>
    <div class="row"><span>Check-out</span><strong>${fmt(checkout)}</strong></div>
  `;

  show('cancel-state-form');

  // ── Confirm cancellation ──────────────────────────────────────────────────
  document.getElementById('cancel-confirm-btn').addEventListener('click', async () => {
    if (!withinWindow()) {
      show('cancel-state-expired');
      return;
    }

    const reason = document.getElementById('cancel-reason').value;
    const btn    = document.getElementById('cancel-confirm-btn');
    const alert  = document.getElementById('cancel-alert');

    btn.disabled    = true;
    btn.textContent = 'Cancelling…';
    alert.classList.add('hidden');

    const payload = {
      name, email, room, checkin, checkout,
      reason: reason || 'Not specified',
      action: 'cancel',
      tags:   'DES,DES-cancelled',
    };

    try {
      if (CONFIG.WEBHOOK_CANCELLATION && CONFIG.WEBHOOK_CANCELLATION !== 'PLACEHOLDER_paste_cancellation_webhook_url') {
        await fetch(CONFIG.WEBHOOK_CANCELLATION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      document.getElementById('cancel-email-note').textContent =
        email ? `A confirmation has been sent to ${email}.` : '';

      show('cancel-state-success');
    } catch (err) {
      btn.disabled    = false;
      btn.textContent = 'Yes, Cancel My Booking';
      alert.textContent = 'Something went wrong. Please try again or contact us directly.';
      alert.className   = 'alert alert-error';
    }
  });
})();
