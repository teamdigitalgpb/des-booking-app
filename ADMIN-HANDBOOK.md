# D' Econo-Space — Admin Handbook
**For internal use only. Keep this document confidential.**

---

## 1. System Overview

The booking system is made up of five connected tools:

| Tool | What it does | Who manages it |
|------|-------------|----------------|
| **Vercel** | Hosts the booking website | Automatic (deploys from GitHub) |
| **GitHub** | Stores the app code | Developer / owner |
| **Make.com** | Receives bookings and sends data to GHL | Runs automatically |
| **GoHighLevel (GHL)** | CRM — stores all guest contacts and bookings | Admin |
| **Facebook Messenger** | Guest communication channel | Admin |

**Booking website URL:** your Vercel deployment URL (e.g. `des-booking-app.vercel.app`)

---

## 2. How a Booking Works (End to End)

1. Guest visits the booking website
2. Guest fills in the booking form (name, mobile, room, dates, guests)
3. Guest optionally selects a discount (JW or A2/A19)
4. Guest clicks **Confirm Booking** → receives a "Booking Received" page
5. Make.com automatically creates a contact in GHL with the booking details
6. **Admin reviews the booking in GHL and sends a confirmation email**

> The booking is NOT confirmed until the admin manually approves and emails the guest.

---

## 3. Weekly Task — Update the JW Song Number

Every **Monday**, update the JW verification answer in the app.

**How to find the song number:**
1. Go to **wol.jw.org**
2. Click **This Week at a Glance**
3. Find the **Midweek Meeting** → note the **last song number**

**How to update it:**
1. Open the file `js/config.js` in VS Code
2. Find line 43: `JW_ANSWER: '18',`
3. Replace `18` with the new song number
4. Save the file
5. Open the VS Code terminal and run:
   ```
   git add js/config.js
   git commit -m "Update JW answer - [date]"
   git push
   ```
6. Vercel auto-deploys in about 1 minute

> If you skip this, JW guests who enter this week's answer will get rejected. Update it every Monday without fail.

---

## 4. How to Review Bookings in GHL

**Where to find bookings:**
1. Log into GoHighLevel → sub-account **PRIME ASSISTANT – Bantayan, Cebu**
2. Go to **Contacts**
3. New bookings appear at the top — tagged with `des-booked`

**What to check on each booking:**
- Name, mobile number, email
- Room booked and dates
- Number of guests
- Discount type (blank = regular, `jw` = JW rate, `a2a19` = A2/A19 rate)
- Who referred them (referral field)
- Special requests

---

## 5. Approving or Declining a Booking

**To APPROVE:**
1. Open the contact in GHL
2. Verify no conflict with other confirmed bookings (manually check your calendar)
3. Send a confirmation email to the guest (see template below)
4. In GHL: edit the contact's tags — add `des-confirmed`, keep `des-booked`

**To DECLINE:**
1. Send a polite decline email to the guest explaining why (dates taken, fully booked, etc.)
2. In GHL: add tag `des-declined`

---

## 6. Email Templates

### Booking Confirmation Email

