# connorlennon.com

Static site: `index.html`, `styles.css`, `main.js`. No build step.

## Edit
All copy lives in `index.html`: the hero, five story chapters (each with stats and a "What it taught me" line),
the 39 → 19 day demo, "The short version" list, and contact. The email is the `data-email` on the copy button.

## Run locally
    python3 -m http.server 4321 -d site

## Deploy
Push to `main` on GitHub (GitHub Desktop → Commit → Push origin). Cloudflare picks it up and
redeploys connorlennon.com in about a minute. `wrangler.jsonc` in the repo root tells it to serve this folder.

## Brand
- The mark is "Cl" written as one unbroken pen line (`.mark` in the header, `favicon.svg`, `apple-touch-icon.png`). Hover it and it straightens out.
- Warm paper `#fbfaf7`, ink `#141413`, ink blue `#2b59c3` (`#7c9cff` in dark mode).
- Inter for reading, Instrument Serif italic for the human moments (chapter titles, lessons, signature).
- `og.png` is the link preview for LinkedIn, iMessage and Slack. `404.html` is the "stuck spot" page.

## Design notes (from emilkowalski/skills)
- Custom `ease-out` / `ease-in-out` curves; transitions list exact properties (never `all`).
- `scale(0.97)` press feedback on every button and row.
- Hover styles only under `(hover: hover) and (pointer: fine)` so taps don't stick.
- Page entrance: one animation per container, lead moves furthest, non-uniform delays (0 / 110 / 200 / 280ms).
- Tabs use the clip-path duplicate technique for a single seamless color change; keyboard switches are instant.
- Panel swap and copy-button morph use a small blur to bridge the crossfade; both labels share one grid cell so width never jumps.
- `tabular-nums` on the clock and dates; absolute dates for writing.
- Theme toggle is instant (transitions disabled for that frame).
- `prefers-reduced-motion`: opacity only, no movement.
- The pen line (the mark's stroke) runs down the story: a knot at each chapter, a waver through it, straight from the lesson on. Ink follows your reading position.
- Story ⇄ short version uses the View Transitions API: chapters in view fold into their résumé rows (pairs share `data-morph`). Falls back to a plain swap.
- Select any line in the story: it gets the marker and a "Send Connor this line" chip (a pre-filled mailto).
- Marker highlights sweep in as each chapter is read. Stats are static on purpose: numbers that just sit there read as more credible.
- Mobile floor: `viewport-fit=cover`, safe-area padding, `svh`, per-scheme `theme-color`, no tap highlight.
