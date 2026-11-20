// ═══════════════════════════════════════════════════════════════════════════
// DES Booking App — Apps Script Webhook
// Actions: voucher | donation | story | addBlock | removeBlock
// ═══════════════════════════════════════════════════════════════════════════

var ADMIN_EMAIL = 'd.econospace.cebu@gmail.com';
var SITE_NAME   = "D' Econo-Space";

// ── Entry point (POST) ───────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    if      (action === 'voucher')     { sendCodeToGuest(payload);   }
    else if (action === 'donation')    { saveDonation(payload);      }
    else if (action === 'story')       { saveStory(payload);         }
    else if (action === 'addBlock')    { addBlockedDate(payload);    }
    else if (action === 'removeBlock') { removeBlockedDate(payload); }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Entry point (GET) — one-click story approval ─────────────────────────────

function doGet(e) {
  var action = e.parameter.action;
  var token  = e.parameter.token;

  if (action === 'approveStory' && token) {
    return approveStory(token);
  }

  return HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif;margin:60px auto;max-width:400px;text-align:center;color:#888;">Invalid request.</p>'
  );
}

// ── Voucher verification ─────────────────────────────────────────────────────

function sendCodeToGuest(payload) {
  var name         = payload.name         || '';
  var email        = payload.email        || '';
  var mobile       = payload.mobile       || '';
  var type         = payload.type         || '';
  var congregation = payload.congregation || '';
  var municipality = payload.municipality || '';
  var province     = payload.province     || '';
  var typeLabel    = type === 'jw' ? 'JW Volunteer' : 'A2/A19 Volunteer';

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Voucher Log');
  if (sheet) {
    sheet.appendRow([
      new Date(), name, email, mobile, typeLabel,
      congregation, municipality + (province ? ', ' + province : '')
    ]);
  }

  if (email) {
    GmailApp.sendEmail(
      email,
      'Your discount rate is confirmed — ' + SITE_NAME,
      'Hi ' + name + ',\n\n'
        + 'Your ' + typeLabel + ' discount rate has been confirmed for your stay at ' + SITE_NAME + '.\n\n'
        + 'You can now proceed to book your room — your discounted rate will be applied automatically.\n\n'
        + 'Congregation: ' + congregation + '\n'
        + 'Mobile:       ' + mobile + '\n\n'
        + 'For any questions:\n'
        + 'd.econospace.cebu@gmail.com\n'
        + '0917.678.4871 | 0926.149.9002\n\n'
        + 'God bless,\n' + SITE_NAME
    );
  }

  notifyAdmin(typeLabel, payload);
}

function notifyAdmin(typeLabel, payload) {
  GmailApp.sendEmail(
    ADMIN_EMAIL,
    '[DES] New voucher verification — ' + typeLabel,
    'New voucher verification received.\n\n'
      + 'Name:         ' + (payload.name         || '') + '\n'
      + 'Email:        ' + (payload.email        || '') + '\n'
      + 'Mobile:       ' + (payload.mobile       || '') + '\n'
      + 'Type:         ' + typeLabel                    + '\n'
      + 'Congregation: ' + (payload.congregation || '') + '\n'
      + 'Municipality: ' + (payload.municipality || '') + '\n'
      + 'Province:     ' + (payload.province     || '') + '\n'
  );
}

// ── Donations ────────────────────────────────────────────────────────────────

function saveDonation(payload) {
  var name          = payload.name          || '';
  var email         = payload.email         || '';
  var mobile        = payload.mobile        || '';
  var purpose       = payload.purpose       || '';
  var amount        = payload.amount        || '';
  var paymentMethod = payload.paymentMethod || '';

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Donations');
  if (sheet) {
    sheet.appendRow([new Date(), name, email, mobile, purpose, paymentMethod, amount ? '₱' + amount : '']);
  }

  if (email) {
    GmailApp.sendEmail(
      email,
      'Thank you for your donation — ' + SITE_NAME,
      buildThankyouPlain(name, purpose, paymentMethod, amount),
      { htmlBody: buildThankyouHtml(name, purpose, paymentMethod, amount) }
    );
  }

  GmailApp.sendEmail(
    ADMIN_EMAIL,
    '[DES] New donation — ' + name,
    'A donation has been recorded.\n\n'
      + 'Donor:          ' + name                                      + '\n'
      + 'Email:          ' + email                                     + '\n'
      + 'Mobile:         ' + mobile                                    + '\n'
      + 'Purpose:        ' + purpose                                   + '\n'
      + 'Payment Method: ' + paymentMethod                             + '\n'
      + 'Amount:         ' + (amount ? '₱' + amount : 'not specified') + '\n'
  );
}

