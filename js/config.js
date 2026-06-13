// DES Booking App — Runtime Config
// Replace PLACEHOLDER values after GHL setup is complete.
// This file is safe to commit (no private API keys here).

const CONFIG = {
  // ── GHL Webhooks ──────────────────────────────────────────────────────────
  // Create in GHL > Automation > Workflows > New > Trigger: Webhook
  WEBHOOK_BOOKING:      'https://hook.us2.make.com/hry6pwxs46bqke59vbt5erfswcc4yj6s',
  WEBHOOK_VOUCHER:      'https://script.google.com/macros/s/AKfycbxYNHs3HVlkXDdjfg49FCKnCIQ8j-WbWozMp6XecuqIHgPzgxoG3EHHNq8H-qP1piI3/exec',
  WEBHOOK_CANCELLATION: 'https://hook.us2.make.com/or893ovi8ddsanfzti4xifqgazbrqoj1',

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
  QR_BANK:     'assets/qr-gcash.png',

  // External donation links (donor enters own amount on their platform)
  LINK_PAYPAL: 'https://www.paypal.com/donate?business=glengsky%40gmail.com&currency_code=PHP',
  LINK_WISE:   'https://wise.com/pay/me/glezzendab',

  // ── Volunteer Stories (Google Sheet "Stories" tab) ───────────────────────
  // Publish the Stories tab as CSV: File > Share > Publish to web > Stories tab > CSV.
  // Columns (row 1 = header): Name, Location, Story, Period
  // Add rows for each approved story. Remove a row to un-publish.
  STORIES_CSV_URL: 'PLACEHOLDER_publish_stories_tab_as_csv',

  // GHL webhook to receive story submissions for admin review.
  WEBHOOK_STORY:   'PLACEHOLDER_paste_story_webhook_url',

  // ── Live Settings (Google Sheet "Settings" tab) ───────────────────────────
  // Published CSV of the Settings tab holding the JW Question + Answer. The site
  // fetches this on load and overrides the JW fallbacks below, so the answer can
  // be updated weekly from the Sheet with no code change. Leave as PLACEHOLDER to
  // use the fallbacks only. Setup: File > Share > Publish to web > Settings tab > CSV.
  SETTINGS_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRn__x3k4QkwjhiexqZEdCYxt4FqKvb555qTRL4pdzjismSEyn32ZYlDCvboNkfsLhtTGwnhLNERWqw/pub?gid=1197321735&single=true&output=csv',

  // ── JW Weekly Verification (fallback if SETTINGS_CSV_URL is unset/unreachable) ─
  JW_QUESTION: 'What is the first midweek song for the week of June 8–14?',
  JW_ANSWER:   '56',
};
