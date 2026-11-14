# connorlennon.com

Static site: `index.html`, `styles.css`, `main.js`. No build step.

## Edit
All copy lives in `index.html`: the hero, five story chapters (each with stats and a "What it taught me" line),
the 39 → 19 day demo, "The short version" list, and contact. The email is the `data-email` on the copy button.

## Run locally
    python3 -m http.server 4321 -d site

## Deploy (Vercel)
    npx vercel deploy site --prod
Then in Vercel → Project → Settings → Domains, add `connorlennon.com` and `www.connorlennon.com`,
and set the DNS records it shows at your registrar (A `76.76.21.21` for the apex, CNAME `cname.vercel-dns.com` for www).

Netlify or Cloudflare Pages work the same way: drag the `site` folder in, then add the custom domain.

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
- Mobile floor: `viewport-fit=cover`, safe-area padding, `svh`, per-scheme `theme-color`, no tap highlight.