> **Subject:** Your Reservation is Confirmed — D' Econo-Space
>
> Hi [Guest Name],
>
> Great news! Your reservation at D' Econo-Space has been confirmed.
>
> **Booking Details:**
> - Room: [Room D1 / Room D2 / D' Whole Space]
> - Check-in: [Date] at 2:00 PM
> - Check-out: [Date] at 12:00 NN
> - Guests: [Number]
> - Total: ₱[Amount]
>
> **Payment:** Full payment is required before or upon arrival. You may settle via GCash or cash on check-in.
>
> **Address:** Basak Agus Rd, Gisi, Lapu-Lapu, 6015 Cebu (near CBEC / Junrey's Store)
>
> Contact us anytime via Messenger or call 0917.678.4871 / 0926.149.9002.
>
> See you soon!
>
> D' Econo-Space Team

---

### Decline Email

> **Subject:** Regarding Your Booking Request — D' Econo-Space
>
> Hi [Guest Name],
>
> Thank you for your interest in D' Econo-Space.
>
> Unfortunately, we are unable to accommodate your request for [dates] as [the room is already reserved / the unit is unavailable for those dates].
>
> Please feel free to check our availability for other dates. We would love to have you stay with us!
>
> D' Econo-Space Team

---

## 7. A2/A19 Voucher Verification

When a booking comes in with `discountType: a2a19`:

1. Note the guest's **full name** from the booking
2. Check the name against the **external A2/A19 database** (the third-party records you have access to)
3. **If verified:** send a confirmation email + a voucher code (any unique code you create, e.g. `A2A19-JUNE2026-001`) — the guest may use this for future bookings
4. **If not verified:** contact the guest via Messenger to clarify, or decline the discount portion and re-quote regular rate

> The A2/A19 discount is applied automatically on the booking form. Your job is to verify after the fact. If not verified, the rate difference is settled on arrival.

---

## 8. D2 Booking Rules

Room D2 can only be occupied when Room D1 is also occupied (D2 relies on D1's airflow). This rule is enforced on the booking form.

If you see a D2 booking without a corresponding D1 booking for the same dates, contact the guest before confirming.

---

## 9. Blocking Dates (Cleaning / Maintenance / Personal Use)

**Current method (until the admin panel is built):**

1. Open `js/config.js` in VS Code
2. Find `PAX_OVERRIDES: {}` (line 34)
3. To cap guests for a room on a date:
   ```javascript
   PAX_OVERRIDES: { d2: { '2026-06-15': 2 } },
   ```
4. To block a room entirely, set maxGuests to `0`:
   ```javascript
   PAX_OVERRIDES: { d1: { '2026-06-20': 0 } },
   ```
5. Save → commit → push (same steps as updating JW answer)

> The admin panel (coming soon) will let you do this from a browser without touching the code.

---

## 10. Make.com Monitoring

Make.com runs automatically. You only need to check it if something goes wrong.

**Signs something went wrong:**
- A booking came in but no GHL contact was created
- Guest reports they booked but you see nothing in GHL

**How to check:**
1. Log into Make.com → **Scenarios** → open **Integration Webhooks**
2. Check the **History** tab — look for **Error** runs
3. If the scenario shows **Inactive**, toggle it back ON (the schedule settings: Immediately as data arrives)
4. If there are items in the **Queue** from failed runs, clear them first (Webhooks → DES Booking → Queue → Delete all)

**The scenario should always show as Active.** If it gets deactivated by an error, reactivate it.

---

## 11. Messenger (Guest Communication)

Guests can reach you via the **blue Messenger button** on the booking website (bottom-right corner).

Messages go to the **D' Econo-Space near CBEC** Facebook page inbox.

**To respond:**
- Open **Meta Business Suite** (business.facebook.com) or the Facebook mobile app
- Go to Inbox → respond to messages

Common inquiries to expect:
- "Is [date] available?"
- "Can I extend my checkout?"
- "I want to change my room"
- "I already booked but haven't received a confirmation"

---

## 12. Guest-Facing Room Information (Quick Reference)

| Room | Capacity | A/C | Starting Rate |
|------|----------|-----|---------------|
| Room D1 | Up to 4 guests | Common AC | ₱750/night (regular) |
| Room D2 | Up to 4 guests | Fan-cooled | ₱550/night (regular) |
| D' Whole Space | Up to 8 guests | Common AC | ₱1,700/night (regular) |

**Discount rates:**
- JW: ~₱50 off per guest tier
- A2/A19: slightly lower than JW on most configurations

**Check-in:** 2:00 PM | **Check-out:** 12:00 NN

**Address:** Basak Agus Rd, Gisi, Lapu-Lapu, 6015 Cebu (near CBEC / Junrey's Store)

---

## 13. Access Credentials (Keep Secure)

| System | URL | Notes |
|--------|-----|-------|
| Booking website | your-vercel-url.vercel.app | Public |
| GHL (CRM) | app.gohighlevel.com | Login with your GHL account |
| Make.com | make.com | Login with your Make account |
| GitHub (code) | github.com/teamdigitalgpb/des-booking-app | Code repository |
| Facebook Page | facebook.com/d.econo.space.agus | D' Econo-Space near CBEC |

---

## 14. Coming Soon (Do Not Train on These Yet)

- **Admin panel** — browser-based dashboard to approve bookings, block dates, manage PAX caps without touching code
- **Real-time availability** — guests will only see available dates on the form
- **GCash deposit** — optional 50% deposit to lock a reservation
- **Automated confirmation emails** — triggered by admin approval (no manual sending)

---

## 15. Emergency: App Is Down

If the booking website is not loading:

1. Check **Vercel** (vercel.com) — log in and check the deployment status
2. If there is a failed deployment, check the GitHub repository for recent code changes
3. Contact the developer immediately

Do not attempt to modify code files to fix errors unless you are trained to do so.

---

*Last updated: June 2026*
