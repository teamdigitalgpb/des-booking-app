# D' Econo-Space (DES) Booking App

Budget accommodation booking system for D' Econo-Space, Cebu.

**Domain:** des.prime-assistant.com  
**Hosting:** Cloudflare Pages  
**CRM:** GoHighLevel (sub-account: 2P0dvOfUyN4ijmvG9KpL)

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page — rooms, rates, Book Now CTA |
| `booking.html` | Booking form with pricing calculator and GHL sync |
| `voucher.html` | 4-step voucher request form (JW / A2 / A19) |

## Setup

1. Copy `.env.example` to `.env` and fill in `GHL_CALENDAR_ID` after creating the calendar in GHL.
2. Never commit `.env` — it is listed in `.gitignore`.
3. Deploy: `wrangler pages deploy . --project-name=des-booking-app`

## API Key Rotation

Next due: **August 19, 2026**  
GHL > Settings > Private Integrations > DES Booking App > Rotate and expire later
