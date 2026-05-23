# Spin of Wheel

A "Spin the Wheel" web app that picks a random name from a Google Sheet and reveals their content (YouTube video or text) in a modal pop-up. Inspired by [wooclap's Spin the Wheel](https://www.wooclap.com/en/spin-the-wheel/).

Hosted at **https://wheel.8cores.com** (Mini PC, port 3087, behind Cloudflare Tunnel).

---

## Google Sheet format

| Column | Header | Notes |
|--------|--------|-------|
| A | `Name` | Display name. |
| B | `Contents` | YouTube URL → auto-play embed. Anything else → large plain text. |

- Row 1 must be a header row.
- **Sheet sharing:** must be set to **"Anyone with the link → Viewer"**. The app reads the CSV export endpoint directly; no OAuth.

---

## Features

- Paste a Google Sheet URL → **Load** → wheel renders with names.
- **Spin** → animated wheel lands on a random name → full-screen result view opens.
  - YouTube row: opens the original YouTube link directly from the **Spin** click.
  - Timestamped YouTube URLs are preserved when opening YouTube.
  - If the browser blocks the automatic YouTube window, the result view shows an **Open on YouTube** fallback.
  - Text row: full-screen large centered message + **Close** button.
- Closing the modal commits the pick (removed from wheel, added to "Already picked" list).
- **Reset** clears picks for the current sheet without re-fetching.
- **Reload** re-fetches the sheet (preserves picked-by-name) — use after editing rows.
- **Save** lets you bookmark sheet URLs with a label for quick switching mid-game.
- Picked list resets on page reload. Sheet URL and saved sheets persist in `localStorage`.

---

## Local development

```bash
npm install
npm run dev
# open http://localhost:3087
```

---

## Production deployment (Mini PC)

The Mini PC (`172.16.17.14`) already runs `minipc-tunnel` Cloudflare Tunnel. DNS + tunnel route for `wheel.8cores.com` have been configured (see [Cloudflare Setup](#cloudflare-setup) below).

```bash
# from this directory on your dev machine
scp -i ~/.ssh/id_ed25519_homeit -r . spteoh@172.16.17.14:~/docker-projects/SpinOfWheel/

# on the Mini PC
ssh -i ~/.ssh/id_ed25519_homeit spteoh@172.16.17.14
cd ~/docker-projects/SpinOfWheel
docker compose up -d --build

# verify
curl -I http://localhost:3087
curl -I https://wheel.8cores.com
```

---

## Cloudflare Setup

Already done via API (recorded here for reference / disaster recovery):

| Action | API call |
|--------|----------|
| DNS CNAME `wheel.8cores.com` → `eab1c846-66b5-4698-8777-e9b376b11a65.cfargotunnel.com` (proxied) | `POST /zones/{zoneId}/dns_records` |
| Tunnel ingress: `wheel.8cores.com → http://localhost:3087` (inserted before catch-all) | `PUT /accounts/{accountId}/cfd_tunnel/{tunnelId}/configurations` |

- **Zone:** 8cores.com (`5b1fad16b36b897f7c3ab8f8067bc250`)
- **Tunnel:** `minipc-tunnel` (`eab1c846-66b5-4698-8777-e9b376b11a65`)
- **Access policy:** none — public.

To add Email-OTP gate later (matches other 8cores apps): create a Cloudflare Access Application for `wheel.8cores.com` with policy `email == spteoh@gmail.com`, 180d session.

---

## Architecture notes

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind v3.
- **Runtime:** Single-page React app. CSV pulled client-side from `docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`. No backend fetch.
- **Picked state:** browser memory only (`useState`). Reload clears.
- **Persistence:** `localStorage` for sheet URL + saved sheets list. **Not** for picked names.
- **YouTube handling:** normal draw flow opens original YouTube URLs directly from the user-triggered **Spin** click, avoiding embed restrictions. The IFrame Player API path remains available as an in-app fallback when direct-open metadata is not present.

---

## File map

```
src/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Tailwind + base styles
│   └── page.tsx          # Main page, state, wiring
├── components/
│   ├── Wheel.tsx         # SVG spin wheel
│   ├── SheetInput.tsx    # URL bar + Load/Reload/Save + saved sheets
│   ├── ResultModal.tsx   # Modal with video/text + controls
│   └── PickedList.tsx    # Picked-names list
└── lib/
    ├── sheet.ts          # CSV fetch + parse (Name + Contents)
    └── youtube.ts        # URL detection + video ID extraction
```

---

## Edge cases & behavior

- **Sheet switch** (paste new URL → Load): picked list cleared.
- **Sheet reload** (same sheet ID): picked names preserved by name match. New rows become eligible; deleted picked names disappear silently.
- **Reset:** clears picks; sheet data untouched. Confirmation if > 3 names.
- **All picked:** Spin disabled; banner shows "All names picked — click Reset to start a new round."
- **No YouTube ID parsable:** treated as text.
- **Embedding disabled by owner:** no owner-side change is required because video draws open the original YouTube URL directly.
- **Modal close paths** (Esc / backdrop / Close button): all commit the pick + destroy player.
