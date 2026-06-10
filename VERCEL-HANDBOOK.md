# D' Econo-Space — Vercel Handbook

How the booking website lives on the internet, and what you (the operator) do to
run it day to day. Written for a non-coder. You never touch code — that's handled
for you. This explains the moving parts so nothing feels like magic.

---

## 1. The big picture — how an edit becomes a live website

```
  YOU / CLAUDE                GITHUB                      VERCEL                 GUESTS
  edit the files     ──►   stores the code     ──►   builds & publishes   ──►   see the
  (HTML/CSS/JS)            (the "main" branch)        the website              live site
                                                                              
  repo: teamdigitalgpb/des-booking-app          project: d-econospace-agus
```

**The golden rule:** Vercel watches the GitHub repo. The moment new code lands on
the **`main`** branch in GitHub, Vercel **automatically** rebuilds and publishes
the live site. You do not click "deploy" — it just happens, usually within ~30 seconds.

- **`main` branch  →  the LIVE site** (what guests see)
- **any other branch (e.g. `v2`)  →  a private PREVIEW** (a test link only logged-in
  team members can open — safe to experiment, guests never see it)

---

## 2. Your two URLs

| URL | What it is | Who can see it |
|---|---|---|
| **https://d-econo-space-agus.vercel.app** | The LIVE site (your main address — mirrors the FB handle) | Everyone (public) |
| https://des-booking-app.vercel.app | The original address — still live as a backup | Everyone (public) |

> Both addresses are live and show the same V2 site. **Share `d-econo-space-agus.vercel.app`**
> with guests going forward; the old one keeps working so nothing you've already shared breaks.

---

## 3. How to make a change go live (the normal flow)

You ask Claude for a change (e.g. "swap the hero image", "update the rates"). Then:

1. Claude edits the files and pushes them to GitHub's `main` branch.
2. Vercel sees the push and rebuilds automatically.
3. ~30–60 seconds later, the live site shows the change.

**Your only job:** after Claude says "pushed", wait a minute, then open the live
site and do a **hard refresh** to bypass your browser's cache:
- Mac: **Cmd + Shift + R**
- Windows: **Ctrl + Shift + R**

> Hard refresh reloads the *files* for the page you're on. It does **not** change
> the web address — if you're on the wrong URL, refreshing won't fix that.

---

## 4. How to check a deployment actually worked

In Vercel → **Deployments** tab. Read the top row:

| Column | What "good" looks like |
|---|---|
| **Status** | 🟢 **Ready** (green). 🔴 Error = the build failed, site unchanged. ⏳ Building = wait. |
| **Environment** | 🔵 **Production** = this is the live one. "Preview" = a test branch, not live. |
| **Branch** | `main` for the live site. |
| **Commit / time** | Matches the change you just made, timestamped "just now". |

If the top row is **🟢 Ready + 🔵 Production + main**, the live site is updated.

---

## 5. If something breaks — instant rollback

Vercel keeps every past version. To put a previous good version back live:

1. **Deployments** tab → find the last version that worked (🟢 Ready, on `main`).
2. Click the **⋯** (three dots) on that row → **Promote to Production**
   (older menus call it **Redeploy** / **Rollback**).
3. Confirm. The live site reverts in seconds.

> This is safe and reversible. You can always promote a different version afterward.
> Nothing is ever permanently lost.

---

## 6. Weekly task — updating the JW verification answer (NO code needed)

The booking form asks the weekly JW question. The answer is pulled **live from a
Google Sheet**, so you change it yourself every week — no Claude, no code.

1. Open the **DES bookings** Google Sheet → the **Settings** tab.
2. Update the **JW Question** and **JW Answer** cells for the new week.
3. Save. The website picks it up automatically the next time the form loads.

> If the Sheet is ever unreachable, the site quietly falls back to the last answer
> built into the code, so the form never breaks.

---

## 7. Adding / changing a `.vercel.app` address (reference)

> ✅ Already done — `d-econo-space-agus.vercel.app` is attached and live.
> Keep this as a reference for adding another address later.

Note: renaming the *project* does **not** move the *domain* — they're separate.
To attach a new address:

1. Vercel → your project → **Settings → Domains** (left sidebar: **Domains**).
2. In the "Add Domain" box, type: **`d-econo-space-agus.vercel.app`** → **Add**.
3. If it's available, Vercel attaches it and it goes live within a minute.
   - If Vercel says it's **taken** (someone else globally claimed it), pick a
     fallback like `d-econo-space-agus-cebu.vercel.app` and add that instead.
4. (Optional) Set it as the **primary** domain so it's the default link.

> The old `des-booking-app.vercel.app` keeps working too — so any link you've
> already shared won't break. You just gain the nicer new address.

---

## 8. Where everything lives (quick reference)

| Thing | Where |
|---|---|
| The code | GitHub: `github.com/teamdigitalgpb/des-booking-app` |
| The hosting / live site | Vercel project: **d-econospace-agus** (team: teamdigitalgpb) |
| Live site URL | https://des-booking-app.vercel.app |
| Weekly JW answer | Google Sheet "DES bookings" → **Settings** tab |
| Booking submissions | Make.com webhook → Google Sheet "DES - Bookings" |
| Guest chat | Facebook Messenger (`m.me/d.econo.space.agus`) |

---

## 9. Glossary (plain English)

- **Repo (repository)** — the folder of website files, stored on GitHub.
- **Branch** — a version line. `main` = the real live site. `v2` = a draft.
- **Commit** — one saved batch of changes, with a short description.
- **Push** — sending committed changes up to GitHub.
- **Deployment** — one published copy of the site that Vercel built from a commit.
- **Production** — the live deployment guests actually see.
- **Preview** — a private test deployment for a non-`main` branch.
- **Hard refresh** — reload that ignores the browser cache (Cmd/Ctrl + Shift + R).
