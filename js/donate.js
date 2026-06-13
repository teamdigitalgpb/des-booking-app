// Donation flow: form → payment method selection → QR or external link

const urlParams = new URLSearchParams(window.location.search);
const donRoom   = urlParams.get('room') || '';
const donRate   = urlParams.get('rate') || '';

const METHODS = {
  gcash:  { label: 'GCash',  app: 'GCash',  type: 'qr',   qr: () => CONFIG.QR_GCASH  },
  maya:   { label: 'Maya',   app: 'Maya',   type: 'qr',   qr: () => CONFIG.QR_MAYA   },
  bank:   { label: 'Bank · InstaPay', app: 'your banking', type: 'qr', qr: () => CONFIG.QR_BANK },
  paypal: { label: 'PayPal', app: 'PayPal', type: 'link', link: () => CONFIG.LINK_PAYPAL },
  wise:   { label: 'Wise',   app: 'Wise',   type: 'link', link: () => CONFIG.LINK_WISE   },
};

function showState(id) {
  ['donate-state-form', 'donate-state-payment', 'donate-state-qr', 'donate-state-fallback', 'donate-state-thankyou']
    .forEach(s => {
      const el = document.getElementById(s);
      if (!el) return;
      if (s === id) el.classList.remove('hidden');
      else          el.classList.add('hidden');
    });
}

// ── Form submit ────────────────────────────────────────────────────────────

document.getElementById('donate-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('don-name').value.trim();
  const email   = document.getElementById('don-email').value.trim();
  const purpose = document.getElementById('don-purpose').value.trim();

  if (!name)    { showAlert('Please enter your full name.');              return; }
  if (!email)   { showAlert('Please enter your email address.');          return; }
  if (!purpose) { showAlert('Please enter the purpose of your donation.'); return; }

  const btn = document.getElementById('don-submit');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  // Fire webhook in background — never block the payment flow
  postToWebhook(CONFIG.WEBHOOK_DONATION, {
    name, email, purpose, room: donRoom, rateType: donRate,
    tags: 'DES,DES-donation',
  }).catch(() => {});

  showState('donate-state-payment');
});

// ── Payment method click ────────────────────────────────────────────────────

document.querySelectorAll('.pay-card').forEach(card => {
  card.addEventListener('click', () => {
    const method = METHODS[card.dataset.method];
    if (!method) return;

    if (method.type === 'link') {
      const url = method.link();
      if (url && !url.startsWith('PLACEHOLDER')) {
        window.open(url, '_blank', 'noopener');
        showState('donate-state-thankyou');
      } else {
        alert(`${method.label} link not yet configured. Please contact us directly.`);
      }
      return;
    }

    // QR method
    const qrPath = method.qr();
    document.getElementById('qr-title').textContent    = method.label;
    document.getElementById('qr-app-name').textContent = method.app;
    const img  = document.getElementById('qr-image');
    const miss = document.getElementById('qr-placeholder');
    const hint = document.getElementById('qr-path-hint');

    img.style.display  = 'block';
    miss.classList.add('hidden');
    img.src = qrPath;
    img.onerror = () => {
      img.style.display = 'none';
      hint.textContent  = qrPath;
      miss.classList.remove('hidden');
    };

    showState('donate-state-qr');
  });
});

// ── Back from QR ────────────────────────────────────────────────────────────

document.getElementById('qr-back').addEventListener('click', () => {
  showState('donate-state-payment');
});

// ── Done — donation complete ──────────────────────────────────────────────────

document.getElementById('donate-done-btn').addEventListener('click', () => {
  showState('donate-state-thankyou');
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function showAlert(msg) {
  const el = document.getElementById('donate-alert');
  el.textContent = msg;
  el.className   = 'alert alert-error';
}