function buildThankyouPlain(name, purpose, paymentMethod, amount) {
  return 'Dear ' + name + ',\n\n'
    + "Your gift doesn't just cover a night's stay — it gives a volunteer the strength to keep going. "
    + "The person who rests here because of you may never know your name, but what you've done travels with them.\n\n"
    + '--- Your Donation ---\n'
    + 'Purpose:        ' + purpose       + '\n'
    + 'Payment Method: ' + paymentMethod + '\n'
    + (amount ? 'Amount:         ₱' + amount + '\n' : '')
    + '\n"Here I am. Send me." — Isaiah 6:8\n\n'
    + 'With gratitude,\n' + SITE_NAME + '\n'
    + 'd.econospace.cebu@gmail.com\n'
    + '0917.678.4871 | 0926.149.9002';
}

function buildThankyouHtml(name, purpose, paymentMethod, amount) {
  var amountRow = amount
    ? '<tr><td style="padding:4px 8px;color:#888;font-size:14px;">Amount</td>'
      + '<td style="padding:4px 8px;font-size:14px;font-weight:600;">₱' + amount + '</td></tr>'
    : '';
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">'
    + '<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">'
    + '<div style="background:#0e1f3d;padding:32px 40px;text-align:center;">'
    + '<p style="color:#c9a84c;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;">' + SITE_NAME + '</p>'
    + '<h1 style="color:#fff;font-size:26px;margin:0;font-weight:400;font-style:italic;">Thank you —<br>from the heart.</h1>'
    + '</div>'
    + '<div style="padding:36px 40px;">'
    + '<p style="font-size:16px;color:#2c2c2c;line-height:1.8;">Dear <strong>' + name + '</strong>,</p>'
    + '<p style="font-size:15px;color:#4a3f35;line-height:1.9;">'
    + "Your gift doesn't just cover a night's stay — it gives a volunteer the strength to keep going. "
    + "The person who rests here because of you may never know your name, but what you've done travels with them.</p>"
    + '<div style="background:#f5f0eb;border-radius:8px;padding:20px 24px;margin:24px 0;">'
    + '<table style="width:100%;border-collapse:collapse;">'
    + '<tr><td style="padding:4px 8px;color:#888;font-size:14px;">Purpose</td><td style="padding:4px 8px;font-size:14px;">' + purpose + '</td></tr>'
    + '<tr><td style="padding:4px 8px;color:#888;font-size:14px;">Payment</td><td style="padding:4px 8px;font-size:14px;">' + paymentMethod + '</td></tr>'
    + amountRow + '</table></div>'
    + '<p style="color:#c9a84c;font-size:14px;font-style:italic;font-weight:600;text-align:center;margin:28px 0 4px;">"Here I am. Send me." — Isaiah 6:8</p>'
    + '</div>'
    + '<div style="background:#f5f0eb;padding:20px 40px;text-align:center;">'
    + '<p style="font-size:13px;color:#888;margin:0;">' + SITE_NAME + ' &nbsp;|&nbsp; d.econospace.cebu@gmail.com<br>0917.678.4871 &nbsp;|&nbsp; 0926.149.9002</p>'
    + '</div></div></body></html>';
}

// ── Volunteer stories ─────────────────────────────────────────────────────────

function saveStory(payload) {
  var name     = payload.name     || '';
  var location = payload.location || '';
  var story    = payload.story    || '';
  var period   = payload.period   || '';
  var source   = payload.source   || '';
  var token    = new Date().getTime().toString();

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Story Submissions');
  if (sheet) {
    sheet.appendRow([new Date(), name, location, story, period, source, token, 'Pending', '']);
  }

  var approveUrl = ScriptApp.getService().getUrl()
    + '?action=approveStory&token=' + token;

  GmailApp.sendEmail(
    ADMIN_EMAIL,
    '[DES] New story — ' + name,
    'A volunteer has submitted their story.\n\n'
      + 'Name:   ' + name     + '\n'
      + 'From:   ' + location + '\n'
      + 'Period: ' + period   + '\n\n'
      + '--- Story ---\n' + story + '\n\n'
      + 'How they heard about DES: ' + (source || 'not specified') + '\n\n'
      + 'To edit before publishing: open Story Submissions tab, edit column I (Revised Story).\n'
      + 'Leave column I blank to publish the original.\n\n'
      + 'TAP TO APPROVE AND PUBLISH:\n' + approveUrl + '\n\n'
      + 'To reject, simply ignore this email.',
    { htmlBody: buildStoryApprovalHtml(name, location, period, story, source, approveUrl) }
  );
}

