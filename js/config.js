// DES Booking App — Runtime Config
// Replace PLACEHOLDER values after GHL setup is complete.
// This file is safe to commit (no private API keys here).

const CONFIG = {
  // ── GHL Webhooks ──────────────────────────────────────────────────────────
  // Create in GHL > Automation > Workflows > New > Trigger: Webhook
  WEBHOOK_BOOKING:  'PLACEHOLDER_paste_booking_webhook_url',
  WEBHOOK_VOUCHER:  'PLACEHOLDER_paste_voucher_webhook_url',

  // ── GHL IDs ───────────────────────────────────────────────────────────────
  LOCATION_ID:      '2P0dvOfUyN4ijmvG9KpL',
  CALENDAR_ID:      'PLACEHOLDER_paste_calendar_id',
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

  // ── Admin ─────────────────────────────────────────────────────────────────
  // Basic deterrent — change before going live.
  ADMIN_PASSWORD:   'PLACEHOLDER_set_your_admin_password',

  // ── JW Weekly Verification ────────────────────────────────────────────────
  // Update every Monday from: wol.jw.org > This Week at a Glance > Bible reading
  JW_QUESTION: 'PLACEHOLDER_paste_this_weeks_question',
  JW_ANSWER:   'PLACEHOLDER_paste_this_weeks_answer',
};
