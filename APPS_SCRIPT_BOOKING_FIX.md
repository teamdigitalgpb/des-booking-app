# Apps Script: Booking Submission & Availability Handler

## Instructions

1. Open your Apps Script project in your browser: **[https://script.google.com/home](https://script.google.com/home)**
   *(Make sure you are signed in with the property account: `d.econospace.cebu@gmail.com`)*
2. Click on the project connected to your **DES - Bookings** Google Sheet (or open your Google Sheet → click **Extensions** → **Apps Script**).
3. Open `Code.gs`.
4. Locate the `doPost(e)` function and find the `switch (action)` statement (where `case 'voucher':` or `case 'bookingAbandoned':` are located).
5. Copy the code from [APPS_SCRIPT_BOOKING_CODE.js](file:///C:/Users/Daniella%20Zarraga/.gemini/antigravity/scratch/des-booking-app/APPS_SCRIPT_BOOKING_CODE.js):
   - Paste the `case 'booking':` block into your `switch (action)` block.
   - Paste or update the `doGet(e)` function below `doPost(e)`.
6. Press **Ctrl + S** (or **Cmd + S**) to save.
7. **Important:** Do NOT click "Deploy" or create a new deployment. Saving directly updates the current script while keeping your active URL (`.../exec`) intact.

---

## What This Does

1. **Auto-saves bookings to Google Sheets:**
   Appends every website reservation to your "Bookings" (or "DES - Bookings") sheet tab with status **New**.
2. **Column G Email Support:**
   Places the guest email in Column G, perfectly aligning with the staff email workflow in `ASSISTANT-HANDBOOK.md`.
3. **Double-Booking Protection:**
   Uses Google's `LockService` to prevent simultaneous customer submissions from overwriting each other.
4. **Live Calendar Synchronization:**
   The `doGet(e)` function provides live availability data to `availability.html` so newly booked dates immediately show as reserved on the website.
5. **Instant Staff Alert:**
   Sends an email notification to `d.econospace.cebu@gmail.com` immediately upon booking submission.
