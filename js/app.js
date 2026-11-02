import { db } from './db.js';

const app = document.getElementById('app');

// Soft pastels. Text on each colour is mixed from the colour itself in styles.css.
const PALETTE = ['#DCE8DA', '#F6DDD8', '#E4DFF3', '#F7EBC9', '#D9E8F5', '#FBE3CF', '#F3D9E6'];
const SURPRISE_COLOR = '#F7EBC9';
const EMOJIS = ['✨', '💼', '💖', '🌿', '🌈', '🔥', '🧠', '🌻', '🦋', '💪', '🏡', '🎯', '🌊', '☀️'];

const STARTER = [
  { name: 'Work', emoji: '💼', color: '#D9E8F5', items: [
    "I've solved hard problems before, and I'll solve this one.",
    "My worth isn't measured by one bad day.",
  ] },
  { name: 'Self-worth', emoji: '💖', color: '#F6DDD8', items: [
    'I am enough as I am.',
    'I deserve the kindness I give to others.',
  ] },
  { name: 'Anxiety', emoji: '🌿', color: '#DCE8DA', items: [
    'This feeling will pass.',
    'I can take this one breath at a time.',
  ] },
];

const icons = {
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg>',
};

const state = { themes: [], affirmations: [], deck: null };
let cleanup = null;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sortedThemes = () => [...state.themes].sort((a, b) => a.order - b.order);
const themeById = (id) => state.themes.find((t) => t.id === id);
const countFor = (themeId) => state.affirmations.filter((a) => a.themeId === themeId).length;
const countLabel = (n) => (n === 1 ? '1 affirmation' : `${n} affirmations`);
const isColor = (c) => /^#[0-9a-f]{6}$/i.test(c);

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function nextColor() {
  const used = new Set(state.themes.map((t) => t.color));
  return PALETTE.find((c) => !used.has(c)) || PALETTE[state.themes.length % PALETTE.length];
}

function firstGrapheme(str) {
  const s = str.trim();
  if (!s) return '';
  if (window.Intl && Intl.Segmenter) {
    const [first] = new Intl.Segmenter().segment(s);
    return first ? first.segment : '';
  }
  return Array.from(s)[0];
}

// Object URLs for stored photo blobs, reused between renders.
const photoUrls = new Map();
function photoUrl(a) {
  if (!a.photo) return null;
  const entry = photoUrls.get(a.id);
  if (entry && entry.blob === a.photo) return entry.url;
  if (entry) URL.revokeObjectURL(entry.url);
  const url = URL.createObjectURL(a.photo);
  photoUrls.set(a.id, { blob: a.photo, url });
  return url;
}

/* ---------- Navigation ---------- */

function go(path) {
  history.pushState({ inApp: true }, '', '#' + path);
  route();
}

// Goes back within the app when possible, so the phone's back gesture stays in sync.
function back(fallback = '/') {
  if (history.state && history.state.inApp) history.back();
  else replace(fallback);
}

function replace(path) {
  history.replaceState(null, '', '#' + path);
  route();
}

window.addEventListener('popstate', route);

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  window.scrollTo(0, 0);
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const [view, arg] = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  if (view === 'read' && arg) return renderReader(arg);
  if (view === 'new') return renderEditor(null, params.get('theme'));
  if (view === 'edit' && arg) return renderEditor(arg);
  if (view === 'themes') return renderThemes();
  if (view === 'theme' && arg) return renderThemeForm(arg === 'new' ? null : arg);
  if (view === 'settings') return renderSettings();
  renderHome();
}

function setView(name, html) {
  document.body.dataset.view = name;
  app.innerHTML = html;
  app.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => go(el.dataset.go)));
  app.querySelectorAll('[data-back]').forEach((el) => el.addEventListener('click', () => back(el.dataset.back)));
}

/* ---------- Home ---------- */