function approveStory(token) {
  var ss          = SpreadsheetApp.getActiveSpreadsheet();
  var submissions = ss.getSheetByName('Story Submissions');
  var stories     = ss.getSheetByName('Stories');

  if (!submissions || !stories) {
    return HtmlService.createHtmlOutput(
      '<p style="font-family:sans-serif;margin:60px auto;max-width:400px;text-align:center;color:#b34040;">Sheet not found. Check your Google Sheet setup.</p>'
    );
  }

  var data = submissions.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][6] === token) {
      if (data[i][7] === 'Approved') {
        return HtmlService.createHtmlOutput(buildApproveResultHtml('already', data[i][1]));
      }
      var storyToPublish = data[i][8] ? data[i][8] : data[i][3];
      stories.appendRow([data[i][1], data[i][2], storyToPublish, data[i][4]]);
      submissions.getRange(i + 1, 8).setValue('Approved');
      return HtmlService.createHtmlOutput(buildApproveResultHtml('ok', data[i][1]));
    }
  }

  return HtmlService.createHtmlOutput(buildApproveResultHtml('notfound', ''));
}

function buildStoryApprovalHtml(name, location, period, story, source, approveUrl) {
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">'
    + '<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">'
    + '<div style="background:#0e1f3d;padding:24px 36px;">'
    + '<p style="color:#c9a84c;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">' + SITE_NAME + '</p>'
    + '<h2 style="color:#fff;font-size:20px;margin:0;font-weight:600;">New Story Submission</h2>'
    + '</div>'
    + '<div style="padding:28px 36px;">'
    + '<p style="margin:0 0 4px;font-size:13px;color:#888;">From</p>'
    + '<p style="margin:0 0 16px;font-size:16px;color:#0e1f3d;font-weight:700;">' + name + ' &mdash; ' + location + (period ? ' &nbsp;·&nbsp; ' + period : '') + '</p>'
    + '<p style="font-size:15px;color:#4a3f35;line-height:1.85;border-left:3px solid #c9a84c;padding-left:14px;margin:0 0 20px;">' + story.replace(/\n/g, '<br>') + '</p>'
    + (source ? '<p style="font-size:13px;color:#888;margin:0 0 8px;">Heard about DES via: ' + source + '</p>' : '')
    + '<p style="font-size:12px;color:#aaa;margin:0 0 20px;">To edit before publishing: open Story Submissions tab → column I (Revised Story). Leave blank to publish original.</p>'
    + '<a href="' + approveUrl + '" style="display:block;text-align:center;background:#0e1f3d;color:#c9a84c;font-size:15px;font-weight:700;padding:14px 20px;border-radius:8px;text-decoration:none;letter-spacing:.03em;">✓ Approve &amp; Publish This Story</a>'
    + '<p style="text-align:center;font-size:12px;color:#aaa;margin-top:12px;">To reject, ignore this email. The story will not be published.</p>'
    + '</div></div></body></html>';
}

function buildApproveResultHtml(result, name) {
  var icon, title, msg;
  if (result === 'ok') {
    icon = '✓'; title = 'Story published.';
    msg = (name ? name + "'s story is" : 'The story is') + ' now live on the Experiences page.';
  } else if (result === 'already') {
    icon = '✓'; title = 'Already published.';
    msg = (name ? name + "'s story was" : 'This story was') + ' already approved and is live.';
  } else {
    icon = '⚠'; title = 'Story not found.';
    msg = 'It may have already been approved or removed from the sheet.';
  }
  return '<!DOCTYPE html><html><body style="font-family:Georgia,serif;margin:0;padding:0;background:#f5f0eb;">'
    + '<div style="max-width:400px;margin:80px auto;text-align:center;background:#fff;border-radius:12px;padding:48px 36px;">'
    + '<div style="font-size:3rem;margin-bottom:1rem;">' + icon + '</div>'
    + '<h2 style="color:#0e1f3d;margin:0 0 .5rem;">' + title + '</h2>'
    + '<p style="color:#888;font-size:.95rem;">' + msg + '</p>'
    + '</div></body></html>';
}

// ── Admin date blocking ───────────────────────────────────────────────────────

function addBlockedDate(payload) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Blocked Dates');
  if (!sheet) return;
  sheet.appendRow([
    payload.room      || '',
    payload.startDate || '',
    payload.endDate   || payload.startDate || '',
    payload.reason    || ''
  ]);
}

function removeBlockedDate(payload) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Blocked Dates');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === payload.room &&
        data[i][1] === payload.startDate &&
        data[i][2] === (payload.endDate || payload.startDate)) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ── Permission helper ─────────────────────────────────────────────────────────

function grantPermissions() {
  GmailApp.sendEmail(
    ADMIN_EMAIL,
    '[DES] Apps Script permissions granted',
    'Gmail and Sheets permissions are active for the DES webhook.'
  );
  SpreadsheetApp.getActiveSpreadsheet().getName();
  Logger.log('Done — permissions granted.');
}
