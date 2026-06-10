# Process Map — Launching V2 Live (Session Summary)

What we did, start to finish: took the V2 site from "only on the laptop" to
"live on the internet at a branded address, with clean link previews."

---

## The journey at a glance

```
  START                                                                 DONE
   │                                                                      │
   ▼                                                                      ▼
 ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
 │ 1. CHECK │──►│ 2. NAME  │──►│ 3. PUBLISH│──►│ 4. DOMAIN│──►│ 5. SHARE LOOK │
 │  the     │   │  the new │   │  V2 to    │   │  attach  │   │  fix link     │
 │  hero    │   │  address │   │  the web  │   │  new URL │   │  previews     │
 └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────────┘
```

---

## Step-by-step (what happened and why)

### 1. Confirmed the hero image
- **Goal:** make sure the V2 homepage uses the `des-front2` photo.
- **Found:** it was already set as the hero — but only in the laptop's files.

### 2. Chose the new web address
- Matched it to the Facebook handle `d.econo.space.agus`.
- Web addresses can't use dots like Facebook usernames, so we used hyphens:
  **`d-econo-space-agus.vercel.app`**.

### 3. Published V2 to the internet
- **Discovered:** none of the V2 work had been saved to GitHub yet, so the live
  site couldn't show it. The live address was even broken (404).
- **Did:** saved the work to GitHub (`commit` + `push`), tested it on a private
  **preview** link first, then merged it into the **live** branch (`main`).
- **Result:** V2 went live — and this also fixed the broken (404) site, because
  the live branch had been missing all the images.

### 4. Attached the branded domain
- Renaming the Vercel project alone did **not** move the web address — they're
  separate things.
- **Did:** in Vercel → **Domains** → **Add Existing**, attached
  `d-econo-space-agus.vercel.app` (kept the old `des-booking-app.vercel.app` as a
  backup so no shared link breaks).
- **Result:** site live at the branded address.

### 5. Fixed the link preview ("ugly thumbnail")
- **Problem:** sharing the link on Messenger showed an old building photo with
  messy surroundings + a Meta AI watermark.
- **Why:** Facebook can't see the hero (it's a CSS background), so it grabbed the
  first ordinary image on the page — the old gallery photo.
- **Did:** built a clean 1200×630 share image from the entrance photo and added
  proper "Open Graph" tags telling Facebook exactly which image, title, and
  description to use — on the home, booking, and voucher pages.
- **Result:** shared links now show the clean entrance with the right title.

---

## Before vs. After

| | Before this session | After this session |
|---|---|---|
| V2 location | Only on the laptop | Live on the internet |
| Live site | Broken (404) | Working ✅ |
| Web address | `des-booking-app.vercel.app` | `d-econo-space-agus.vercel.app` (+ old as backup) |
| Hero image | des-front2 (local only) | des-front2 (live) ✅ |
| Shared-link thumbnail | Old messy photo + watermark | Clean entrance photo ✅ |
| Operator guide | None | `VERCEL-HANDBOOK.md` ✅ |

---

## The tools involved (who does what)

```
  LAPTOP (the files)  ──►  GITHUB (stores + versions)  ──►  VERCEL (builds + hosts)
                                                                   │
                                                                   ▼
                                                        d-econo-space-agus.vercel.app
                                                              (the live site)

  FACEBOOK PAGE  ──►  reads the site's "Open Graph" tags  ──►  shows the link preview
```

---

## What's live now

- **Site:** https://d-econo-space-agus.vercel.app (V2, des-front2 hero)
- **Backup address:** https://des-booking-app.vercel.app (still works)
- **Clean link previews:** home, booking, and voucher pages
- **Docs added:** `VERCEL-HANDBOOK.md` (how to run it) + this process map