function renderHome() {
  const themes = sortedThemes();
  setView('home', `
    <header class="topbar">
      <h1 class="brand">Affirmations</h1>
      <button class="icon-btn" data-go="/settings" aria-label="Settings">${icons.settings}</button>
    </header>
    <p class="lede">What's weighing on you right now?</p>
    <section class="tiles">
      ${themes.map((t) => `
        <button class="tile" style="--c:${t.color}" data-read="${esc(t.id)}">
          <span class="tile-emoji" aria-hidden="true">${esc(t.emoji)}</span>
          <span class="tile-name">${esc(t.name)}</span>
          <span class="tile-count">${countLabel(countFor(t.id))}</span>
        </button>`).join('')}
      ${state.affirmations.length ? `
        <button class="tile" style="--c:${SURPRISE_COLOR}" data-read="all">
          <span class="tile-emoji" aria-hidden="true">🎲</span>
          <span class="tile-name">Surprise me</span>
          <span class="tile-count">From every theme</span>
        </button>` : ''}
    </section>
    ${themes.length ? '' : '<p class="empty">Nothing here yet. Add your first affirmation to begin.</p>'}
    <div class="fab-wrap"><button class="fab" data-go="/new">${icons.plus} Add affirmation</button></div>
  `);
  app.querySelectorAll('[data-read]').forEach((el) => el.addEventListener('click', () => {
    state.deck = null;
    go('/read/' + el.dataset.read);
  }));
}

/* ---------- Reader ---------- */

function newDeck(key) {
  const pool = key === 'all' ? state.affirmations : state.affirmations.filter((a) => a.themeId === key);
  return { key, ids: shuffle(pool.map((a) => a.id)), index: 0 };
}

