// connorlennon.com — small, dependency-free interactions.

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ───── Theme toggle (instant, no fading) ───── */
const themeBtn = document.querySelector('.theme-toggle');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme || (systemDark.matches ? 'dark' : 'light');

themeBtn.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.classList.add('no-transitions');
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.content = next === 'dark' ? '#0c0c0d' : '#fbfaf7';
  });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transitions')));
});

/* ───── Local clock ───── */
const clock = document.querySelector('.clock');
const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
const tick = () => { clock.textContent = fmt.format(new Date()); };
tick();
setInterval(tick, 15_000);
document.querySelector('.year').textContent = new Date().getFullYear();

/* ───── Story / Short version tabs ───── */
const tabsEl = document.querySelector('.tabs');
const tabs = [...tabsEl.querySelectorAll('[role="tab"]')];
const overlay = tabsEl.querySelector('.tab-list--active');
const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

function clipTo(tab) {
  const total = overlay.offsetWidth;
  const left = tab.offsetLeft;
  const right = total - (left + tab.offsetWidth);
  overlay.style.clipPath = `inset(0 ${(right / total) * 100}% 0 ${(left / total) * 100}% round 999px)`;
}

function select(tab, { instant = false, fade = true } = {}) {
  if (instant) tabsEl.setAttribute('data-instant', '');
  else tabsEl.removeAttribute('data-instant');
  const changed = tab.getAttribute('aria-selected') !== 'true';

  tabs.forEach((t, i) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    panels[i].hidden = !on;
    panels[i].classList.remove('is-showing');
    if (on && changed && !instant && fade) {
      void panels[i].offsetWidth; // restart the fade if switched quickly
      panels[i].classList.add('is-showing');
    }
  });
  clipTo(tab);
}

// Switching by pointer: the chapters on screen fold into their résumé rows (and back).
// Pairs share a data-morph key; they're named only for the length of the switch.
const inView = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};
const morphEls = (panel) => [...panel.querySelectorAll('[data-morph]')].filter(inView);
const keepTabsInView = () => {
  const top = tabsEl.getBoundingClientRect().top;
  if (top < 16 || top > innerHeight * 0.6) scrollTo({ top: scrollY + top - 32, behavior: 'instant' });
};

function switchTo(tab) {
  if (tab.getAttribute('aria-selected') === 'true') return;
  if (!document.startViewTransition || reduceMotion.matches) {
    select(tab);
    keepTabsInView();
    return;
  }
  const from = panels[tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')];
  const to = panels[tabs.indexOf(tab)];
  const named = morphEls(from);
  const name = (el) => { el.style.viewTransitionName = `morph-${el.dataset.morph}`; };
  named.forEach(name);
  const transition = document.startViewTransition(() => {
    named.forEach((el) => { el.style.viewTransitionName = ''; });
    select(tab, { fade: false });
    keepTabsInView();
    const arriving = morphEls(to);
    arriving.forEach(name);
    named.push(...arriving);
  });
  transition.finished.finally(() => named.forEach((el) => { el.style.viewTransitionName = ''; }));
}

select(tabs[0], { instant: true });
tabs.forEach((tab) => tab.addEventListener('click', (e) => {
  if (e.detail === 0) select(tab, { instant: true }); // keyboard actions never animate
  else switchTo(tab);
}));
tabsEl.addEventListener('keydown', (e) => {
  const i = tabs.indexOf(document.activeElement);
  if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault();
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  next.focus();
  select(next, { instant: true }); // keyboard actions never animate
});
const reclip = () => {
  tabsEl.setAttribute('data-instant', '');
  clipTo(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
};
document.fonts?.ready.then(reclip);
addEventListener('resize', reclip);

/* ───── The mark comes loose on hover (or a tap) ───── */
const brand = document.querySelector('.brand');
brand.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') brand.classList.add('is-loose'); });
brand.addEventListener('pointerleave', () => brand.classList.remove('is-loose'));
brand.addEventListener('focus', () => brand.classList.add('is-loose'));
brand.addEventListener('blur', () => brand.classList.remove('is-loose'));

/* ───── Poke "stuck" ───── */
const stuck = document.querySelector('[data-wiggle]');
const jiggle = () => {
  if (reduceMotion.matches || stuck.classList.contains('is-jiggling')) return;
  stuck.classList.add('is-jiggling');
  setTimeout(() => stuck.classList.remove('is-jiggling'), 950);
};
stuck.addEventListener('click', jiggle);
stuck.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') jiggle(); });

/* ───── Chapters reveal once as they enter ───── */
const reveal = (el) => {
  if (el.classList.contains('is-in')) return;
  el.classList.add('is-in');
};
const revealables = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('is-in'));
}
// Jumping from the route straight to a chapter: show it immediately.
addEventListener('hashchange', () => {
  const el = location.hash.length > 1 && document.querySelector(location.hash);
  if (el?.hasAttribute('data-reveal')) reveal(el);
});

