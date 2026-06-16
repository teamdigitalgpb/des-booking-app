# Test Checklist — Abandoned Booking + Admin Room Toggle

## Setup
- Local server running at `http://localhost:8000`
- Or use live URL: `https://d-econo-space-agus.vercel.app`

---

## TEST 1: Admin Room Toggle UI

### Step 1a: Load Admin Panel
1. Open `http://localhost:8000/admin.html`
2. You should see password gate with "Admin Access" header
3. **✓ Expected:** Password input field appears

### Step 1b: Log In
1. Enter the admin password (check config.js for `ADMIN_PASSWORD`)
2. Click "Sign In"
3. **✓ Expected:** Gate disappears, admin panel loads with "Blocked Dates" title

### Step 1c: Verify Room Status Cards
1. Scroll down to "Room Status" section (above "Active Blocks")
2. You should see two cards side-by-side: "Room D1" and "Room D2"
3. Each card shows:
   - Room name (bold)
   - Status badge ("Available" in green OR "Unavailable" in red)
   - Toggle button ("Mark Unavailable" or "Mark Available")
4. **✓ Expected:** Both cards visible and readable

### Step 1d: Test Toggle Room D1 Unavailable
1. Click "Mark Unavailable" button on Room D1 card
2. A form appears below the button with:
   - Reason dropdown (Cleaning/Repair/Personal use/Other)
   - End date input field
   - "Confirm →" button
3. Select reason "Cleaning" (or any option)
4. **Leave end date blank** (defaults to 2099-12-31)
5. Click "Confirm →"
6. **✓ Expected:** 
   - Form disappears
   - Status shows "Saving…"
   - After ~2 seconds, page refreshes automatically
   - D1 status now shows "Unavailable — Cleaning" (red badge)
   - D1 button now says "Mark Available"

### Step 1e: Verify Block in Active List
1. Scroll to "Active Blocks" section below
2. You should see a new block listed:
   - Room badge: "ROOM D1"
   - Date range: today's date
   - Reason: "Cleaning"
   - "Remove" button on the right
3. **✓ Expected:** D1 block appears in both Room Status card AND Active Blocks list

### Step 1f: Test Unblock D1
1. In Room Status card, D1 should now show "Mark Available" button
2. Click it
3. **✓ Expected:**
   - Block immediately removes (no form this time)
   - Status returns to "Available" (green badge)
   - Block disappears from Active Blocks list

---

## TEST 2: D2 Availability Rule (with Admin Block)

### Step 2a: Block D1 Again
1. In admin panel, mark D1 unavailable for today (use Room Status toggle)
2. Verify D1 shows "Unavailable" in Room Status
3. **✓ Expected:** D1 is blocked

### Step 2b: Check D2 Booking Form
1. Open new tab: `http://localhost:8000/booking.html`
2. Select Room: **D2**
3. Select Check-in: **today**
4. Select Check-out: **tomorrow**
5. **✓ Expected:** 
   - Price displays correctly
   - **NO** "Room D2 is only available when Room D1 is occupied" warning appears
   - D2 is fully bookable (form does not reject submission)
   - This proves D2 rule now respects admin blocks ✓

### Step 2c: Unblock D1 & Verify D2 Rule Still Works
1. Go back to admin.html (other tab)
2. Click "Mark Available" on D1 to remove the block
3. Return to booking.html tab
4. Select Room D2 again with same dates
5. **✓ Expected:** 
   - The "Room D2 is only available when Room D1 is occupied" warning **should now appear**
   - This proves the rule works both ways (blocks AND bookings) ✓

---

## TEST 3: Abandoned Booking Follow-up (Email Detection)

### Step 3a: Trigger Abandoned Booking
1. Open `http://localhost:8000/booking.html` in a **new tab/window**
2. Fill in these fields:
   - First Name: `Test`
   - Last Name: `User`
   - Mobile: `09171234567`
   - Email: `your-test-email@gmail.com` ← **Important: use a real email you can check**
   - Room: `d1` (any room)
   - Check-in: any future date
   - Check-out: next day
3. **Do NOT click "Confirm Booking"**
4. Close the tab / browser tab completely
5. **✓ Expected:** `pagehide` event fires, sendBeacon sends abandoned booking payload

### Step 3b: Check for Follow-up Email
1. Wait 2–3 seconds
2. Check your Gmail inbox for email from `d.econospace.cebu@gmail.com`
3. Subject: "Still thinking it over? Your room is waiting."
4. **✓ Expected:** 
   - Email arrives in inbox
   - Contains guest's name in greeting
   - Has "Complete Your Booking →" link
   - Shows contact info (phone + email)

### Step 3c: Check Abandoned Leads Sheet
1. Open your DES Google Sheet: `https://docs.google.com/spreadsheets/d/[your-sheet-id]`
2. Look for new tab: **"Abandoned Leads"** (auto-created by Apps Script)
3. Check columns: Timestamp | Name | Email | Mobile | Room | Check-in | Check-out
4. **✓ Expected:**
   - Row with today's timestamp
   - Name: `Test User`
   - Email: your test email
   - Room: `d1`
   - Dates match what you entered

### Step 3d: Verify No False Trigger (Completed Booking)
1. Go back to `booking.html`
2. Fill in all fields again (any values)
3. **This time, click "Confirm Booking"**
4. You'll be redirected to payment.html
5. Close this tab
6. **✓ Expected:** 
   - NO second abandoned booking email arrives
   - NO second row in Abandoned Leads sheet
   - This proves `_bookingSubmitted` flag prevents false positives ✓

---

## Summary

| Feature | Test | Status |
|---------|------|--------|
| Admin Toggle UI | Step 1a–1f | ✓ or ✗ |
| D2 Rule (Blocks) | Step 2a–2c | ✓ or ✗ |
| Abandoned Email | Step 3a–3d | ✓ or ✗ |

**All tests pass = both features ready for production.**

---

## Troubleshooting

**Toggle buttons don't appear?**
- Check browser console (F12 → Console) for errors
- Verify `renderToggles()` is being called (should be in Network tab when page loads)

**D2 warning still shows when D1 is blocked?**
- Check that `isD1Occupied()` function is defined in booking.js
- Verify D1 block was actually saved (appears in Active Blocks list)
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to clear cache

**Email not arriving?**
- Check Gmail spam/promotions folders
- Verify `WEBHOOK_ADMIN` is wired correctly in config.js
- Check Apps Script execution logs: script.google.com → Executions → filter by "bookingAbandoned"

**Sheet "Abandoned Leads" not created?**
- It auto-creates on first abandoned booking
- If it doesn't appear, check Apps Script logs for errors
- May need to grant Gmail permission manually (run test in Apps Script editor first)
