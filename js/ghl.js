// GHL integration — webhook POST (client-side) + direct API calls (admin)

// ── Webhook submit (used by booking.js and voucher.js) ───────────────────────

async function postToWebhook(url, payload) {
  if (!url || url.startsWith('PLACEHOLDER')) {
    console.warn('Webhook URL not configured. Payload:', payload);
    // In dev/testing mode, simulate success so forms still work
    return { ok: true, simulated: true };
  }
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
  return res.json().catch(() => ({}));
}

// ── GHL API helpers (used by admin.js) ───────────────────────────────────────

const GHL_BASE    = 'https://services.leadconnectorhq.com';
// API key is server-side only — never put it in client JS for production.
// For this static-site setup, admin API calls route through GHL webhooks instead.
// Direct API calls below are available for future server-side use (Vercel functions).

async function ghlRequest(method, path, body = null) {
  // This function is intentionally left as a reference stub.
  // Direct GHL API calls require the private API key, which must NOT live
  // in browser JS. Wire these through a Vercel serverless function if needed.
  console.warn('ghlRequest() called client-side — route through a serverless function.');
}

// ── Tag helpers (reference — used in webhook payloads, not direct API) ───────

const GHL_TAGS = {
  all:             'DES',
  jw:              'DES-JW',
  a2:              'DES-A2',
  a19:             'DES-A19',
  voucherPending:  'DES-voucher-pending',
  voucherApproved: 'DES-voucher-approved',
  voucherUsed:     'DES-voucher-used',
  booked:          'DES-booked',
  checkedIn:       'DES-checked-in',
  checkedOut:      'DES-checked-out',
};
