// Donation flow: payment methods first → name + mobile inline → thank you

const urlParams = new URLSearchParams(window.location.search);
const donRoom   = urlParams.get('room') || '';

const METHODS = {
  gcash: { label: 'GCash',           app: 'GCash',        type: 'qr',   qr: () => CONFIG.QR_GCASH   },
  maya:  { label: 'Maya',            app: 'Maya',         type: 'qr',   qr: () => CONFIG.QR_MAYA    },
  bank:  { label: 'Bank / InstaPay', app: 'your banking', type: 'qr',   qr: () => CONFIG.QR_BANK    },
  wise:  { label: 'Wise',            app: 'Wise',         type: 'link', link: () => CONFIG.LINK_WISE },
};

let _selectedMethod = '';
let _isWise         = false;

function showState(id) {
  ['donate-state-payment', 'donate-state-qr',
   'donate-state-fallback', 'donate-state-thankyou'].forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    s === id ? el.classList.remove('hidden') : el.classList.add('hidden');
  });
}

// ── Payment method click ──────────────────────────────────────────────────────

document.querySelectorAll('.pay-card').forEach(card => {
  card.addEventListener('click', () => {
    const method = METHODS[card.dataset.method];
    if (!method) return;

    _selectedMethod = method.label;
    _isWise         = method.type === 'link';

    document.getElementById('don-name').value     = '';
    document.getElementById('don-mobile').value   = '';
    document.getElementById('qr-alert').className = 'alert hidden';

    if (_isWise) {
      document.getElementById('qr-title').textContent    = 'Pay via Wise';
      document.getElementById('qr-subtitle').textContent = 'Enter your details below, then open Wise to complete your donation.';
      document.getElementById('qr-image-wrap').style.display = 'none';
      document.getElementById('donate-done-btn').textContent = 'Open Wise to Pay →';
    } else {
      const qrPath = method.qr();
      document.getElementById('qr-title').textContent    = method.label;
      document.getElementById('qr-subtitle').innerHTML   = 'Scan this QR code with your ' + method.app + ' app. Enter any amount you choose.';
      document.getElementById('qr-image-wrap').style.display = '';
      document.getElementById('donate-done-btn').textContent = "Done — I've Sent Some Love →";

      const img  = document.getElementById('qr-image');
      const miss = document.getElementById('qr-placeholder');
      const hint = document.getElementById('qr-path-hint');
      img.style.display = 'block';
      miss.classList.add('hidden');
      img.src    = qrPath;
      img.onerror = () => {
        img.style.display = 'none';
        hint.textContent  = qrPath;
        miss.classList.remove('hidden');
      };
    }

    showState('donate-state-qr');
  });
});

// ── Back button ───────────────────────────────────────────────────────────────

document.getElementById('qr-back').addEventListener('click', () => {
  showState('donate-state-payment');
});

// ── Done / Open Wise button ───────────────────────────────────────────────────

document.getElementById('donate-done-btn').addEventListener('click', () => {
  const name   = document.getElementById('don-name').value.trim();
  const mobile = document.getElementById('don-mobile').value.trim();

  if (!name)   { showQrAlert('Please enter your name.');          return; }
  if (!mobile) { showQrAlert('Please enter your mobile number.'); return; }

  if (_isWise) {
    const url = CONFIG.LINK_WISE;
    if (url && !url.startsWith('PLACEHOLDER')) {
      window.open(url, '_blank', 'noopener');
    }
  }

  fireDonationWebhook(name, mobile);
  showState('donate-state-thankyou');
});

// ── Webhook ───────────────────────────────────────────────────────────────────

function fireDonationWebhook(name, mobile) {
  postToWebhook(CONFIG.WEBHOOK_DONATION, {
    action:        'donation',
    name,
    mobile,
    paymentMethod: _selectedMethod,
    room:          donRoom,
    tags:          'DES,DES-donation',
  }).catch(() => {});
}

// ── Alert helper ──────────────────────────────────────────────────────────────

function showQrAlert(msg) {
  const el      = document.getElementById('qr-alert');
  el.textContent = msg;
  el.className   = 'alert alert-error';
}
