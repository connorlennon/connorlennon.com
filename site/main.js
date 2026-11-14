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

function select(tab, { instant = false } = {}) {
  if (instant) tabsEl.setAttribute('data-instant', '');
  else tabsEl.removeAttribute('data-instant');
  const changed = tab.getAttribute('aria-selected') !== 'true';

  tabs.forEach((t, i) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    panels[i].hidden = !on;
    panels[i].classList.remove('is-showing');
    if (on && changed && !instant) {
      void panels[i].offsetWidth; // restart the fade if switched quickly
      panels[i].classList.add('is-showing');
    }
  });
  clipTo(tab);
}

select(tabs[0], { instant: true });
tabs.forEach((tab) => tab.addEventListener('click', (e) => select(tab, { instant: e.detail === 0 })));
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

/* ───── Stats count up the first time you see them ───── */
function countUp(el) {
  const text = el.textContent;
  const m = text.match(/(\d+(?:\.\d+)?)(?!.*\d)/); // the last number in the label
  if (!m || reduceMotion.matches) return;
  const target = parseFloat(m[1]);
  const decimals = (m[1].split('.')[1] || '').length;
  const before = text.slice(0, m.index);
  const after = text.slice(m.index + m[1].length);
  el.style.minWidth = `${el.offsetWidth}px`; // final width up front, so neighbors never shift
  const start = performance.now() + 250;
  const dur = 1100;
  const frame = (now) => {
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = before + (target * eased).toFixed(decimals) + after;
    if (t < 1) requestAnimationFrame(frame);
  };
  el.textContent = before + (0).toFixed(decimals) + after;
  requestAnimationFrame(frame);
}

/* ───── Chapters reveal once as they enter ───── */
const reveal = (el) => {
  if (el.classList.contains('is-in')) return;
  el.classList.add('is-in');
  el.querySelectorAll('.stats strong').forEach(countUp);
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

/* ───── Dock: where you are in the story ───── */
const dock = document.querySelector('.dock');
const chapters = [...document.querySelectorAll('[data-dock]')];
const track = dock.querySelector('.dock-track');
const labelsEl = dock.querySelector('.dock-labels');
const storyPanel = document.getElementById('panel-story');
const contact = document.getElementById('contact');

const stops = chapters.map((ch) => {
  const a = Object.assign(document.createElement('a'), { className: 'dock-stop', href: `#${ch.id}` });
  a.setAttribute('aria-label', ch.dataset.dock);
  a.addEventListener('click', () => reveal(ch));
  track.append(a);
  const label = Object.assign(document.createElement('span'), { textContent: ch.dataset.dock, className: 'is-after' });
  labelsEl.append(label);
  return { a, label };
});
dock.hidden = false;

let current = -1;
let dockTicking = false;
function updateDock() {
  dockTicking = false;
  const vh = innerHeight;
  const anchor = vh * 0.45;
  const tops = chapters.map((ch) => ch.getBoundingClientRect().top);
  const on = !storyPanel.hidden && tops[0] < vh * 0.7 && contact.getBoundingClientRect().top > vh * 0.75;
  dock.classList.toggle('is-on', on);
  dock.inert = !on;

  let i = 0;
  tops.forEach((top, k) => { if (top <= anchor) i = k; });
  const next = tops[i + 1];
  const frac = next === undefined ? 0 : Math.min(1, Math.max(0, (anchor - tops[i]) / (next - tops[i])));
  dock.style.setProperty('--p', (i + frac) / (chapters.length - 1));

  if (i === current) return;
  current = i;
  stops.forEach(({ a, label }, k) => {
    a.classList.toggle('is-past', k < i);
    if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    label.className = k < i ? 'is-before' : k > i ? 'is-after' : '';
  });
}
const queueDock = () => { if (!dockTicking) { dockTicking = true; requestAnimationFrame(updateDock); } };
addEventListener('scroll', queueDock, { passive: true });
addEventListener('resize', queueDock);
tabs.forEach((t) => t.addEventListener('click', queueDock));
updateDock();

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
