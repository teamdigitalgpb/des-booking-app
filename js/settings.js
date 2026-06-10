// Live Settings loader — pulls the JW question/answer from the published
// Google Sheet "Settings" tab so they can be updated weekly without code.
// Falls back silently to the defaults in config.js if anything fails.

async function loadLiveSettings() {
  const url = (typeof CONFIG !== 'undefined') && CONFIG.SETTINGS_CSV_URL;
  if (!url || url.startsWith('PLACEHOLDER')) return; // not configured — use config.js defaults
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const text = await res.text();
    // Tiny key/value CSV: split each line on the FIRST comma (keys have no comma).
    text.trim().split(/\r?\n/).forEach((line) => {
      const i = line.indexOf(',');
      if (i < 0) return;
      const key = line.slice(0, i).trim().replace(/^"|"$/g, '').toLowerCase();
      const val = line.slice(i + 1).trim().replace(/^"|"$/g, '');
      if (!val) return;
      if (key === 'jw question') CONFIG.JW_QUESTION = val;
      if (key === 'jw answer')   CONFIG.JW_ANSWER   = val;
    });
  } catch (e) {
    // network / CORS / parse error — keep the config.js fallbacks, never block the form
  }
}

// Start immediately (config.js has already defined CONFIG above this script).
// Verification reads CONFIG.JW_* on user input, which happens well after this resolves.
loadLiveSettings();
