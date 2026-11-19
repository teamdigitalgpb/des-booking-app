// ══════════════════════════════════════════════════════════════════════════════
// D' Econo-Space — Google Apps Script Booking Fix
// File: Code.gs (in your Apps Script Editor)
// ══════════════════════════════════════════════════════════════════════════════

// 1. ADD THIS CASE INSIDE YOUR EXISTING doPost(e) FUNCTION (inside switch(action)):
// ─────────────────────────────────────────────────────────────────────────────

case 'booking': {
  // Acquire a lock to prevent simultaneous submissions from colliding
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'The booking system is currently busy. Please try again in a few seconds.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var firstName       = data.firstName || '';
    var lastName        = data.lastName || '';
    var guestName       = data.name || [firstName, lastName].filter(Boolean).join(' ') || 'Guest';
    var mobile          = data.mobile || '';
    var email           = data.email || '';
    var room            = data.room || 'd1';
    var checkin         = data.checkin || '';
    var checkout        = data.checkout || '';
    var guests          = data.guests || 1;
    var femaleGuests    = data.femaleGuests || 0;
    var maleGuests      = data.maleGuests || 0;
    var rateType        = data.rateType || data.discountType || 'regular';
    var totalPrice      = data.totalPrice || 0;
    var nights          = data.nights || 1;
    var specialRequests = data.specialRequests || '';
    var referral        = data.referral || '';
    var shareWaitlist   = data.shareWaitlist || '';

    var roomKey   = String(room).toLowerCase();
    var roomLabel = (roomKey.indexOf('d1') !== -1) ? 'Room D1'
                  : (roomKey.indexOf('d2') !== -1) ? 'Room D2'
                  : (roomKey.indexOf('whole') !== -1) ? "D' Whole Space"
                  : room;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Target the Bookings sheet tab ─────────────────────────────────────────
    var sheet = ss.getSheetByName('Bookings') || ss.getSheetByName('DES - Bookings');
    if (!sheet) {
      sheet = ss.insertSheet('Bookings');
    }

    // Auto-create header row if sheet is new (Email is placed in Column G per Assistant Handbook)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp', 'Booking ID', 'Room', 'Check-in', 'Check-out', 'Nights',
        'Email', 'Guest Name', 'Mobile', 'Guests', 'Female', 'Male',
        'Rate Type', 'Total Price', 'Status', 'Special Requests', 'Referral', 'Share Waitlist'
      ]);
      sheet.getRange(1, 1, 1, 18).setFontWeight('bold');
    }

    // Generate unique Booking ID
    var timestamp = new Date();
    var bookingId = 'DES-' + Utilities.formatDate(timestamp, 'Asia/Manila', 'yyyyMMdd-HHmmss');

    // Append the booking row to the Google Sheet
    sheet.appendRow([
      timestamp,
      bookingId,
      roomLabel,
      checkin,
      checkout,
      nights,
      email,          // Column G (matches Assistant Handbook email workflow)
      guestName,
      mobile,
      guests,
      femaleGuests,
      maleGuests,
      rateType,
      totalPrice,
      'New',          // Initial status: New
      specialRequests,
      referral,
      shareWaitlist
    ]);

    // ── Also update 'Booking Calendar' tab if present ─────────────────────────
    var calSheet = ss.getSheetByName('Booking Calendar');
    if (calSheet) {
      if (calSheet.getLastRow() === 0) {
        calSheet.appendRow(['Room', 'CheckIn', 'CheckOut', 'GuestName', 'Status']);
      }
      calSheet.appendRow([roomKey, checkin, checkout, guestName, 'New']);
    }

    // ── Send instant notification to property email ───────────────────────────
    try {
      GmailApp.sendEmail(
        'd.econospace.cebu@gmail.com',
        'New Booking Request: ' + guestName + ' — ' + roomLabel + ' (' + checkin + ')',
        '',
        {
          htmlBody: '<h2>New Booking Received</h2>' +
            '<p><strong>Booking ID:</strong> ' + bookingId + '</p>' +
            '<p><strong>Guest Name:</strong> ' + guestName + '</p>' +
            '<p><strong>Email:</strong> ' + email + '</p>' +
            '<p><strong>Mobile:</strong> ' + mobile + '</p>' +
            '<p><strong>Room:</strong> ' + roomLabel + '</p>' +
            '<p><strong>Check-in:</strong> ' + checkin + ' (2:00 PM)</p>' +
            '<p><strong>Check-out:</strong> ' + checkout + ' (12:00 NN)</p>' +
            '<p><strong>Total Guests:</strong> ' + guests + ' (Female: ' + femaleGuests + ', Male: ' + maleGuests + ')</p>' +
            '<p><strong>Total Price:</strong> ₱' + totalPrice + '</p>' +
            '<p><strong>Special Requests:</strong> ' + (specialRequests || 'None') + '</p>' +
            '<p><strong>Status:</strong> New (Open the Bookings Sheet to confirm and assign GC)</p>',
          from: 'd.econospace.cebu@gmail.com',
          name: "D' Econo-Space System"
        }
      );
    } catch (mailErr) {
      Logger.log('Notification email error: ' + mailErr.message);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      bookingId: bookingId,
      status: 'New'
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}