function renderReader(key) {
  const theme = key === 'all' ? null : themeById(key);
  if (key !== 'all' && !theme) return replace('/');

  if (!state.deck || state.deck.key !== key) state.deck = newDeck(key);
  const deck = state.deck;
  // Drop anything deleted while editing from the reader.
  deck.ids = deck.ids.filter((id) => state.affirmations.some((a) => a.id === id));
  deck.index = Math.min(deck.index, deck.ids.length);

  const color = theme ? theme.color : SURPRISE_COLOR;
  setView('reader', `
    <div class="reader" style="--c:${color}">
      <header class="reader-bar">
        <button class="icon-btn" data-back="/" aria-label="Back to themes">${icons.close}</button>
        <span class="reader-title">${theme ? `${esc(theme.emoji)} ${esc(theme.name)}` : '🎲 Surprise me'}</span>
        <span class="counter" aria-live="polite"></span>
      </header>
      <div class="stage"></div>
      <nav class="reader-nav">
        <button class="nav-btn" data-prev aria-label="Previous affirmation">${icons.left}</button>
        <span class="hint">Swipe for the next one</span>
        <button class="nav-btn" data-next aria-label="Next affirmation">${icons.right}</button>
      </nav>
    </div>`);

  const stage = app.querySelector('.stage');
  const counter = app.querySelector('.counter');
  const nav = app.querySelector('.reader-nav');
  let animating = false;

  function cardHtml() {
    if (!deck.ids.length) {
      return `<article class="card card-end">
        <span class="end-emoji" aria-hidden="true">🌱</span>
        <p class="card-text size-lg">No affirmations here yet</p>
        <button class="btn btn-light" data-add>${icons.plus} Add one</button>
      </article>`;
    }
    if (deck.index >= deck.ids.length) {
      return `<article class="card card-end">
        <span class="end-emoji" aria-hidden="true">💛</span>
        <p class="card-text size-lg">You've read them all.<br>Be gentle with yourself.</p>
        <div class="end-actions">
          <button class="btn btn-light" data-shuffle>Shuffle again</button>
          <button class="btn btn-ghost" data-home>Back to themes</button>
        </div>
      </article>`;
    }
    const a = state.affirmations.find((x) => x.id === deck.ids[deck.index]);
    const t = themeById(a.themeId);
    const url = photoUrl(a);
    const size = a.text.length < 40 ? 'xl' : a.text.length < 90 ? 'lg' : 'md';
    return `<article class="card${url ? ' has-photo' : ''}" style="--c:${t ? t.color : color}">
      ${url ? `<img class="card-photo" src="${url}" alt="" draggable="false">` : ''}
      ${key === 'all' && t ? `<span class="card-chip">${esc(t.emoji)} ${esc(t.name)}</span>` : ''}
      <button class="icon-btn card-edit" data-edit="${esc(a.id)}" aria-label="Edit this affirmation">${icons.pencil}</button>
      <div class="card-body">
        <p class="card-text size-${size}">${esc(a.text)}</p>
        ${a.note ? `<button class="why-btn" data-why aria-expanded="false">Why this is true</button>
          <p class="card-note" hidden>${esc(a.note)}</p>` : ''}
      </div>
    </article>`;
  }

  function draw(dir = 0) {
    stage.innerHTML = cardHtml();
    const total = deck.ids.length;
    counter.textContent = total && deck.index < total ? `${deck.index + 1} of ${total}` : '';
    nav.hidden = !total;
    bindCard();
    const card = stage.querySelector('.card');
    if (dir && !reducedMotion()) {
      card.style.transition = 'none';
      card.style.transform = `translateX(${dir * 30}%) scale(.94)`;
      card.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.2), opacity .25s ease-out';
        card.style.transform = '';
        card.style.opacity = '';
      }));
    }
  }

  function bindCard() {
    const why = stage.querySelector('[data-why]');
    if (why) why.addEventListener('click', () => {
      const note = stage.querySelector('.card-note');
      note.hidden = !note.hidden;
      why.setAttribute('aria-expanded', String(!note.hidden));
      why.textContent = note.hidden ? 'Why this is true' : 'Hide';
    });
    stage.querySelector('[data-edit]')?.addEventListener('click', (e) => go('/edit/' + e.currentTarget.dataset.edit));
    stage.querySelector('[data-add]')?.addEventListener('click', () => go('/new' + (theme ? '?theme=' + encodeURIComponent(theme.id) : '')));
    stage.querySelector('[data-home]')?.addEventListener('click', () => back('/'));
    stage.querySelector('[data-shuffle]')?.addEventListener('click', () => {
      Object.assign(deck, newDeck(key));
      draw(1);
    });
  }

  function snapBack() {
    const card = stage.querySelector('.card');
    if (!card) return;
    card.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.3)';
    card.style.transform = '';
  }

  function moveTo(index, dir) {
    if (animating) return;
    const card = stage.querySelector('.card');
    if (reducedMotion()) { deck.index = index; draw(0); return; }
    animating = true;
    card.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
    card.style.transform = `translateX(${-dir * 110}%) rotate(${-dir * 10}deg)`;
    card.style.opacity = '0';
    setTimeout(() => { deck.index = index; draw(dir); animating = false; }, 190);
  }

  const next = () => (deck.index < deck.ids.length ? moveTo(deck.index + 1, 1) : snapBack());
  const prev = () => (deck.index > 0 ? moveTo(deck.index - 1, -1) : snapBack());

  // Swipe and tap handling.
  let touch = null;
  stage.addEventListener('pointerdown', (e) => {
    if (animating || e.target.closest('button, .card-note') || !deck.ids.length) return;
    touch = { x: e.clientX, y: e.clientY, time: Date.now(), id: e.pointerId, dragging: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    if (!touch.dragging) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        touch.dragging = true;
        stage.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 12) {
        touch = null;
        return;
      } else return;
    }
    const card = stage.querySelector('.card');
    card.style.transition = 'none';
    card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
  });
  stage.addEventListener('pointerup', (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    const t = touch;
    touch = null;
    const dx = e.clientX - t.x;
    if (t.dragging) {
      if (dx < -70) next();
      else if (dx > 70) prev();
      else snapBack();
    } else if (Date.now() - t.time < 400) {
      const box = stage.getBoundingClientRect();
      if (e.clientX - box.left < box.width * 0.3) prev();
      else next();
    }
  });
  stage.addEventListener('pointercancel', () => {
    if (touch && touch.dragging) snapBack();
    touch = null;
  });

  app.querySelector('[data-next]').addEventListener('click', next);
  app.querySelector('[data-prev]').addEventListener('click', prev);

  const onKey = (e) => {
    if (document.querySelector('.dialog-backdrop')) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') back('/');
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);

  draw(0);
}

/* ---------- Add / edit affirmation ---------- */

