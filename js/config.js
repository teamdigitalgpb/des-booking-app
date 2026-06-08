// DES Booking App — Runtime Config
// Replace PLACEHOLDER values after GHL setup is complete.
// This file is safe to commit (no private API keys here).

const CONFIG = {
  // ── GHL Webhooks ──────────────────────────────────────────────────────────
  // Create in GHL > Automation > Workflows > New > Trigger: Webhook
  WEBHOOK_BOOKING:  'https://hook.us2.make.com/hry6pwxs46bqke59vbt5erfswcc4yj6s',
  WEBHOOK_VOUCHER:  'PLACEHOLDER_paste_voucher_webhook_url',

  // ── GHL IDs ───────────────────────────────────────────────────────────────
  LOCATION_ID:      '2P0dvOfUyN4ijmvG9KpL',
  PIPELINE_ID:      'PLACEHOLDER_paste_pipeline_id',

  STAGE: {
    INQUIRY:         'PLACEHOLDER_paste_stage_id',
    VOUCHER_REQUEST: 'PLACEHOLDER_paste_stage_id',
    BOOKED:          'PLACEHOLDER_paste_stage_id',
    CHECKED_IN:      'PLACEHOLDER_paste_stage_id',
    CHECKED_OUT:     'PLACEHOLDER_paste_stage_id',
  },

  // ── Property ──────────────────────────────────────────────────────────────
  PROPERTY_EMAIL:   'd.econospace.cebu@gmail.com',
  MAPS_URL:         'https://maps.app.goo.gl/KgXawL22XTxx7zybA',
  PHONE_1:          '0917.678.4871',
  PHONE_2:          '0926.149.9002',

  // ── Pax Overrides ────────────────────────────────────────────────────────
  // Cap guest count for a specific room on specific check-in dates.
  // Format: { roomKey: { 'YYYY-MM-DD': maxGuests } }
  // Example: { d2: { '2026-06-05': 2, '2026-06-06': 2 } }
  PAX_OVERRIDES: {},

  // ── Admin ─────────────────────────────────────────────────────────────────
  // Basic deterrent — change before going live.
  ADMIN_PASSWORD:   'PLACEHOLDER_set_your_admin_password',

  // ── Donation ──────────────────────────────────────────────────────────────
  // Webhook to capture donor info (name, email, purpose) into GHL.
  WEBHOOK_DONATION: 'PLACEHOLDER_paste_donation_webhook_url',

  // QR code images — export non-expiring QR from each app, save to assets/
  QR_GCASH:    'assets/qr-gcash.png',
  QR_MAYA:     'assets/qr-maya.png',
  QR_BANK:     'assets/qr-bank.png',

  // External donation links (donor enters own amount on their platform)
  LINK_PAYPAL: 'PLACEHOLDER_paste_paypal_link',   // e.g. https://paypal.me/yourname
  LINK_WISE:   'PLACEHOLDER_paste_wise_link',     // e.g. https://wise.com/pay/me/...

  // ── JW Weekly Verification ────────────────────────────────────────────────
  // Update every Monday from: wol.jw.org > This Week at a Glance > Bible reading
  JW_QUESTION: 'What is the last song number for this week\'s midweek meeting?',
  JW_ANSWER:   '18',
};