/* ───── The pen line: the mark's stroke, carried down the story ─────
   One continuous path in the left gutter. It ties a knot at the top of each chapter,
   wavers through the part where things were stuck, and runs straight from the lesson on.
   The ink follows your reading position and never un-draws. */
const story = document.querySelector('.story');
const storyChapters = [...story.querySelectorAll('.chapter')];
const SVG_NS = 'http://www.w3.org/2000/svg';
const spine = document.createElementNS(SVG_NS, 'svg');
spine.setAttribute('class', 'spine');
spine.setAttribute('aria-hidden', 'true');
const spineTrack = document.createElementNS(SVG_NS, 'path');
spineTrack.setAttribute('class', 'spine-track');
const spineInk = document.createElementNS(SVG_NS, 'path');
spineInk.setAttribute('class', 'spine-ink');
const spineStart = document.createElementNS(SVG_NS, 'circle');
spineStart.setAttribute('class', 'spine-start');
spineStart.setAttribute('r', 2.5);
spine.append(spineTrack, spineInk, spineStart);
story.prepend(spine);

const CX = 6; // the gutter's centre line, where the chapter dots used to sit
const f = (n) => n.toFixed(1);
const smooth = (t) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

// A hand-drawn waver between two heights: two slow sines, eased to nothing at both ends.
function waver(y0, y1) {
  let d = '';
  for (let y = y0 + 3; y < y1; y += 3) {
    const k = y - y0;
    const env = smooth(k / 36) * smooth((y1 - y) / 36);
    const x = CX + env * (2.4 * Math.sin(k / 10.2) + 1.0 * Math.sin(k / 5.9 + 1.3));
    d += `L${f(x)} ${f(y)}`;
  }
  return `${d}L${CX} ${f(y1)}`;
}
// A pigtail knot: down, round to the right, back over itself and on.
const knot = (y) =>
  `C${CX} ${f(y + 2)} ${CX + 13} ${f(y + 8)} ${CX + 13} ${f(y - 2)}` +
  `C${CX + 13} ${f(y - 10)} ${CX} ${f(y - 8)} ${CX} ${f(y + 5)}`;

let spineStops = [];   // [{ y, len }] — how much line is drawn when reading reaches y
let spineTotal = 0;
let spineDrawn = 0;    // what's on the page now
let spineTarget = 0;   // where the ink is heading
let spineRaf = 0;

function buildSpine() {
  const height = story.offsetHeight;
  if (!height) return; // the story tab is hidden
  spine.setAttribute('viewBox', `0 0 34 ${height}`);
  spine.setAttribute('width', 34);
  spine.setAttribute('height', height);

  const startY = storyChapters[0].offsetTop + 11;
  let d = `M${CX} ${startY}`;
  spineStops = [{ y: startY, len: 0 }];
  const stop = (y) => {
    spineInk.setAttribute('d', d);
    spineStops.push({ y, len: spineInk.getTotalLength() });
  };

  storyChapters.forEach((ch, i) => {
    const top = ch.offsetTop;
    const bottom = top + ch.offsetHeight;
    const lesson = ch.querySelector('.lesson');
    const settleY = lesson ? top + lesson.offsetTop + 6 : bottom;
    const nextCh = storyChapters[i + 1];
    let y = startY;
    if (i > 0) {
      y = top + 11;
      d += `L${CX} ${y - 10}`;
      stop(y - 10);
      d += knot(y);
      y += 5;
      stop(y + 30); // the knot ties over a little extra scroll, so it reads as a flourish
    }
    d += waver(y, settleY);
    stop(settleY);
    d += `L${CX} ${nextCh ? nextCh.offsetTop + 1 : bottom}`;
  });
  stop(height);

  spineTrack.setAttribute('d', d);
  spineInk.setAttribute('d', d);
  spineTotal = spineInk.getTotalLength();
  spineInk.style.strokeDasharray = spineTotal;
  spineStart.setAttribute('cx', CX);
  spineStart.setAttribute('cy', startY);
  story.classList.add('has-spine');
  updateSpine(true);
}

