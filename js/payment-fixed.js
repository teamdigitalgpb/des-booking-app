// Booking Payment Flow — QR-based mobile payment handler
(function () {
  console.log('[Payment] Initializing payment.js');
  
  // ── Error handler ────────────────────────────────────────────────────────────
  function showError(message) {
    console.error('[Payment ERROR]', message);
    const el = document.querySelector('.form-card');
    if (!el) {
      document.body.innerHTML = '<div style="padding:2rem;color:red;font-family:sans-serif;"><h2>⚠️ Error</h2><p>' + message + '</p><a href="booking.html">← Back to Booking</a></div>';
      return;
    }
    el.innerHTML = '<div style="padding:2rem;background:#ffe6e6;border-radius:var(--radius);"><h2 style="color:var(--brown);">⚠️ Error</h2><p>' + message + '</p><a href="booking.html" style="color:var(--navy);text-decoration:underline;">← Back to Booking</a></div>';
  }

  // ── Check CONFIG ─────────────────────────────────────────────────────────────
  if (typeof CONFIG === 'undefined') {
    console.error('[Payment] CONFIG not loaded');
    showError('Configuration not loaded. Please refresh the page.');
    return;
  }

  // ── Parse URL parameters ────────────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const data = {
    name:       params.get('name')       || '',
    email:      params.get('email')      || '',
    room:       params.get('room')       || '',
    checkin:    params.get('checkin')    || '',
    checkout:   params.get('checkout')   || '',
    nights:     params.get('nights')     || '',
    guests:     params.get('guests')     || '',
    totalPrice: params.get('totalPrice') || '',
    rateType:   params.get('rateType')   || 'regular',
  };

  if (!data.room || !data.checkin) {
    console.error('[Payment] Missing required parameters');
    window.location.replace('booking.html');
    return;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const roomLabels = { d1: 'Room D1', d2: 'Room D2', whole: "D' Whole Space" };
  const rateLabels = {
    regular: 'Regular Rate',
    jw:      'JW Volunteer Rate — Discount Applied ✓',
    a2a19:   'A2/A19 Volunteer Rate — Discount Applied ✓',
  };
  const rateColors = { regular: 'var(--text-dark)', jw: '#1a7a4a', a2a19: '#1a7a4a' };
  const VOUCHER_A2A19 = 'ISA6:8';

  let donorData = {};
  let selectedMethod = '';

  function fmt(d) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function show(id) {
    ['pay-state-donor', 'pay-state-verify', 'pay-state-options', 'pay-state-qr'].forEach(s => {
      const el = document.getElementById(s);
      if (el) {
        if (s === id) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    });
  }

  function summaryHTML(includeRate) {
    const rateLabel = rateLabels[data.rateType] || 'Regular Rate';
    const rateColor = rateColors[data.rateType] || 'var(--text-dark)';
    return `
      <div class="row"><span>Name</span><strong>${data.name}</strong></div>
      <div class="row"><span>Room</span><strong>${roomLabels[data.room] || data.room}</strong></div>
      <div class="row"><span>Check-in</span><strong>${fmt(data.checkin)}</strong></div>
      <div class="row"><span>Check-out</span><strong>${fmt(data.checkout)}</strong></div>
      <div class="row"><span>Nights</span><strong>${data.nights}</strong></div>
      <div class="row"><span>Guests</span><strong>${data.guests}</strong></div>
      ${includeRate ? `<div class="row"><span>Rate</span><strong style="color:${rateColor};">${rateLabel}</strong></div>` : ''}
      <div class="row"><span>Total</span><strong style="color:var(--brown);font-size:1.1rem;">₱${Number(data.totalPrice).toLocaleString()}</strong></div>
    `;
  }

  function updateLocalBookingStatus(room, checkin, checkout, status) {
    try {
      const raw = localStorage.getItem('des_bookings') || '[]';
      const bookings = JSON.parse(raw);
      if (!Array.isArray(bookings)) return;
      const updated = bookings.map(b => {
        if (b.room === room && b.checkin === checkin && b.checkout === checkout) {
          return { ...b, status };
        }
        return b;
      });
      localStorage.setItem('des_bookings', JSON.stringify(updated));
    } catch (err) {
      // ignore
    }
  }

  // ── Initialize when DOM is ready ─────────────────────────────────────────────
  function initPayment() {
    try {
      console.log('[Payment] DOM ready, initializing...');
      
      const verified    = params.get('verified') === '1';
      const isDonate    = params.get('donate')   === '1';
      const needsVerify = !verified && !isDonate && (data.rateType === 'jw' || data.rateType === 'a2a19');

      if (needsVerify) {
        const qLabel = document.getElementById('jw-question-label');
        if (qLabel) qLabel.textContent = CONFIG.JW_QUESTION;
        if (data.rateType === 'a2a19') {
          document.getElementById('voucher-wrap').classList.remove('hidden');
        }
        document.getElementById('pay-summary-verify').innerHTML = summaryHTML(true);
        show('pay-state-verify');
      } else if (isDonate) {
        show('pay-state-donor');
      } else {
        document.getElementById('pay-summary-options').innerHTML = summaryHTML(true);
        show('pay-state-options');
      }

      // ── Donor continue button ────────────────────────────────────────────────
      const donorBtn = document.getElementById('donor-continue-btn');
      if (donorBtn) {
        donorBtn.addEventListener('click', () => {
          try {
            donorData = {
              name:    (document.getElementById('donor-name')?.value    || '').trim(),
              email:   (document.getElementById('donor-email')?.value   || '').trim(),
              message: (document.getElementById('donor-message')?.value || '').trim(),
            };
            document.getElementById('pay-options-heading').textContent  = 'Choose How to Pay';
            document.getElementById('pay-options-subtitle').textContent = 'Scan the QR and send any amount. Then send your screenshot via Messenger to confirm.';
            document.getElementById('pay-summary-options').style.display = 'none';
            show('pay-state-options');
          } catch (err) {
            showError('Error: ' + err.message);
          }
        });
      }

      // ── Verify button ────────────────────────────────────────────────────────
      const verifyBtn = document.getElementById('verify-btn');
      if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
          try {
            const alertEl  = document.getElementById('verify-alert');
            const answer   = (document.getElementById('jw-answer-input').value || '').trim().toLowerCase();
            const expected = (CONFIG.JW_ANSWER || '').trim().toLowerCase();
            const voucher  = (document.getElementById('voucher-input').value || '').trim().toUpperCase();

            alertEl.classList.add('hidden');

            if (!answer) {
              alertEl.textContent = 'Please answer the verification question.';
              alertEl.className   = 'alert alert-error';
              return;
            }
            if (answer !== expected) {
              alertEl.textContent = 'That answer is incorrect. Check the current week's song and try again.';
              alertEl.className   = 'alert alert-error';
              return;
            }
            if (data.rateType === 'a2a19') {
              if (!voucher) {
                alertEl.textContent = 'Please enter your A2/A19 voucher code.';
                alertEl.className   = 'alert alert-error';
                return;
              }
              if (voucher !== VOUCHER_A2A19) {
                alertEl.textContent = 'Voucher code is incorrect. Please check with your congregation coordinator.';
                alertEl.className   = 'alert alert-error';
                return;
              }
            }

            document.getElementById('pay-summary-options').innerHTML = summaryHTML(true);
            show('pay-state-options');
          } catch (err) {
            showError('Error verifying: ' + err.message);
          }
        });
      }

      // ── Payment method selection ─────────────────────────────────────────────
      document.querySelectorAll('.pay-card[data-method]').forEach(btn => {
        btn.addEventListener('click', () => {
          try {
            const method = btn.getAttribute('data-method');
            const qrMap  = { gcash: CONFIG.QR_GCASH, maya: CONFIG.QR_MAYA, bank: CONFIG.QR_BANK };
            const labels = { gcash: 'GCash', maya: 'Maya', bank: 'Bank / InstaPay' };

            selectedMethod = labels[method] || method;
            document.getElementById('pay-qr-title').textContent = 'Pay via ' + selectedMethod;
            document.getElementById('pay-qr-app').textContent   = selectedMethod;
            document.getElementById('pay-qr-amount').textContent = isDonate ? 'Any amount' : '₱' + Number(data.totalPrice).toLocaleString();

            const imgEl  = document.getElementById('pay-qr-image');
            const phEl   = document.getElementById('pay-qr-placeholder');
            const hintEl = document.getElementById('pay-qr-hint');
            const src    = qrMap[method] || '';

            if (src && !src.startsWith('PLACEHOLDER')) {
              imgEl.src = src;
              imgEl.classList.remove('hidden');
              phEl.classList.add('hidden');
            } else {
              imgEl.classList.add('hidden');
              phEl.classList.remove('hidden');
              hintEl.textContent = 'Expected at: ' + (src || 'assets/qr-' + method + '.png');
            }

            show('pay-state-qr');
          } catch (err) {
            showError('Error selecting payment method: ' + err.message);
          }
        });
      });

      // ── Back from QR ────────────────────────────────────────────────────────
      const qrBackBtn = document.getElementById('pay-qr-back');
      if (qrBackBtn) {
        qrBackBtn.addEventListener('click', () => show('pay-state-options'));
      }

      // ── Done — proceed to confirmation ───────────────────────────────────────
      const doneBtn = document.getElementById('pay-done-btn');
      if (doneBtn) {
        doneBtn.addEventListener('click', () => {
          try {
            if (!isDonate) {
              updateLocalBookingStatus(data.room, data.checkin, data.checkout, 'paid');
            }
            if (isDonate) {
              const webhookUrl = CONFIG.WEBHOOK_VOUCHER;
              if (webhookUrl && !webhookUrl.startsWith('PLACEHOLDER')) {
                fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify({
                    action:        'donation',
                    name:          donorData.name    || '',
                    email:         donorData.email   || '',
                    message:       donorData.message || '',
                    paymentMethod: selectedMethod    || '',
                  }),
                }).catch(() => {});
              }
            }
            window.location.href = 'thankyou-payment.html';
          } catch (err) {
            showError('Error completing payment: ' + err.message);
          }
        });
      }

      console.log('[Payment] Initialization complete');
    } catch (err) {
      console.error('[Payment] Init error:', err);
      showError('Error initializing payment page: ' + err.message);
    }
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayment);
  } else {
    initPayment();
  }
})();
