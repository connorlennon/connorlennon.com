#!/usr/bin/env python3
"""Builds the per-chapter share pages and their link-preview images.

Each chapter gets site/<id>/index.html (its own title, description and image, then a redirect
to the chapter on the home page) and site/og/<id>.png (1200x630).

Run it again whenever a chapter title or lesson changes:

    python3 tools/share-pages.py

Needs Google Chrome installed (used headless to render the images). Not part of the deploy.
"""
import html
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
ORIGIN = "https://connorlennon.com"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# id, kicker, chapter title, the line shown big on the card, which route stop lights up (0-3)
CHAPTERS = [
    ("columbia", "Prologue · Columbia, SC", "A finance kid who liked people more than spreadsheets",
     "The interesting part was always the people behind the numbers.", 0),
    ("new-york", "01 · BrightEdge · New York, NY", "Cold calls in a very strange year",
     "Everyone is busy. Respect their time, and get to the point.", 1),
    ("limerick", "02 · Cobblestone · Limerick, PA", "Starting something from zero",
     "Trust doesn't scale. You earn it one person at a time.", 2),
    ("charlotte", "03 · BrightDime · Charlotte, NC", "Learning where people get stuck",
     "The data tells you where people get stuck. The people tell you why.", 3),
    ("truist", "04 · Truist · Charlotte, NC", "Making a big bank feel a little faster",
     "The slow part is rarely where the problem starts.", 3),
]

PAGE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} · Connor Lennon</title>
  <meta name="description" content="{line}" />
  <meta name="robots" content="noindex, follow" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{line} A chapter from Connor Lennon's story." />
  <meta property="og:url" content="{origin}/{id}/" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="{origin}/og/{id}.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{line}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="{origin}/" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta http-equiv="refresh" content="0; url=/#{id}" />
  <script>location.replace('/#{id}');</script>
</head>
<body>
  <p><a href="/#{id}">{title}</a>, a chapter from Connor Lennon's story.</p>
</body>
</html>
"""

CARD = """<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face {{ font-family: "Inter"; font-weight: 400 600; src: url("{fonts}/inter-normal-latin.woff2") format("woff2"); }}
@font-face {{ font-family: "Instrument Serif"; font-style: italic; src: url("{fonts}/instrument-serif-italic-latin.woff2") format("woff2"); }}
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: 1200px; height: 630px; }}
body {{ background: #fbfaf7; color: #141413; font-family: "Inter", sans-serif; padding: 80px 88px 72px; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }}
.head {{ display: flex; align-items: center; gap: 24px; }}
.mark {{ width: 72px; height: 72px; border-radius: 20px; background: #141413; display: grid; place-items: center; }}
.mark svg {{ width: 50px; height: 50px; }}
.name {{ font-size: 25px; font-weight: 600; letter-spacing: -0.01em; }}
.kicker {{ font-size: 21px; color: #6b6a66; margin-top: 4px; }}
.line {{ flex: 1; display: flex; align-items: center; font-family: "Instrument Serif", serif; font-style: italic; font-size: {size}px; line-height: 1.08; letter-spacing: -0.012em; text-wrap: balance; padding-right: 40px; }}
.foot {{ display: flex; justify-content: space-between; align-items: center; font-size: 22px; font-weight: 500; color: #a3a19b; }}
.route {{ position: relative; display: flex; gap: 96px; }}
.route::before {{ content: ""; position: absolute; left: 8px; right: 8px; top: 50%; border-top: 2px dashed #a3a19b; }}
.stop {{ position: relative; width: 18px; height: 18px; border-radius: 99px; background: #fbfaf7; border: 2px solid #a3a19b; }}
.stop.on {{ background: #2b59c3; border-color: #2b59c3; box-shadow: 0 0 0 7px rgba(43, 89, 195, 0.14); }}
</style></head><body>
<div class="head">
  <div class="mark"><svg viewBox="0 0 32 32" fill="none" stroke="#6b93ee" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10.5C12 8.5 6 9 6 15.5S11 23.5 14.5 21C17.5 18.8 20.5 13 21 9.5C21.4 6.5 18.6 6.2 18.3 9.5C18 13 18 19.5 20 22.5C21.5 24.5 24.5 24 26.5 21.5"/></svg></div>
  <div><div class="name">Connor Lennon</div><div class="kicker">{kicker}</div></div>
</div>
<div class="line">{line}</div>
<div class="foot"><span>connorlennon.com</span><div class="route">{stops}</div></div>
</body></html>
"""


def main():
    (SITE / "og").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for cid, kicker, title, line, stop in CHAPTERS:
            page_dir = SITE / cid
            page_dir.mkdir(exist_ok=True)
            (page_dir / "index.html").write_text(
                PAGE.format(id=cid, origin=ORIGIN, title=html.escape(title, quote=True), line=html.escape(line, quote=True)),
                encoding="utf-8",
            )
            stops = "".join(f'<span class="stop{" on" if i == stop else ""}"></span>' for i in range(4))
            card = pathlib.Path(tmp) / f"{cid}.html"
            card.write_text(
                CARD.format(fonts=(SITE / "fonts").as_uri(), kicker=html.escape(kicker), line=html.escape(line),
                            stops=stops, size=84 if len(line) < 56 else 74),
                encoding="utf-8",
            )
            out = SITE / "og" / f"{cid}.png"
            subprocess.run(
                [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                 "--window-size=1200,630", "--virtual-time-budget=3000", f"--user-data-dir={tmp}/profile",
                 f"--screenshot={out}", card.as_uri()],
                check=True, capture_output=True, timeout=120,
            )
            print(f"{cid}: page + {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
