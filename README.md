# Spin the Wheel

A customizable web app that picks a random name from a Google Sheet and reveals that row's content. YouTube rows open directly on YouTube, and text rows appear as full-screen messages.

The app is built with Next.js, TypeScript, and Tailwind CSS. It has no backend requirement and does not need API keys.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3087`.

## Google Sheet Format

Create a Google Sheet with this structure:

| Column | Header | Notes |
|--------|--------|-------|
| A | `Name` | Display name on the wheel. |
| B | `Contents` | YouTube URL or plain text message. |

Requirements:
- Row 1 must be a header row.
- The sheet must be shared as **Anyone with the link -> Viewer**.
- Paste the normal Google Sheet URL into the app and click **Load**.

## Features

- Random wheel draw from a Google Sheet.
- Drawn names are removed from eligibility until **Reset**.
- **Reload** re-fetches the sheet while preserving picked names where possible.
- **Save** stores frequently used sheet URLs in browser `localStorage`.
- YouTube rows open the original YouTube link directly from the **Spin** click.
- Timestamped YouTube links such as `&t=68s` are preserved.
- Text rows show as large full-screen messages.
- Browser popup blocking is handled with a fallback **Open on YouTube** button.

## Customize

Copy `.env.example` to `.env.local` for local Next.js development:

```bash
cp .env.example .env.local
```

Then edit the public branding values:

```bash
NEXT_PUBLIC_APP_NAME="My Event Wheel"
NEXT_PUBLIC_APP_DESCRIPTION="Pick a random participant and reveal their content."
NEXT_PUBLIC_SITE_LABEL="example.com"
NEXT_PUBLIC_APP_CREDIT="by Your Team"
NEXT_PUBLIC_LOGO_SRC="/logo.png"
```

Other easy customization points:
- Replace `public/logo.png` with your own logo.
- Replace `public/sounds/spin.mp3` and `public/sounds/reveal.mp3` with your own sounds.
- Edit colors and layout in `src/app/globals.css` and the components under `src/components/`.
- Change Docker host port with `APP_PORT` in `.env` when using Docker Compose.

Do not commit `.env.local`; it is ignored by git. For Docker Compose, copy the same template to `.env` instead.

## Deploy

### Vercel

1. Fork or clone this repository.
2. Import it into Vercel as a Next.js project.
3. Add any `NEXT_PUBLIC_*` customization variables in Vercel project settings.
4. Deploy.

### Docker

```bash
cp .env.example .env
docker compose up -d --build
```

The app listens inside the container on port `3087`. By default it is exposed on host port `3087`; change `APP_PORT` in `.env` if needed.

### Any Node/Next.js Host

Use a host that supports Next.js:

```bash
npm install
npm run build
npm start
```

Set public customization values through your hosting provider's environment variable settings before building.

## Security Notes

- No Google API key is required.
- No YouTube API key is required.
- Sheet data is fetched client-side from Google's CSV export endpoint.
- Only use public `NEXT_PUBLIC_*` variables for browser-visible customization.
- Keep secrets out of `.env.local`, and never commit credentials.

## Architecture Notes

- **Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS.
- **Runtime:** Client-side app that fetches CSV from `docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`.
- **Persistence:** Browser `localStorage` for the sheet URL and saved sheets list.
- **Picked state:** Browser memory only; page reload clears picked names.
- **YouTube handling:** YouTube URLs open directly from the user-triggered **Spin** click to avoid embed restrictions.

## File Map

```text
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── Wheel.tsx
│   ├── SheetInput.tsx
│   ├── ResultModal.tsx
│   └── PickedList.tsx
└── lib/
    ├── appConfig.ts
    ├── sheet.ts
    ├── sound.ts
    └── youtube.ts
```
