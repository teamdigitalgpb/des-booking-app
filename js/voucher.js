// Voucher request form — step navigation, verification, webhook submit

// ── Voucher validation (used by booking.js) ──────────────────────────────────

function genVoucherCode(type) {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${type.toUpperCase()}-${rand}`;
}

async function validateVoucher(code, room) {
  // JW: midweek meeting song number — accept "42", "Song 42", "song42", etc.
  if (CONFIG.JW_ANSWER && CONFIG.JW_ANSWER !== 'PLACEHOLDER_update_every_monday') {
    const normalize = s => s.replace(/\D/g, '');
    if (normalize(code) === normalize(CONFIG.JW_ANSWER)) {
      return { valid: true, type: 'jw' };
    }
  }

  // A2/A19: owner-issued code stored in localStorage
  const vouchers = JSON.parse(localStorage.getItem('des_vouchers') || '[]');
  const v = vouchers.find(v => v.code === code);
  if (!v) return { valid: false, reason: 'Code not found' };
  if (v.status === 'used')     return { valid: false, reason: 'This voucher has already been used' };
  if (v.status !== 'approved') return { valid: false, reason: 'Voucher is pending approval — check back soon' };
  return { valid: true, type: v.type };
}

function markVoucherUsed(code) {
  const vouchers = JSON.parse(localStorage.getItem('des_vouchers') || '[]');
  const v = vouchers.find(v => v.code === code);
  if (v) {
    v.status  = 'used';
    v.usedAt  = new Date().toISOString();
    localStorage.setItem('des_vouchers', JSON.stringify(vouchers));
  }
}

function saveVoucherRequest(data) {
  const vouchers = JSON.parse(localStorage.getItem('des_vouchers') || '[]');
  vouchers.push({ ...data, status: 'pending', createdAt: new Date().toISOString() });
  localStorage.setItem('des_vouchers', JSON.stringify(vouchers));
  return data.refCode;
}

// ── A2/A19 inline step state ─────────────────────────────────────────────────

let _a2JWVerified    = false;
let _a2BibleVerified = false;

function initA2Steps() {
  _a2JWVerified    = false;
  _a2BibleVerified = false;
  ['a2-bible-step', 'a2-options-step', 'a2-jw-error', 'a2-bible-error',
   'a2-email-panel', 'a2-code-panel', 'a2-code-fallback'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById('a2-jw-answer').value   = '';
  document.getElementById('a2-bible-answer').value = '';
  const jwBtn = document.getElementById('a2-jw-btn');
  jwBtn.textContent = 'Verify →';
  jwBtn.disabled    = false;
  jwBtn.style.background = '';
  document.getElementById('a2-jw-answer').disabled    = false;
  const bibBtn = document.getElementById('a2-bible-btn');
  bibBtn.textContent = 'Continue →';
  bibBtn.disabled    = false;
  bibBtn.style.background = '';
  document.getElementById('a2-bible-answer').disabled = false;
  document.querySelectorAll('input[name="a2-method"]').forEach(r => r.checked = false);
}

// ── Step navigation ──────────────────────────────────────────────────────────

function showAlert(msg, type = 'error') {
  const el = document.getElementById('voucher-alert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideAlert() {
  document.getElementById('voucher-alert').classList.add('hidden');
}

function goStep(n) {
  hideAlert();

  // Validate before leaving step
  if (n === 2) {
    const name  = document.getElementById('v-name').value.trim();
    const mobile= document.getElementById('v-mobile').value.trim();
    const cong  = document.getElementById('v-congregation').value.trim();
    const muni  = document.getElementById('v-municipality').value.trim();
    const prov  = document.getElementById('v-province').value.trim();
    if (!name)  return showAlert('Please enter your full name.');
    if (!mobile)return showAlert('Please enter your mobile number.');
    if (!cong)  return showAlert('Please enter your congregation or organization name.');
    if (!muni)  return showAlert('Please enter your municipality.');
    if (!prov)  return showAlert('Please enter your province.');
  }

  if (n === 3) {
    const rateType = document.querySelector('input[name="rate-type"]:checked');
    if (!rateType) return showAlert('Please select a discount type.');
    const isJW = rateType.value === 'jw';
    document.getElementById('jw-verify').classList.toggle('hidden', !isJW);
    document.getElementById('id-verify').classList.toggle('hidden', isJW);
    if (isJW) {
      document.getElementById('jw-question').textContent = CONFIG.JW_QUESTION;
    } else {
      document.getElementById('a2-jw-question').textContent = CONFIG.JW_QUESTION;
      initA2Steps();
    }
  }

  // Activate panel
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`step-${n}`).classList.add('active');

  // Update dots
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'complete');
    if (i + 1 < n) dot.classList.add('complete');
    if (i + 1 === n) dot.classList.add('active');
  });
}

// ── Submit ───────────────────────────────────────────────────────────────────

async function submitVoucher() {
  hideAlert();

  const rateType = document.querySelector('input[name="rate-type"]:checked');
  if (!rateType) return showAlert('No rate type selected.');

  const type = rateType.value;
  const isJW = type === 'jw';
  let finalType     = type;
  let idNumber      = null;
  let voucherEmail  = null;
  let voucherMethod = null;

  if (isJW) {
    const answer = document.getElementById('jw-answer').value.trim();
    if (!answer) return showAlert('Please answer the verification question.');
    if (answer.toLowerCase() !== CONFIG.JW_ANSWER.trim().toLowerCase()) {
      return showAlert('That answer doesn\'t match. Please check and try again.');
    }
  } else {
    if (!_a2JWVerified)    return showAlert('Please complete the JW verification step first.');
    if (!_a2BibleVerified) return showAlert('Please complete the Bible book step first.');

    const method = document.querySelector('input[name="a2-method"]:checked');
    if (!method) return showAlert('Please choose an activation method.');
    voucherMethod = method.value;

    if (voucherMethod === 'email') {
      voucherEmail        = document.getElementById('a2-email').value.trim();
      const code          = document.getElementById('a2-voucher-code').value.trim().toUpperCase();
      if (!voucherEmail)  return showAlert('Please enter your email address.');
      if (!code)          return showAlert('Please enter your voucher code.');
      if (code !== 'ISA6:8') return showAlert('That voucher code is incorrect. Please check and try again.');
    } else {
      const code    = document.getElementById('a2-id-code').value.trim();
      const valid7  = /^\d{7}$/.test(code);
      if (!code) return showAlert('Please enter your A2/A19 Code.');
      if (!valid7) {
        document.getElementById('a2-code-fallback').textContent =
          'Try again later but keep the JW rate now to reserve and confirm booking, and contact us for the additional voucher code for A2/A19s.';
        document.getElementById('a2-code-fallback').classList.remove('hidden');
        finalType = 'jw';
      } else {
        idNumber = code;
      }
    }
  }

  const name   = document.getElementById('v-name').value.trim();
  const mobile = document.getElementById('v-mobile').value.trim();
  const cong   = document.getElementById('v-congregation').value.trim();
  const muni   = document.getElementById('v-municipality').value.trim();
  const prov   = document.getElementById('v-province').value.trim();
  const answer = isJW ? document.getElementById('jw-answer').value.trim() : null;

  const refCode = 'REF-' + Date.now().toString(36).toUpperCase();

  const payload = {
    name, mobile, congregation: cong, municipality: muni, province: prov,
    rateType: finalType, idNumber, answer,
    email: voucherEmail,
    voucherMethod,
    refCode,
    tags: `DES,DES-voucher-pending,DES-${finalType.toUpperCase()}`,
  };

  const btn = document.getElementById('submit-voucher');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    await postToWebhook(CONFIG.WEBHOOK_VOUCHER, payload);
    saveVoucherRequest({ ...payload, code: null });
    if (finalType !== 'jw') {
      sessionStorage.setItem('des_voucher_approved', JSON.stringify({ type: 'a2a19' }));
      window.location.href = 'booking.html';
    } else {
      sessionStorage.setItem('des_voucher_summary', JSON.stringify({ name, mobile, refCode, type: finalType }));
      window.location.href = 'thankyou-voucher.html';
    }
  } catch (err) {
    showAlert('Something went wrong. Please try again or contact us directly.');
    btn.disabled    = false;
    btn.textContent = 'Submit Request';
  }
}

// ── A2/A19 inline step event listeners ───────────────────────────────────────

document.getElementById('a2-jw-btn').addEventListener('click', function () {
  const answer   = document.getElementById('a2-jw-answer').value.trim().toLowerCase();
  const expected = (CONFIG.JW_ANSWER || '').trim().toLowerCase();
  const errEl    = document.getElementById('a2-jw-error');
  if (!answer) {
    errEl.textContent = 'Please answer the verification question.';
    return errEl.classList.remove('hidden');
  }
  if (answer !== expected) {
    errEl.textContent = 'That answer doesn\'t match. Please check and try again.';
    return errEl.classList.remove('hidden');
  }
  errEl.classList.add('hidden');
  _a2JWVerified = true;
  this.textContent     = '✓ Verified';
  this.disabled        = true;
  this.style.background = '#1a7a4a';
  document.getElementById('a2-jw-answer').disabled = true;
  document.getElementById('a2-bible-step').classList.remove('hidden');
  document.getElementById('a2-bible-answer').focus();
});

document.getElementById('a2-bible-btn').addEventListener('click', function () {
  const answer = document.getElementById('a2-bible-answer').value.trim().toLowerCase();
  const errEl  = document.getElementById('a2-bible-error');
  if (!answer) {
    errEl.textContent = 'Please enter the Bible book name.';
    return errEl.classList.remove('hidden');
  }
  if (!['isaiah', 'isaias'].includes(answer)) {
    errEl.textContent = 'That\'s not the right book. Please try again.';
    return errEl.classList.remove('hidden');
  }
  errEl.classList.add('hidden');
  _a2BibleVerified = true;
  this.textContent     = '✓ Confirmed';
  this.disabled        = true;
  this.style.background = '#1a7a4a';
  document.getElementById('a2-bible-answer').disabled = true;
  document.getElementById('a2-options-step').classList.remove('hidden');
});

document.querySelectorAll('input[name="a2-method"]').forEach(radio => {
  radio.addEventListener('change', function () {
    document.getElementById('a2-email-panel').classList.toggle('hidden', this.value !== 'email');
    document.getElementById('a2-code-panel').classList.toggle('hidden', this.value !== 'code');
  });
});

// ── Send Code to Email button ─────────────────────────────────────────────────

document.getElementById('a2-send-code-btn').addEventListener('click', async function () {
  const email    = document.getElementById('a2-email').value.trim();
  const statusEl = document.getElementById('a2-send-status');
  if (!email) {
    statusEl.textContent  = 'Please enter your email address first.';
    statusEl.style.cssText = 'background:#fdecea;border:1.5px solid #e57373;color:#7a0000;';
    statusEl.classList.remove('hidden');
    return;
  }
  this.disabled    = true;
  this.textContent = 'Sending…';
  try {
    await postToWebhook(CONFIG.WEBHOOK_VOUCHER, { action: 'send_code', email });
    statusEl.innerHTML    = '✓ Code sent! Check your inbox, then enter it in the field below.<br><span style="font-size:.88em;opacity:.8;">Didn\'t see it? Check your spam or junk folder.</span>';
    statusEl.style.cssText = 'background:#e8f5e9;border:1.5px solid #66bb6a;color:#1b5e20;';
  } catch {
    statusEl.innerHTML    = 'Could not send automatically? <a href="https://www.facebook.com/d.econo.space.agus" target="_blank" style="color:#7a5000;font-weight:600;">Message us on Facebook</a> to get your code.';
    statusEl.style.cssText = 'background:#fff3cd;border:1.5px solid #e9a200;color:#7a5000;';
  }
  statusEl.classList.remove('hidden');
  this.textContent = 'Resend →';
  this.disabled    = false;
});

// ── Reset button state on back-navigate ──────────────────────────────────────

window.addEventListener('pageshow', function () {
  const btn = document.getElementById('submit-voucher');
  btn.disabled    = false;
  btn.textContent = 'Submit Request';
});
