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

/* ───── Chapters reveal once as they enter ───── */
const revealables = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('is-in'));
}
// Jumping from the route straight to a chapter: show it immediately.
addEventListener('hashchange', () => document.querySelector(location.hash)?.classList.add('is-in'));

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