function renderEditor(id, presetThemeId) {
  const existing = id ? state.affirmations.find((a) => a.id === id) : null;
  if (id && !existing) return replace('/');

  let themeId = existing ? existing.themeId
    : themeById(presetThemeId) ? presetThemeId
    : sortedThemes()[0]?.id || null;
  let photo = existing ? existing.photo : null;
  let previewUrl = null;

  setView('editor', `
    <header class="topbar">
      <button class="text-btn" data-cancel>Cancel</button>
      <h2 class="topbar-title">${existing ? 'Edit affirmation' : 'New affirmation'}</h2>
      <button class="text-btn strong" data-save>Save</button>
    </header>
    <form class="form" novalidate>
      <label class="field">
        <span class="label">Affirmation</span>
        <textarea name="text" rows="3" maxlength="300" placeholder="I have handled hard things before.">${esc(existing?.text)}</textarea>
        <span class="error" data-error="text" hidden>Write your affirmation first.</span>
      </label>
      <div class="field">
        <span class="label" id="theme-label">Theme</span>
        <div class="chips" role="radiogroup" aria-labelledby="theme-label"></div>
        <span class="error" data-error="theme" hidden>Pick a theme, or add a new one.</span>
      </div>
      <label class="field">
        <span class="label">Why this is true for me <em>optional</em></span>
        <textarea name="note" rows="4" maxlength="1000" placeholder="A memory or a reason that proves it…">${esc(existing?.note)}</textarea>
      </label>
      <div class="field">
        <span class="label">Photo <em>optional</em></span>
        <div class="photo-field"></div>
        <input type="file" accept="image/*" hidden data-file>
      </div>
      <button class="btn btn-primary block" type="submit">Save affirmation</button>
      ${existing ? '<button class="btn btn-danger-text block" type="button" data-delete>Delete affirmation</button>' : ''}
    </form>`);

  const form = app.querySelector('form');
  const chips = app.querySelector('.chips');
  const photoField = app.querySelector('.photo-field');
  const fileInput = app.querySelector('[data-file]');
  const showError = (name, show) => { app.querySelector(`[data-error="${name}"]`).hidden = !show; };

  function drawChips() {
    chips.innerHTML = sortedThemes().map((t) => `
      <button type="button" class="chip" role="radio" style="--c:${t.color}" aria-checked="${t.id === themeId}" data-theme="${esc(t.id)}">
        ${esc(t.emoji)} ${esc(t.name)}
      </button>`).join('') + `<button type="button" class="chip chip-new" data-new-theme>${icons.plus} New theme</button>`;
    chips.querySelectorAll('[data-theme]').forEach((el) => el.addEventListener('click', () => {
      themeId = el.dataset.theme;
      showError('theme', false);
      drawChips();
    }));
    chips.querySelector('[data-new-theme]').addEventListener('click', async () => {
      const result = await dialog({
        title: 'New theme',
        body: '<label class="field"><span class="label">Name</span><input type="text" name="name" maxlength="40" placeholder="e.g. Friendships" autocomplete="off"></label>',
        actions: [{ label: 'Add theme', value: 'ok', kind: 'primary' }, { label: 'Cancel', value: null }],
      });
      const name = result.value && result.data.name.trim();
      if (!name) return;
      const theme = await createTheme({ name, emoji: '✨', color: nextColor() });
      themeId = theme.id;
      showError('theme', false);
      drawChips();
    });
  }

  function drawPhoto() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    if (photo) {
      previewUrl = URL.createObjectURL(photo);
      photoField.innerHTML = `
        <div class="photo-preview"><img src="${previewUrl}" alt="Chosen photo"></div>
        <div class="photo-actions">
          <button type="button" class="btn btn-secondary" data-pick>Change photo</button>
          <button type="button" class="btn btn-danger-text" data-remove>Remove</button>
        </div>`;
      photoField.querySelector('[data-remove]').addEventListener('click', () => { photo = null; drawPhoto(); });
    } else {
      photoField.innerHTML = `<button type="button" class="photo-add" data-pick>${icons.photo} Add a photo</button>`;
    }
    photoField.querySelector('[data-pick]').addEventListener('click', () => fileInput.click());
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    photoField.innerHTML = '<p class="muted">Preparing photo…</p>';
    try {
      photo = await resizeImage(file);
    } catch {
      toast("That photo couldn't be opened. Try a different one.");
    }
    drawPhoto();
  });

  async function save() {
    const text = form.elements.text.value.trim();
    showError('text', !text);
    showError('theme', !themeId);
    if (!text) { form.elements.text.focus(); return; }
    if (!themeId) return;
    const a = {
      id: existing ? existing.id : uid(),
      themeId,
      text,
      note: form.elements.note.value.trim(),
      photo,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    await db.write({ affirmations: { put: [a] } });
    state.affirmations = state.affirmations.filter((x) => x.id !== a.id).concat(a);
    if (!existing) requestPersistence();
    toast(existing ? 'Saved' : 'Affirmation added');
    back('/');
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  app.querySelector('[data-save]').addEventListener('click', save);
  app.querySelector('[data-cancel]').addEventListener('click', () => back('/'));
  app.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const ok = await confirmDialog('Delete this affirmation?', 'This can\'t be undone.', 'Delete', true);
    if (!ok) return;
    await db.write({ affirmations: { delete: [existing.id] } });
    state.affirmations = state.affirmations.filter((x) => x.id !== existing.id);
    toast('Affirmation deleted');
    back('/');
  });

  cleanup = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  drawChips();
  drawPhoto();
  if (!existing) form.elements.text.focus();
}

