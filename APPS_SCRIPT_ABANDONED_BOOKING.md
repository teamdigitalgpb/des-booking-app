# Apps Script: Abandoned Booking Follow-up

## Instructions

1. Go to your Apps Script project: https://script.google.com/home
2. Find the "Untitled" project (d.econospace.cebu account)
3. Open the code editor and find the `doPost(e)` function
4. Locate the existing `switch (action)` statement (around line ~30)
5. **Copy the entire `case 'bookingAbandoned':` block below** and paste it as a new case in the switch
6. Save the project (Ctrl+S or Cmd+S)
7. Do NOT redeploy — redeployment would break existing URLs

---

## Code to Paste

Paste this entire block inside the `switch (action)` in your `doPost(e)` function:

```js
case 'bookingAbandoned': {
  const { firstName, lastName, mobile, email, room, checkin, checkout } = data;
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'there';
  const roomLabel = { d1: 'Room D1', d2: 'Room D2', whole: "D' Whole Space" }[room] || room || 'a room';
  const dateInfo = checkin ? ` for ${checkin}${checkout ? ' – ' + checkout : ''}` : '';

  // Log to sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Abandoned Leads')
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Abandoned Leads');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp','Name','Email','Mobile','Room','Check-in','Check-out']);
  }
  sheet.appendRow([new Date(), name, email, mobile, room, checkin, checkout]);

  // Send follow-up email
  if (email) {
    GmailApp.sendEmail(email,
      "Still thinking it over? Your room is waiting.",
      '',
      {
        htmlBody: `<p>Hi ${name},</p>
<p>It looks like you were in the middle of booking <strong>${roomLabel}</strong>${dateInfo} at D' Econo-Space — but didn't quite finish.</p>
<p>No worries. Your spot is still open.</p>
<p><a href="https://d-econo-space-agus.vercel.app/booking.html" style="background:#BF9B30;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:700;">Complete Your Booking →</a></p>
<p>If you have any questions, reach us at:<br>
📞 0917.678.4871 &nbsp;|&nbsp; 0926.149.9002<br>
✉️ d.econospace.cebu@gmail.com</p>
<p style="color:#888;font-size:.85em;">— D' Econo-Space Team</p>`,
        from: 'd.econospace.cebu@gmail.com',
        name: "D' Econo-Space",
        replyTo: 'd.econospace.cebu@gmail.com',
      }
    );
  }
  return ContentService.createTextOutput('ok');
}
```

---

## What This Does

1. **Logs the abandoned lead** to a new sheet tab called "Abandoned Leads" with: Timestamp, Name, Email, Mobile, Room, Check-in, Check-out
2. **Sends a follow-up email** to the guest with a direct link back to the booking form
3. **Uses Gmail's sender** (d.econospace.cebu@gmail.com) so replies go to your property inbox

---

## After Pasting

- The sheet will auto-create the "Abandoned Leads" tab when the first abandoned booking comes through
- Test it by opening `booking.html`, filling in your email + a room, then closing the tab without submitting
- Check Gmail sent folder and the Abandoned Leads sheet within 2–3 seconds
