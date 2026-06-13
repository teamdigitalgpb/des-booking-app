// Volunteer Stories — load from Google Sheet CSV + handle submission

function parseCSV(text) {
  const rows = [];
  for (const raw of text.trim().split(/\r?\n/)) {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === '"' && raw[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function renderStories(stories) {
  const grid = document.getElementById('stories-grid');
  const empty = document.getElementById('stories-empty');
  if (!stories.length) {
    grid.style.display = 'none';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = stories.map(s => `
    <div class="story-card">
      <div class="story-quote">“</div>
      <p class="story-text">${s.story.replace(/\n/g, '<br>')}</p>
      <div class="story-meta">
        <strong>${s.name}</strong>
        <span>${[s.location, s.period].filter(Boolean).join(' &nbsp;&middot;&nbsp; ')}</span>
      </div>
    </div>
  `).join('');
}

async function loadStories() {
  const url = (typeof CONFIG !== 'undefined') && CONFIG.STORIES_CSV_URL;
  if (!url || url.startsWith('PLACEHOLDER')) return;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const rows = parseCSV(await res.text());
    if (rows.length < 2) return;
    const [header, ...data] = rows;
    const idx = k => header.findIndex(h => h.toLowerCase() === k);
    const iName = idx('name'), iLoc = idx('location'), iStory = idx('story'), iPeriod = idx('period');
    const stories = data
      .map(r => ({
        name:     r[iName]   || '',
        location: r[iLoc]    || '',
        story:    r[iStory]  || '',
        period:   r[iPeriod] || '',
      }))
      .filter(s => s.name && s.story);
    renderStories(stories);
  } catch (e) {
    // network / CORS — silently show empty state
  }
}

// ── Story submission form ─────────────────────────────────────────────────────

document.getElementById('story-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('story-alert');
  const btn     = document.getElementById('story-submit');

  alertEl.classList.add('hidden');

  const name     = document.getElementById('s-name').value.trim();
  const location = document.getElementById('s-location').value.trim();
  const period   = document.getElementById('s-period').value.trim();
  const story    = document.getElementById('s-story').value.trim();
  const source   = document.getElementById('s-source').value.trim();

  if (!name)     return showStoryAlert('Please enter your name.');
  if (!location) return showStoryAlert('Please enter where you are from.');
  if (!story || story.length < 30) return showStoryAlert('Please share a bit more — at least a sentence or two.');

  btn.disabled    = true;
  btn.textContent = 'Sending…';

  const url = (typeof CONFIG !== 'undefined') && CONFIG.WEBHOOK_STORY;
  if (url && !url.startsWith('PLACEHOLDER')) {
    try {
      await postToWebhook(url, { action: 'story', name, location, period, story, source });
    } catch (err) {
      // webhook failed — still show success to the user; submission is captured in GHL
    }
  }

  document.getElementById('story-form').style.display = 'none';
  document.getElementById('story-success').classList.remove('hidden');
});

function showStoryAlert(msg) {
  const el = document.getElementById('story-alert');
  el.textContent = msg;
  el.className = 'alert alert-error';
  el.classList.remove('hidden');
}

loadStories();