function paintSpine() {
  spineInk.style.strokeDashoffset = Math.max(0, spineTotal - spineDrawn);
  spineStart.style.opacity = spineDrawn > 0 ? 1 : 0;
}
function chaseSpine() {
  spineDrawn += (spineTarget - spineDrawn) * 0.18;
  if (spineTarget - spineDrawn < 0.5) spineDrawn = spineTarget;
  paintSpine();
  spineRaf = spineDrawn < spineTarget ? requestAnimationFrame(chaseSpine) : 0;
}
function updateSpine(snap = false) {
  if (!spineTotal || !story.offsetHeight) return;
  if (reduceMotion.matches) { spineDrawn = spineTarget = spineTotal; paintSpine(); return; }
  // The pen tip sits a little below the middle of the screen.
  const y = innerHeight * 0.58 - story.getBoundingClientRect().top;
  let len = 0;
  for (let i = 1; i < spineStops.length; i++) {
    const a = spineStops[i - 1];
    const b = spineStops[i];
    if (y >= b.y) { len = b.len; continue; }
    if (y > a.y) len = a.len + ((y - a.y) / (b.y - a.y)) * (b.len - a.len);
    break;
  }
  spineTarget = Math.max(spineTarget, len);
  if (snap) { spineDrawn = Math.min(spineDrawn, spineTotal); }
  if (!spineRaf && spineDrawn < spineTarget) spineRaf = requestAnimationFrame(chaseSpine);
  else if (snap) paintSpine();
}

buildSpine();
// Fonts loading, the window resizing, or the tab coming back all change the chapter heights.
if ('ResizeObserver' in window) new ResizeObserver(() => buildSpine()).observe(story);
else addEventListener('resize', buildSpine);
addEventListener('scroll', () => updateSpine(), { passive: true });
addEventListener('resize', () => updateSpine());

/* ───── The shrinking wait (39 → 19 days) ───── */
const demo = document.querySelector('[data-demo]');
const segButtons = demo.querySelectorAll('.seg button');

function setDemo(state) {
  demo.dataset.state = state;
  segButtons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === state));
}
setDemo('before');
segButtons.forEach((b) => b.addEventListener('click', () => {
  autoplayed = true; // the reader took over; never autoplay after that
  clearTimeout(autoplayTimer);
  setDemo(b.dataset.v);
}));

// Play it once when it's comfortably in view, after the chapter has settled.
let autoplayed = false;
let autoplayTimer;
if ('IntersectionObserver' in window) {
  const demoIO = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || autoplayed) return;
    autoplayed = true;
    demoIO.disconnect();
    autoplayTimer = setTimeout(() => setDemo('after'), reduceMotion.matches ? 0 : 700);
  }, { threshold: 0.7 });
  demoIO.observe(demo);
}

/* ───── Copy email ───── */
const copyBtn = document.querySelector('.copy');
const copyContent = copyBtn.querySelector('.copy-content');
const status = document.getElementById('copy-status');
let resetTimer;

function legacyCopy(text) {
  const ta = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
  ta.style.cssText = 'position:fixed;top:0;opacity:0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  return ok;
}

copyBtn.addEventListener('click', () => {
  const email = copyBtn.dataset.email;
  const ok = legacyCopy(email);
  navigator.clipboard?.writeText(email).catch(() => {});
  if (!ok && !navigator.clipboard) { location.href = `mailto:${email}`; return; }
  copyBtn.dataset.state = 'done';
  copyContent.dataset.state = 'done';
  status.textContent = 'Email copied to clipboard';
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    copyBtn.dataset.state = 'idle';
    copyContent.dataset.state = 'idle';
    status.textContent = '';
  }, 1800);
});

/* ───── Highlight a line in the story, send it over ─────
   Select any sentence: it gets the marker, and a chip offers to email it. */
const quoteLayer = Object.assign(document.createElement('div'), { className: 'quote-layer' });
quoteLayer.setAttribute('aria-hidden', 'true');
const quoteChip = Object.assign(document.createElement('a'), { className: 'quote-chip', hidden: true });
quoteChip.innerHTML = 'Send Connor this line <span aria-hidden="true">↗</span>';
document.body.append(quoteLayer, quoteChip);
const coarse = matchMedia('(pointer: coarse)');
let quoteText = '';
let quoteTimer;
let selecting = false;