// 2. ADD / UPDATE THIS doGet(e) FUNCTION IN YOUR SCRIPT:
// ─────────────────────────────────────────────────────────────────────────────
// This allows the website's availability calendar to display live bookings
// and blocked dates directly from your Google Sheet.

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'getAvailability') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Bookings') || ss.getSheetByName('DES - Bookings') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, bookings: [], blocks: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var roomCol = headers.findIndex(function (h) { return h.indexOf('room') !== -1; });
    var ciCol   = headers.findIndex(function (h) { return h.indexOf('check-in') !== -1 || h.indexOf('checkin') !== -1; });
    var coCol   = headers.findIndex(function (h) { return h.indexOf('check-out') !== -1 || h.indexOf('checkout') !== -1; });
    var stCol   = headers.findIndex(function (h) { return h.indexOf('status') !== -1; });
    var nameCol = headers.findIndex(function (h) { return h.indexOf('name') !== -1; });

    var bookings = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = String(row[stCol] || '').toLowerCase().trim();
      if (status === 'declined' || status === 'cancelled') continue;

      var rawRoom = String(row[roomCol] || '').toLowerCase();
      var room = (rawRoom.indexOf('d1') !== -1) ? 'd1'
               : (rawRoom.indexOf('d2') !== -1) ? 'd2'
               : (rawRoom.indexOf('whole') !== -1) ? 'whole'
               : rawRoom;

      var formatYMD = function (val) {
        if (!val) return '';
        if (val instanceof Date) {
          return Utilities.formatDate(val, 'Asia/Manila', 'yyyy-MM-dd');
        }
        return String(val).trim().split('T')[0];
      };

      var ci = formatYMD(row[ciCol]);
      var co = formatYMD(row[coCol]);

      if (room && ci && co) {
        bookings.push({
          room: room,
          checkin: ci,
          checkout: co,
          status: row[stCol] || 'Booked',
          name: row[nameCol] || 'Reserved'
        });
      }
    }

    // Also include Blocked Dates tab if present
    var blocks = [];
    var blockSheet = ss.getSheetByName('Blocked Dates');
    if (blockSheet && blockSheet.getLastRow() > 1) {
      var blockData = blockSheet.getDataRange().getValues();
      for (var j = 1; j < blockData.length; j++) {
        var b = blockData[j];
        if (b[0] && b[1]) {
          blocks.push({
            room: String(b[0]).toLowerCase(),
            startDate: String(b[1]).trim().split('T')[0],
            endDate: String(b[2] || b[1]).trim().split('T')[0],
            reason: b[3] || ''
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      bookings: bookings,
      blocks: blocks
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
