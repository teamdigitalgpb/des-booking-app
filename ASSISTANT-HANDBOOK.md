# D' Econo-Space — Assistant Handbook

*Your simple guide to handling bookings. You only need **two things**: the Bookings Sheet and the DES email. No technical tools, no complicated logins.*

---

## 👋 Welcome & Your Role

Welcome to the D' Econo-Space team! This handbook is your full training — read it once, keep it open while you work, and you'll be handling bookings confidently in no time.

**Your role, in one sentence:** turn every new booking into a *confirmed, paid, happy guest* — all from **one Google Sheet** and **one email inbox**.

You don't need any technical skills or special software. If you can use Google Sheets and Gmail, you can do this job. Take it one booking at a time, follow the steps below, and when something feels unclear — it's always okay to pause and ask.

---

## 1. What you'll use

| Tool | Where to go | What it's for |
|------|-------------|---------------|
| **Bookings Sheet** | `[PASTE YOUR DES - BOOKINGS SHEET LINK HERE]` | Your command center — every booking appears here by itself |
| **DES Email (Gmail)** | [mail.google.com](https://mail.google.com) — sign in as **d.econospace.cebu@gmail.com** | Where you send guests their confirmations and thank-yous |
| **Facebook Page inbox** | The **D' Econo-Space near CBEC** Page → Messages | Where guests message you and send **payment screenshots** |
| **Booking website** *(reference only)* | [des-booking-app.vercel.app](https://des-booking-app.vercel.app) | Where guests book. **You never edit this** — just good to know it exists. |

> You do **not** use GoHighLevel or any other system. Just the Sheet and the Email.

---

## 2. The big picture (how a booking flows)

A guest books on the website → the booking **appears automatically** in your Bookings Sheet as a new row, with **Status = New**.

Your whole job is to move each booking along by updating the **Status** column:

> **New → Confirmed → Paid → Checked-in → Checked-out**
> *(or **Declined**, if you can't accommodate them)*

That's it. Everything else is just doing each step well.

---

## 3. Your step-by-step for every booking

### ① A NEW booking appears (Status = New)

1. Open the **Bookings Sheet**. New rows have **Status = New**.
2. **Check the dates are free.** Look down the sheet for the **same Room** with **overlapping check-in/check-out dates**.
   - **No clash** → you can confirm.
   - **Clash** with another *Confirmed/Paid* booking → you'll decline (see ④).
3. **To confirm:**
   - Click the **Status** cell → choose **Confirmed** from the dropdown.
   - Send the guest the **Confirmation email** (template in §4) from the DES email.

### ② The guest pays

Guests pay by **GCash / Maya / Bank QR** and send a **screenshot through Facebook Messenger**.

1. Open the screenshot — does the **amount** and **name** match the booking?
2. In the booking's row, fill in:
   - **Amount Paid** · **Payment Method** (GCash / Maya / Bank-InstaPay) · **Payment Ref No.** (the reference number on their screenshot)
3. Click the **Status** cell → choose **Paid**.
4. Send the **Payment Received** thank-you email (template in §4).

### ③ Check-in & Check-out

- **On arrival day** → set **Status** to **Checked-in**.
- **After they leave** → set **Status** to **Checked-out**.

### ④ If you can't accommodate them

- Set **Status** to **Declined**.
- Send the **Decline email** (template in §4).

---

## 4. Email templates

*Open the DES Gmail → Compose → paste a template → fill in the **[brackets]** → send to the guest's email (it's in column G of the sheet).*

### ✉️ Confirmation Email
> **Subject:** Your Reservation is Confirmed — D' Econo-Space
>
> Hi **[First Name]**,
>
> Good news — your reservation at D' Econo-Space is confirmed!
>
> **Booking Details**
> - Room: **[Room]**
> - Check-in: **[Date]** at 2:00 PM
> - Check-out: **[Date]** at 12:00 NN
> - Guests: **[Number]**
> - Total: ₱**[Amount]**
>
> **Payment:** Full payment is required before or upon arrival. You may pay via GCash, Maya, or bank transfer — just send us a screenshot of your payment here or on Messenger.
>
> **Address:** Basak Agus Rd, Gisi, Lapu-Lapu, 6015 Cebu (near CBEC / Junrey's Store)
>
> Questions? Message us anytime, or call 0917.678.4871 / 0926.149.9002.
>
> See you soon!
> — D' Econo-Space Team

### ✉️ Payment Received Email
> **Subject:** Payment Received — Thank You! — D' Econo-Space
>
> Hi **[First Name]**,
>
> We've received your payment of ₱**[Amount]** — thank you! Your stay is all set.
>
> - Room: **[Room]** · Check-in **[Date]** 2:00 PM · Check-out **[Date]** 12:00 NN
>
> We look forward to welcoming you. Safe travels!
> — D' Econo-Space Team

### ✉️ Decline Email
> **Subject:** Regarding Your Booking Request — D' Econo-Space
>
> Hi **[First Name]**,
>
> Thank you for your interest in D' Econo-Space. Unfortunately, we're unable to accommodate your request for **[dates]**, as the room is already reserved for those dates.
>
> We'd love to host you another time — feel free to check other dates with us.
> — D' Econo-Space Team

---

## 5. Answering guests on Messenger

Guests reach you through the **D' Econo-Space near CBEC** Facebook Page inbox. Common messages:

- *"Is [date] available?"* → check the Sheet for that room + dates, then reply.
- *"I already paid"* → ask for the screenshot, then follow step ② above.
- *"Can I change my room / dates?"* → check availability in the Sheet, update the row, reply.

Keep replies warm and simple. When unsure, it's always okay to say *"Let me check and get back to you."*

---

## 6. Weekly task — update the JW question

Every **Monday**, the JW rate question needs this week's song. You do it in **one place — the `Settings` tab of your Bookings Sheet** (no code, no website):

1. Find this week's **first midweek song number** (from wol.jw.org → *This Week at a Glance* → midweek meeting — or as the owner tells you).
2. Open **DES - Bookings** → click the **`Settings`** tab.
3. Update the two cells:
   - **JW Question** → fill in this week's dates, e.g. *"What is the first midweek song for the week of June 9–15?"*
   - **JW Answer** → the song number, e.g. *18*
4. Done — it auto-saves. The booking site picks it up within a few minutes.

> ⚠️ If you skip this, real JWs who enter this week's correct song get wrongly rejected. Do it **every Monday**.

---

## 7. Golden rules

- ✅ You only ever touch the **Sheet** and the **DES Email** (and Messenger).
- ❌ Never edit the booking **website**.
- ❌ You don't need GoHighLevel or any other tool — ignore them.
- 🆘 **When unsure** — a double-booking, a payment that doesn't match, a special request you can't decide — **don't guess. Ask [OWNER NAME] at [OWNER CONTACT].**

---

## 8. Quick reference

| Room | Sleeps | A/C | Starting Rate |
|------|--------|-----|---------------|
| Room D1 | up to 4 | Common AC | ₱750/night |
| Room D2 | up to 4 | Fan-cooled | ₱550/night |
| D' Whole Space | up to 8 | Common AC | ₱1,700/night |

**Check-in:** 2:00 PM  ·  **Check-out:** 12:00 NN
**Address:** Basak Agus Rd, Gisi, Lapu-Lapu, 6015 Cebu (near CBEC / Junrey's Store)
**Property contacts:** 0917.678.4871 · 0926.149.9002 · d.econospace.cebu@gmail.com

---

*Note: For now you send the emails yourself using the templates above. Some of these may become automatic later — you'll be told if anything changes.*