function clearQuote() {
  if (!quoteText) return;
  quoteText = '';
  quoteLayer.replaceChildren();
  quoteChip.classList.remove('is-on');
  quoteChip.hidden = true;
}

// One box per line of selected text (page coordinates), ignoring the gaps between blocks.
function selectedLines(range) {
  const rootNode = range.commonAncestorContainer;
  const walker = document.createTreeWalker(rootNode.nodeType === 3 ? rootNode.parentNode : rootNode, NodeFilter.SHOW_TEXT);
  const rects = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node) || !node.data.trim()) continue;
    const part = document.createRange();
    part.setStart(node, node === range.startContainer ? range.startOffset : 0);
    part.setEnd(node, node === range.endContainer ? range.endOffset : node.length);
    rects.push(...part.getClientRects());
  }
  const lines = [];
  rects
    .filter((r) => r.width > 1 && r.height > 1)
    .sort((a, b) => a.top - b.top || a.left - b.left)
    .forEach((r) => {
      const last = lines[lines.length - 1];
      const sameLine = last && Math.abs((last.top + last.bottom) / 2 - (r.top + r.bottom) / 2) < 6 && r.left - last.right < 14;
      if (sameLine) {
        last.right = Math.max(last.right, r.right);
        last.top = Math.min(last.top, r.top);
        last.bottom = Math.max(last.bottom, r.bottom);
      } else {
        lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
    });
  return lines;
}

function settleQuote() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return clearQuote();
  const range = sel.getRangeAt(0);
  if (!story.contains(range.commonAncestorContainer)) return clearQuote();
  const text = sel.toString().replace(/\s+/g, ' ').trim();
  if (text.length < 12) return clearQuote();
  if (text === quoteText) return;
  const lines = selectedLines(range);
  if (!lines.length) return clearQuote();
  clearQuote();
  quoteText = text;

  // The marker: the same half-height band the chapters use, swept in line by line.
  quoteLayer.replaceChildren(...lines.map((l, i) => {
    const band = Object.assign(document.createElement('span'), { className: 'quote-band' });
    const h = l.bottom - l.top;
    band.style.cssText = `left:${l.left + scrollX - 2}px;top:${l.top + scrollY + h * 0.5}px;width:${l.right - l.left + 4}px;height:${h * 0.44}px;--i:${Math.min(i, 5)}`;
    return band;
  }));

  const quote = text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text;
  quoteChip.href = `mailto:${copyBtn.dataset.email}?subject=${encodeURIComponent('A line from your site')}&body=${encodeURIComponent(`“${quote}”\n\n`)}`;
  quoteChip.hidden = false;
  const first = lines[0];
  const last = lines[lines.length - 1];
  const w = quoteChip.offsetWidth;
  const h = quoteChip.offsetHeight;
  const mid = (Math.min(...lines.map((l) => l.left)) + Math.max(...lines.map((l) => l.right))) / 2;
  const left = Math.min(Math.max(8, mid - w / 2), root.clientWidth - w - 8);
  // Above the selection with a mouse; below it on touch, clear of the system's own menu.
  const above = !coarse.matches && first.top - h - 10 > 8;
  const top = above ? first.top - h - 10 : last.bottom + (coarse.matches ? 34 : 10);
  quoteChip.style.left = `${left + scrollX}px`;
  quoteChip.style.top = `${top + scrollY}px`;
  quoteChip.style.transformOrigin = above ? '50% 100%' : '50% 0%';
  void quoteChip.offsetWidth;
  quoteChip.classList.add('is-on');
}

const queueQuote = (ms) => { clearTimeout(quoteTimer); quoteTimer = setTimeout(settleQuote, ms); };
document.addEventListener('selectionchange', () => {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || sel.toString().replace(/\s+/g, ' ').trim() !== quoteText) clearQuote();
  if (!selecting) queueQuote(350); // keyboard and touch-handle selections settle on a pause
});
addEventListener('pointerdown', (e) => { if (!quoteChip.contains(e.target)) selecting = true; });
['pointerup', 'pointercancel'].forEach((type) => addEventListener(type, () => { selecting = false; queueQuote(60); }));
quoteChip.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection when the chip is pressed
addEventListener('resize', clearQuote);
addEventListener('keydown', (e) => { if (e.key === 'Escape') clearQuote(); });
tabs.forEach((t) => t.addEventListener('click', clearQuote));