async function resizeImage(file, max = 1400) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await loadImage(file);
  }
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  if (source.close) source.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read photo'))), 'image/jpeg', 0.85);
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read photo')); };
    img.src = url;
  });
}

/* ---------- Themes ---------- */

async function createTheme({ name, emoji, color }) {
  const order = state.themes.reduce((max, t) => Math.max(max, t.order), -1) + 1;
  const theme = { id: uid(), name, emoji, color, order };
  await db.write({ themes: { put: [theme] } });
  state.themes.push(theme);
  return theme;
}

function renderThemes() {
  const themes = sortedThemes();
  setView('themes', `
    <header class="topbar">
      <button class="icon-btn" data-back="/settings" aria-label="Back">${icons.left}</button>
      <h2 class="topbar-title">Themes</h2>
      <span class="topbar-spacer"></span>
    </header>
    <p class="muted intro">Use the arrows to change the order on your home screen.</p>
    <ul class="theme-list">
      ${themes.map((t, i) => `
        <li class="theme-row" style="--c:${t.color}">
          <span class="swatch" aria-hidden="true">${esc(t.emoji)}</span>
          <span class="theme-row-text"><strong>${esc(t.name)}</strong><small>${countLabel(countFor(t.id))}</small></span>
          <button class="icon-btn small" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(t.name)} up">${icons.up}</button>
          <button class="icon-btn small" data-move="${i}" data-dir="1" ${i === themes.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(t.name)} down">${icons.down}</button>
          <button class="icon-btn small" data-go="/theme/${esc(t.id)}" aria-label="Edit ${esc(t.name)}">${icons.pencil}</button>
        </li>`).join('')}
    </ul>
    ${themes.length ? '' : '<p class="empty">No themes yet.</p>'}
    <button class="btn btn-primary block" data-go="/theme/new">${icons.plus} New theme</button>
  `);

  app.querySelectorAll('[data-move]').forEach((el) => el.addEventListener('click', async () => {
    const i = Number(el.dataset.move);
    const j = i + Number(el.dataset.dir);
    const list = sortedThemes();
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((t, order) => { t.order = order; });
    await db.write({ themes: { put: list } });
    renderThemes();
    app.querySelectorAll('[data-move]')[j * 2 + (j > i ? 1 : 0)]?.focus();
  }));
}

