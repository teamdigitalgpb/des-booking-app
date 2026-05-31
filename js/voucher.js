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
    // Show the correct verification panel
    const isJW = rateType.value === 'jw';
    document.getElementById('jw-verify').classList.toggle('hidden', !isJW);
    document.getElementById('id-verify').classList.toggle('hidden', isJW);
    if (isJW) {
      document.getElementById('jw-question').textContent = CONFIG.JW_QUESTION;
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

  const type = rateType.value; // 'jw' | 'a2' | 'a19'
  const isJW = type === 'jw';

  if (isJW) {
    const answer = document.getElementById('jw-answer').value.trim();
    if (!answer) return showAlert('Please answer the Bible reading question.');
    const correct = CONFIG.JW_ANSWER.trim().toLowerCase();
    if (answer.toLowerCase() !== correct) {
      return showAlert('That answer doesn\'t match. Please check and try again.');
    }
  } else {
    const memberId = document.getElementById('member-id').value.trim();
    if (!memberId) return showAlert('Please enter your ID number.');
  }

  const name     = document.getElementById('v-name').value.trim();
  const mobile   = document.getElementById('v-mobile').value.trim();
  const cong     = document.getElementById('v-congregation').value.trim();
  const muni     = document.getElementById('v-municipality').value.trim();
  const prov     = document.getElementById('v-province').value.trim();
  const idNumber = isJW ? null : document.getElementById('member-id').value.trim();
  const answer   = isJW ? document.getElementById('jw-answer').value.trim() : null;

  const refCode = 'REF-' + Date.now().toString(36).toUpperCase();

  const payload = {
    name, mobile, congregation: cong, municipality: muni, province: prov,
    rateType: type, idNumber, answer,
    refCode,
    tags: `DES,DES-voucher-pending,DES-${type.toUpperCase()}`,
  };

  const btn = document.getElementById('submit-voucher');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    await postToWebhook(CONFIG.WEBHOOK_VOUCHER, payload);
    saveVoucherRequest({ ...payload, code: null });

    sessionStorage.setItem('des_voucher_summary', JSON.stringify({ name, mobile, refCode, type }));
    window.location.href = 'thankyou-voucher.html';
  } catch (err) {
    showAlert('Something went wrong. Please try again or contact us directly.');
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }
}
