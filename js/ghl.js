// GHL integration — webhook POST (client-side) + direct API calls (admin)

// ── Webhook submit (used by booking.js and voucher.js) ───────────────────────

async function postToWebhook(url, payload) {
  if (!url || url.startsWith('PLACEHOLDER')) {
    console.warn('Webhook URL not configured. Payload:', payload);
    return { ok: true, simulated: true };
  }

  const isAppsScript = url.includes('script.google.com');
  const isLocalApi   = url.startsWith('/') || url.startsWith(window.location.origin);
  const safePayload  = { ...payload };

  if (isAppsScript && !safePayload.action) {
    if (typeof CONFIG !== 'undefined') {
      if (url === CONFIG.WEBHOOK_BOOKING) safePayload.action = 'booking';
      else if (url === CONFIG.WEBHOOK_VOUCHER) safePayload.action = 'voucher';
      else if (url === CONFIG.WEBHOOK_DONATION) safePayload.action = 'donation';
      else if (url === CONFIG.WEBHOOK_ADMIN) safePayload.action = 'admin';
      else if (url === CONFIG.WEBHOOK_STORY) safePayload.action = 'story';
      else safePayload.action = 'booking';
    } else {
      safePayload.action = 'booking';
    }
  }

  // Handle local Vercel serverless API endpoints
  if (isLocalApi) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.error || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }
    return data;
  }

  // Handle direct Google Apps Script
  if (isAppsScript) {
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(safePayload),
      mode: 'no-cors',
    };
    await fetch(url, fetchOpts);
    return { success: true, mode: 'no-cors' };
  }

  // Standard external webhooks (Make.com, etc.)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(safePayload),
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