function renderThemeForm(id) {
  const existing = id ? themeById(id) : null;
  if (id && !existing) return replace('/themes');
  let color = existing ? existing.color : nextColor();

  setView('theme-form', `
    <header class="topbar">
      <button class="text-btn" data-back="/themes">Cancel</button>
      <h2 class="topbar-title">${existing ? 'Edit theme' : 'New theme'}</h2>
      <button class="text-btn strong" data-save>Save</button>
    </header>
    <form class="form" novalidate>
      <div class="theme-preview tile" style="--c:${color}">
        <span class="tile-emoji" aria-hidden="true">${esc(existing ? existing.emoji : '✨')}</span>
        <span class="tile-name">${esc(existing ? existing.name : 'New theme')}</span>
      </div>
      <label class="field">
        <span class="label">Name</span>
        <input type="text" name="name" maxlength="40" value="${esc(existing?.name)}" placeholder="e.g. Friendships" autocomplete="off">
        <span class="error" data-error="name" hidden>Give your theme a name.</span>
      </label>
      <div class="field">
        <label class="label" for="emoji-input">Emoji</label>
        <input type="text" id="emoji-input" name="emoji" maxlength="8" value="${esc(existing ? existing.emoji : '✨')}" class="emoji-input" autocomplete="off">
        <div class="emoji-row">
          ${EMOJIS.map((e) => `<button type="button" class="emoji-opt" data-emoji="${e}" aria-label="Use ${e}">${e}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="label" id="color-label">Colour</span>
        <div class="swatches" role="radiogroup" aria-labelledby="color-label">
          ${PALETTE.map((c) => `<button type="button" class="swatch-opt" role="radio" style="--c:${c}" data-color="${c}" aria-checked="${c === color}" aria-label="Colour ${c}"></button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary block" type="submit">Save theme</button>
      ${existing ? '<button class="btn btn-danger-text block" type="button" data-delete>Delete theme</button>' : ''}
    </form>`);

  const form = app.querySelector('form');
  const preview = app.querySelector('.theme-preview');
  const updatePreview = () => {
    preview.style.setProperty('--c', color);
    preview.querySelector('.tile-emoji').textContent = firstGrapheme(form.elements.emoji.value) || '✨';
    preview.querySelector('.tile-name').textContent = form.elements.name.value.trim() || 'New theme';
  };
  form.elements.name.addEventListener('input', updatePreview);
  form.elements.emoji.addEventListener('input', updatePreview);
  app.querySelectorAll('[data-emoji]').forEach((el) => el.addEventListener('click', () => {
    form.elements.emoji.value = el.dataset.emoji;
    updatePreview();
  }));
  app.querySelectorAll('[data-color]').forEach((el) => el.addEventListener('click', () => {
    color = el.dataset.color;
    app.querySelectorAll('[data-color]').forEach((s) => s.setAttribute('aria-checked', String(s === el)));
    updatePreview();
  }));

  async function save() {
    const name = form.elements.name.value.trim();
    app.querySelector('[data-error="name"]').hidden = !!name;
    if (!name) { form.elements.name.focus(); return; }
    const emoji = firstGrapheme(form.elements.emoji.value) || '✨';
    if (existing) {
      Object.assign(existing, { name, emoji, color });
      await db.write({ themes: { put: [existing] } });
    } else {
      await createTheme({ name, emoji, color });
    }
    toast('Theme saved');
    back('/themes');
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  app.querySelector('[data-save]').addEventListener('click', save);
  app.querySelector('[data-delete]')?.addEventListener('click', () => deleteTheme(existing));
  if (!existing) form.elements.name.focus();
}

async function deleteTheme(theme) {
  const items = state.affirmations.filter((a) => a.themeId === theme.id);
  const others = sortedThemes().filter((t) => t.id !== theme.id);
  let moveTo = null;

  if (!items.length) {
    if (!await confirmDialog(`Delete "${theme.name}"?`, 'This theme has no affirmations.', 'Delete theme', true)) return;
  } else {
    const result = await dialog({
      title: `Delete "${theme.name}"?`,
      body: `<p>It has ${countLabel(items.length)}. What should happen to ${items.length === 1 ? 'it' : 'them'}?</p>
        ${others.length ? `<label class="field"><span class="label">Move to</span>
          <select name="moveTo">${others.map((t) => `<option value="${esc(t.id)}">${esc(t.emoji)} ${esc(t.name)}</option>`).join('')}</select></label>` : ''}`,
      actions: [
        ...(others.length ? [{ label: 'Move them, then delete theme', value: 'move', kind: 'primary' }] : []),
        { label: `Delete theme and ${items.length === 1 ? 'its affirmation' : 'its affirmations'}`, value: 'delete', kind: 'danger' },
        { label: 'Cancel', value: null },
      ],
    });
    if (!result.value) return;
    if (result.value === 'move') moveTo = result.data.moveTo;
  }

  const moved = moveTo ? items.map((a) => ({ ...a, themeId: moveTo })) : [];
  await db.write({
    themes: { delete: [theme.id] },
    affirmations: moveTo ? { put: moved } : { delete: items.map((a) => a.id) },
  });
  state.themes = state.themes.filter((t) => t.id !== theme.id);
  const ids = new Set(items.map((a) => a.id));
  state.affirmations = state.affirmations.filter((a) => !ids.has(a.id)).concat(moved);
  state.deck = null;
  toast('Theme deleted');
  back('/themes');
}

/* ---------- Settings, backup and restore ---------- */

async function renderSettings() {
  const last = await db.getMeta('lastBackup');
  const stale = state.affirmations.length && (!last || Date.now() - last > 30 * 24 * 3600 * 1000);
  const lastText = last
    ? new Date(last).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : 'never';

  setView('settings', `
    <header class="topbar">
      <button class="icon-btn" data-back="/" aria-label="Back">${icons.left}</button>
      <h2 class="topbar-title">Settings</h2>
      <span class="topbar-spacer"></span>
    </header>
    <section class="panel">
      <button class="row-link" data-go="/themes"><span>🎨 Manage themes</span>${icons.right}</button>
    </section>
    <section class="panel">
      <h3>Backup</h3>
      <p class="muted">Your affirmations are saved only on this device. Save a backup now and then so you never lose them, or to move them to another device.</p>
      <p class="backup-status${stale ? ' warn' : ''}">Last backup: ${lastText}${stale ? ' — time for a new one' : ''}</p>
      <button class="btn btn-primary block" data-export>Save a backup</button>
      <button class="btn btn-secondary block" data-import>Restore from a backup</button>
      <input type="file" accept="application/json,.json" hidden data-import-file>
    </section>
  `);

  const importInput = app.querySelector('[data-import-file]');
  app.querySelector('[data-export]').addEventListener('click', exportBackup);
  app.querySelector('[data-import]').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (file) importBackup(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function exportBackup() {
  const affirmations = await Promise.all(state.affirmations.map(async (a) => ({
    ...a, photo: a.photo ? await blobToDataUrl(a.photo) : null,
  })));
  const data = { app: 'affirmations', version: 1, exportedAt: new Date().toISOString(), themes: state.themes, affirmations };
  const name = `affirmations-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });

  // On phones the share sheet is the reliable way to save a file ("Save to Files").
  let shared = false;
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Affirmations backup' });
      shared = true;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  if (!shared) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await db.setMeta('lastBackup', Date.now());
  toast('Backup saved');
  if (document.body.dataset.view === 'settings') renderSettings();
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    data = null;
  }
  if (!data || data.app !== 'affirmations' || !Array.isArray(data.themes) || !Array.isArray(data.affirmations)) {
    toast("That file isn't an Affirmations backup.");
    return;
  }

  const result = await dialog({
    title: 'Restore backup',
    body: `<p>This backup has ${data.themes.length === 1 ? '1 theme' : `${data.themes.length} themes`} and ${countLabel(data.affirmations.length)}.</p>
      <p>"Replace everything" deletes what's on this device first.</p>`,
    actions: [
      { label: 'Add to what I have', value: 'merge', kind: 'primary' },
      { label: 'Replace everything', value: 'replace', kind: 'danger' },
      { label: 'Cancel', value: null },
    ],
  });
  if (!result.value) return;
  const replaceAll = result.value === 'replace';

  const existingThemes = new Set(replaceAll ? [] : state.themes.map((t) => t.id));
  const existingItems = new Set(replaceAll ? [] : state.affirmations.map((a) => a.id));
  let order = replaceAll ? 0 : state.themes.reduce((max, t) => Math.max(max, t.order), -1) + 1;

  const themes = data.themes
    .filter((t) => t && t.id && t.name && !existingThemes.has(String(t.id)))
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map((t) => ({
      id: String(t.id),
      name: String(t.name).slice(0, 40),
      emoji: firstGrapheme(String(t.emoji || '')) || '✨',
      color: isColor(t.color) ? t.color : PALETTE[0],
      order: order++,
    }));
  const validThemes = new Set([...existingThemes, ...themes.map((t) => t.id)]);

  const affirmations = [];
  for (const a of data.affirmations) {
    if (!a || !a.id || !a.text || existingItems.has(String(a.id)) || !validThemes.has(String(a.themeId))) continue;
    let photo = null;
    if (typeof a.photo === 'string' && a.photo.startsWith('data:image/')) {
      try { photo = await (await fetch(a.photo)).blob(); } catch { photo = null; }
    }
    affirmations.push({
      id: String(a.id),
      themeId: String(a.themeId),
      text: String(a.text).slice(0, 300),
      note: String(a.note || '').slice(0, 1000),
      photo,
      createdAt: Number(a.createdAt) || Date.now(),
      updatedAt: Number(a.updatedAt) || Date.now(),
    });
  }

  await db.write({
    themes: { clear: replaceAll, put: themes },
    affirmations: { clear: replaceAll, put: affirmations },
  });
  await load();
  state.deck = null;
  toast(`Restored ${countLabel(affirmations.length)}`);
  renderSettings();
}

/* ---------- Dialogs and toasts ---------- */

function dialog({ title, body = '', actions }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `
      <form class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 id="dialog-title">${esc(title)}</h3>
        <div class="dialog-body">${body}</div>
        <div class="dialog-actions">
          ${actions.map((a, i) => `<button type="button" class="btn block ${
            a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'
          }" data-i="${i}">${esc(a.label)}</button>`).join('')}
        </div>
      </form>`;
    const form = wrap.querySelector('form');

    const finish = (value) => {
      const data = Object.fromEntries(new FormData(form));
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      previousFocus?.focus?.();
      resolve({ value, data });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
    };

    wrap.querySelectorAll('[data-i]').forEach((btn) => btn.addEventListener('click', () => finish(actions[btn.dataset.i].value)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const primary = actions.find((a) => a.kind === 'primary');
      if (primary) finish(primary.value);
    });
    wrap.addEventListener('click', (e) => { if (e.target === wrap) finish(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(wrap);
    (form.querySelector('input, select') || form.querySelector('button')).focus();
  });
}

async function confirmDialog(title, text, confirmLabel, danger = false) {
  const result = await dialog({
    title,
    body: `<p>${esc(text)}</p>`,
    actions: [
      { label: confirmLabel, value: true, kind: danger ? 'danger' : 'primary' },
      { label: 'Cancel', value: false },
    ],
  });
  return !!result.value;
}

function toast(message) {
  document.querySelectorAll('.toast').forEach((el) => el.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

/* ---------- Start-up ---------- */

function requestPersistence() {
  // Asks the browser not to clear our storage when space runs low.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

async function seedIfNeeded() {
  if (await db.getMeta('seeded')) return;
  const themes = [];
  const affirmations = [];
  STARTER.forEach((s, i) => {
    const theme = { id: uid(), name: s.name, emoji: s.emoji, color: s.color, order: i };
    themes.push(theme);
    s.items.forEach((text, j) => affirmations.push({
      id: uid(), themeId: theme.id, text, note: '', photo: null, createdAt: Date.now() + j, updatedAt: Date.now() + j,
    }));
  });
  await db.write({
    themes: { put: themes },
    affirmations: { put: affirmations },
    meta: { put: [{ key: 'seeded', value: true }] },
  });
  requestPersistence();
}

async function load() {
  [state.themes, state.affirmations] = await Promise.all([db.getAll('themes'), db.getAll('affirmations')]);
}

async function start() {
  try {
    await seedIfNeeded();
    await load();
  } catch {
    app.innerHTML = `<div class="fatal">
      <h1>Can't open your affirmations</h1>
      <p>This browser isn't letting the app save data. If you're in a private window, open it in a normal one.</p>
    </div>`;
    return;
  }
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
