// Donation flow: form → payment method selection → QR or external link

const urlParams = new URLSearchParams(window.location.search);
const donRoom   = urlParams.get('room') || '';
const donRate   = urlParams.get('rate') || '';

const METHODS = {
  gcash: { label: 'GCash',          app: 'GCash',          type: 'qr',   qr: () => CONFIG.QR_GCASH },
  maya:  { label: 'Maya',           app: 'Maya',           type: 'qr',   qr: () => CONFIG.QR_MAYA  },
  bank:  { label: 'Bank / InstaPay', app: 'your banking',  type: 'qr',   qr: () => CONFIG.QR_BANK  },
  wise:  { label: 'Wise',           app: 'Wise',           type: 'link', link: () => CONFIG.LINK_WISE },
};

// Stored between form submit and Done/link click
let _donor          = {};
let _selectedMethod = '';

function showState(id) {
  ['donate-state-form', 'donate-state-payment', 'donate-state-qr',
   'donate-state-fallback', 'donate-state-thankyou'].forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    if (s === id) el.classList.remove('hidden');
    else          el.classList.add('hidden');
  });
}

// ── Form submit — store data, show payment methods ────────────────────────────

document.getElementById('donate-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const name    = document.getElementById('don-name').value.trim();
  const email   = document.getElementById('don-email').value.trim();
  const purpose = document.getElementById('don-purpose').value.trim();
  const amount  = document.getElementById('don-amount').value.trim();

  if (!name)    { showAlert('Please enter your full name.');               return; }
  if (!email)   { showAlert('Please enter your email address.');           return; }
  if (!purpose) { showAlert('Please enter the purpose of your donation.'); return; }

  _donor          = { name, email, purpose, amount };
  _selectedMethod = '';

  showState('donate-state-payment');
});

// ── Payment method click ──────────────────────────────────────────────────────

document.querySelectorAll('.pay-card').forEach(card => {
  card.addEventListener('click', () => {
    const method = METHODS[card.dataset.method];
    if (!method) return;
    _selectedMethod = method.label;

    if (method.type === 'link') {
      const url = method.link();
      if (url && !url.startsWith('PLACEHOLDER')) {
        window.open(url, '_blank', 'noopener');
        fireDonationWebhook();
        showState('donate-state-thankyou');
      } else {
        alert(method.label + ' link not yet configured. Please contact us directly.');
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

    img.style.display = 'block';
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

// ── Back from QR ─────────────────────────────────────────────────────────────

document.getElementById('qr-back').addEventListener('click', () => {
  showState('donate-state-payment');
});

// ── Done — fire webhook then show thank you ───────────────────────────────────

document.getElementById('donate-done-btn').addEventListener('click', () => {
  fireDonationWebhook();
  showState('donate-state-thankyou');
});

// ── Webhook ───────────────────────────────────────────────────────────────────

function fireDonationWebhook() {
  postToWebhook(CONFIG.WEBHOOK_DONATION, {
    action:        'donation',
    name:          _donor.name,
    email:         _donor.email,
    purpose:       _donor.purpose,
    amount:        _donor.amount,
    paymentMethod: _selectedMethod,
    room:          donRoom,
    rateType:      donRate,
    tags:          'DES,DES-donation',
  }).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showAlert(msg) {
  const el = document.getElementById('donate-alert');
  el.textContent = msg;
  el.className   = 'alert alert-error';
}
