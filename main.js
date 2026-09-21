import * as THREE from 'three';
import {
  SERVER_CONFIG, SERVER_SAVE_COOLDOWN,
  rand, randRange, clamp, formatNum, escapeHtml,
  ACCOUNTS_KEY, MAX_ACCOUNTS,
  RANK_NAMES, RANK_MULT, UPGRADE_COSTS, COLOR_VALUES,
  SHOP_ITEMS, THEMES, FOUNTAIN_SKINS, LOOT_REWARDS,
  RARITY_RANK, createShopState, shopCost
} from './config.js';

import {
  scene, camera, renderer, camState, applyOrbitCamera,
  applyTheme, applyFountainSkin, updateFountainLevel, updateFountainSkinAnim,
  updateWorld, updateParticles, updatePopups, burstParticles, spawnPopup,
  updateLightingSmooth, getThemeTexture
} from './engine.js';

import {
  spawnPollo as spawnPolloEntityExternal,
  updatePollos, updateCrocs, updateFloatingEggs, syncInstances,
  spawnFloatingEggsAt
} from './entities.js';

/* ============================================================
   LOADING SCREEN
   ============================================================ */
const loadingSteps = [
  { pct: 8, label: 'Ładowanie silnika...' },
  { pct: 22, label: 'Generowanie wysp...' },
  { pct: 40, label: 'Budowanie fontanny...' },
  { pct: 55, label: 'Tworzenie Pollo...' },
  { pct: 70, label: 'Hodowanie Cocodrillo...' },
  { pct: 85, label: 'Łączenie z serwerem...' },
  { pct: 96, label: 'Prawie gotowe...' },
  { pct: 100, label: 'Start!' }
];
let _loadingIdx = 0;
function advanceLoading() {
  if (_loadingIdx >= loadingSteps.length) return;
  const step = loadingSteps[_loadingIdx++];
  const fill = document.getElementById('loadingBarFill');
  const status = document.getElementById('loadingStatus');
  if (fill) fill.style.width = step.pct + '%';
  if (status) status.textContent = step.label;
}
function finishLoading() {
  const scr = document.getElementById('loadingScreen');
  if (scr) {
    scr.classList.add('done');
    setTimeout(() => { scr.style.display = 'none'; }, 1000);
  }
}
setInterval(advanceLoading, 220);

/* ============================================================
   PWA
   ============================================================ */
(function setupPWA() {
  const iconSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs><radialGradient id="g" cx="35%" cy="30%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="60%" stop-color="#ffd75e"/><stop offset="100%" stop-color="#d89312"/>
      </radialGradient></defs>
      <rect width="512" height="512" rx="110" fill="url(#g)"/>
      <text x="50%" y="60%" text-anchor="middle" font-size="300" font-family="sans-serif">🐔</text>
    </svg>
  `)}`;
  const manifest = {
    name: 'Pollo & Cocodrillo', short_name: 'Pollo', description: 'Symulator Fontanny',
    start_url: './index.html', scope: './', display: 'fullscreen', orientation: 'any',
    background_color: '#0a1428', theme_color: '#0a1428',
    icons: [
      { src: iconSvg, sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: iconSvg, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
    ]
  };
  try {
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest'; link.href = url;
    document.head.appendChild(link);
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon'; appleIcon.href = iconSvg;
    document.head.appendChild(appleIcon);
  } catch (e) {}
})();

const UI_REF_HEIGHT = 700;
function updateUIScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const root = document.documentElement;
  if (w > h && h <= UI_REF_HEIGHT) {
    const scale = h / UI_REF_HEIGHT;
    root.style.setProperty('--ui-scale', scale.toFixed(4));
    root.style.setProperty('--ui-w', (w / scale) + 'px');
    root.style.setProperty('--ui-h', (h / scale) + 'px');
  } else {
    root.style.setProperty('--ui-scale', '1');
    root.style.removeProperty('--ui-w');
    root.style.removeProperty('--ui-h');
  }
}
window.addEventListener('resize', updateUIScale);
window.addEventListener('orientationchange', () => setTimeout(updateUIScale, 100));
updateUIScale();

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btnInstall');
  if (btn) btn.classList.add('show');
});
document.getElementById('btnInstall').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') document.getElementById('btnInstall').classList.remove('show');
  deferredPrompt = null;
});

/* ============================================================
   SERVER API
   ============================================================ */
const ServerAPI = (() => {
  const base = 'https://api.jsonbin.io/v3/b';
  const online = SERVER_CONFIG.useServer && SERVER_CONFIG.binId && SERVER_CONFIG.apiKey;
  async function fetchAll() {
    if (!online) return null;
    try {
      const r = await fetch(`${base}/${SERVER_CONFIG.binId}/latest`, { headers: { 'X-Master-Key': SERVER_CONFIG.apiKey } });
      if (!r.ok) return null;
      const j = await r.json();
      return j.record || { players: {} };
    } catch (e) { return null; }
  }
  async function writeAll(data) {
    if (!online) return false;
    try {
      const r = await fetch(`${base}/${SERVER_CONFIG.binId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': SERVER_CONFIG.apiKey },
        body: JSON.stringify(data)
      });
      return r.ok;
    } catch (e) { return false; }
  }
  async function upsertPlayer(playerId, payload) {
    if (!online) return false;
    const data = await fetchAll() || { version: 1, players: {} };
    if (!data.players) data.players = {};
    data.players[playerId] = payload;
    return await writeAll(data);
  }
  async function deletePlayer(playerId) {
    if (!online) return false;
    const data = await fetchAll();
    if (!data || !data.players) return false;
    delete data.players[playerId];
    return await writeAll(data);
  }
  async function getLeaderboard() {
    if (!online) return [];
    const data = await fetchAll();
    if (!data || !data.players) return [];
    return Object.entries(data.players).map(([id, p]) => ({ id, ...p }));
  }
  return { online, fetchAll, writeAll, upsertPlayer, deletePlayer, getLeaderboard };
})();

/* ============================================================
   STATE
   ============================================================ */
function getRankMult() { return RANK_MULT[Math.min(state.level - 1, RANK_MULT.length - 1)]; }
function nextUpgradeCost() { return state.level >= RANK_NAMES.length ? null : UPGRADE_COSTS[state.level - 1]; }

let playerId = null;
let SAVE_KEY = 'pollo_cocodrillo_v3';

function getAccounts() { try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; } catch (e) { return []; } }
function setAccounts(arr) { try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(arr)); } catch (e) {} }
function newAccountId() { return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

(function migrateLegacySave() {
  const accounts = getAccounts();
  if (accounts.length > 0) return;
  const legacy = localStorage.getItem('pollo_cocodrillo_v3');
  const legacyPid = localStorage.getItem('pollo_pid');
  if (!legacy) return;
  try {
    const data = JSON.parse(legacy);
    const id = legacyPid || newAccountId();
    const name = (data.playerName && data.playerName !== 'Pollo') ? data.playerName : 'Gracz';
    setAccounts([{ id, name, createdAt: Date.now() }]);
    localStorage.setItem('pollo_cocodrillo_v3_' + id, legacy);
    localStorage.removeItem('pollo_cocodrillo_v3');
  } catch (e) {}
})();

const state = {
  gold: 0, eggs: 0, level: 1,
  hudDirty: true, dirty: false,
  playerName: 'Pollo', introSeen: false,
  nightMode: true,
  currentTheme: 'default',
  unlockedThemes: ['default'],
  currentFountainSkin: 'default',
  unlockedFountainSkins: ['default'],
  eggProgress: 0, colorIndex: 0, clickCount: 0,
  stats: { crocsFallen: 0, pollosSpawned: 0, lootboxesOpened: 0, startedAt: Date.now(), playtime: 0 }
};
const shopState = createShopState();

/* ============================================================
   SAVE / LOAD
   ============================================================ */
let pendingServerSave = false;
let lastServerSaveTime = 0;

function buildSavePayload() {
  return {
    playerName: state.playerName, gold: state.gold, eggs: state.eggs, level: state.level,
    shop: shopState, night: state.nightMode,
    currentTheme: state.currentTheme, unlockedThemes: state.unlockedThemes,
    currentFountainSkin: state.currentFountainSkin,
    unlockedFountainSkins: state.unlockedFountainSkins,
    volume: bgMusic.volume, sfxVolume: sfxVolume,
    eggProgress: state.eggProgress, colorIndex: state.colorIndex, clickCount: state.clickCount,
    stats: state.stats, updatedAt: Date.now()
  };
}
function saveLocal() {
  if (!playerId) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...buildSavePayload(), introSeen: state.introSeen }));
  } catch (e) {}
}
function saveGame() {
  if (!playerId) return;
  saveLocal();
  pendingServerSave = true;
  updateSaveBtnState();
}
async function saveToServer() {
  if (!playerId) return false;
  if (!ServerAPI.online) { showToast('Tryb offline', 'warn'); return false; }
  const now = Date.now();
  const elapsed = now - lastServerSaveTime;
  if (elapsed < SERVER_SAVE_COOLDOWN) {
    const wait = Math.ceil((SERVER_SAVE_COOLDOWN - elapsed) / 1000);
    showToast(`Poczekaj ${wait}s`, 'warn');
    updateSaveBtnState();
    return false;
  }
  setSaveBtnMode('saving');
  const payload = buildSavePayload();
  const ok = await ServerAPI.upsertPlayer(playerId, payload);
  if (ok) {
    lastServerSaveTime = Date.now();
    pendingServerSave = false;
    setSaveBtnMode('done');
    showToast('✅ Zapisano!', 'ok');
    refreshLeaderboard();
    setTimeout(() => setSaveBtnMode('idle'), 2500);
  } else {
    setSaveBtnMode('error');
    showToast('❌ Błąd zapisu', 'err');
    setTimeout(() => setSaveBtnMode('idle'), 2500);
  }
  return ok;
}
function setSaveBtnMode(mode) {
  const btn = document.getElementById('lbSaveBtn');
  if (!btn) return;
  btn.classList.remove('dirty', 'cooling', 'done', 'error');
  btn.disabled = false;
  if (mode === 'saving') { btn.textContent = '⏳ Zapisuję...'; btn.disabled = true; }
  else if (mode === 'done') { btn.classList.add('done'); btn.textContent = '✅ Zapisano!'; btn.disabled = true; }
  else if (mode === 'error') { btn.classList.add('error'); btn.textContent = '❌ Błąd'; btn.disabled = true; }
  else updateSaveBtnState();
}
function updateSaveBtnState() {
  const btn = document.getElementById('lbSaveBtn');
  if (!btn) return;
  btn.classList.remove('dirty', 'cooling', 'done', 'error');
  btn.disabled = false;
  if (!playerId) { btn.textContent = '💾 Zapisz na serwer'; btn.disabled = true; return; }
  if (!ServerAPI.online) { btn.textContent = '⚠️ Tryb offline'; btn.classList.add('cooling'); return; }
  const now = Date.now();
  const elapsed = now - lastServerSaveTime;
  if (elapsed < SERVER_SAVE_COOLDOWN) {
    const wait = Math.ceil((SERVER_SAVE_COOLDOWN - elapsed) / 1000);
    btn.textContent = `⏳ Poczekaj ${wait}s`;
    btn.classList.add('cooling');
    btn.disabled = true;
  } else if (pendingServerSave) {
    btn.textContent = '💾 ZAPISZ NA SERWER';
    btn.classList.add('dirty');
  } else {
    btn.textContent = '✅ Wszystko zapisane';
    btn.classList.add('done');
    btn.disabled = true;
  }
}
let _toastTimer = null;
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
setInterval(() => {
  const btn = document.getElementById('lbSaveBtn');
  if (!btn) return;
  if (lastServerSaveTime > 0 && Date.now() - lastServerSaveTime < SERVER_SAVE_COOLDOWN) updateSaveBtnState();
}, 1000);

function resetStateForAccount() {
  state.gold = 0; state.eggs = 0; state.level = 1;
  state.hudDirty = true; state.dirty = false;
  state.playerName = 'Pollo'; state.introSeen = true;
  state.nightMode = true;
  state.currentTheme = 'default';
  state.unlockedThemes = ['default'];
  state.currentFountainSkin = 'default';
  state.unlockedFountainSkins = ['default'];
  state.eggProgress = 0; state.colorIndex = 0; state.clickCount = 0;
  state.stats = { crocsFallen: 0, pollosSpawned: 0, lootboxesOpened: 0, startedAt: Date.now(), playtime: 0 };
  for (const k of Object.keys(shopState)) shopState[k] = 0;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.gold === 'number') state.gold = data.gold;
    if (typeof data.eggs === 'number') state.eggs = data.eggs;
    if (typeof data.level === 'number') state.level = clamp(data.level, 1, RANK_NAMES.length);
    if (data.shop) for (const k of Object.keys(shopState)) if (typeof data.shop[k] === 'number') shopState[k] = data.shop[k];
    state.nightMode = data.night !== undefined ? !!data.night : true;
    if (typeof data.currentTheme === 'string') state.currentTheme = data.currentTheme;
    if (Array.isArray(data.unlockedThemes)) state.unlockedThemes = data.unlockedThemes.filter(id => THEMES.some(t => t.id === id));
    if (!state.unlockedThemes.includes('default')) state.unlockedThemes.unshift('default');
    if (typeof data.currentFountainSkin === 'string') state.currentFountainSkin = data.currentFountainSkin;
    if (Array.isArray(data.unlockedFountainSkins)) state.unlockedFountainSkins = data.unlockedFountainSkins.filter(id => FOUNTAIN_SKINS.some(s => s.id === id));
    if (!state.unlockedFountainSkins.includes('default')) state.unlockedFountainSkins.unshift('default');
    if (typeof data.volume === 'number') {
      bgMusic.volume = data.volume;
      volumeSlider.value = data.volume;
      volumePct.textContent = Math.round(data.volume * 100) + '%';
    }
    if (typeof data.sfxVolume === 'number') {
      sfxVolume = data.sfxVolume;
      sfxSlider.value = data.sfxVolume;
      sfxPct.textContent = Math.round(data.sfxVolume * 100) + '%';
    }
    if (typeof data.eggProgress === 'number') state.eggProgress = data.eggProgress;
    if (typeof data.colorIndex === 'number') state.colorIndex = data.colorIndex;
    if (typeof data.clickCount === 'number') state.clickCount = data.clickCount;
    if (typeof data.playerName === 'string') state.playerName = data.playerName;
    state.introSeen = !!data.introSeen;
    if (data.stats) state.stats = { ...state.stats, ...data.stats };
  } catch (e) {}
}

function resetGame() {
  if (!confirm('Zresetować cały postęp?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  state.gold = 0; state.eggs = 0; state.level = 1;
  for (const k of Object.keys(shopState)) shopState[k] = 0;
  state.eggProgress = 0; state.nightMode = true;
  state.currentTheme = 'default';
  state.unlockedThemes = ['default'];
  state.currentFountainSkin = 'default';
  state.unlockedFountainSkins = ['default'];
  state.colorIndex = 0; state.clickCount = 0;
  state.stats = { crocsFallen: 0, pollosSpawned: 0, lootboxesOpened: 0, startedAt: Date.now(), playtime: 0 };
  applyTheme(state.currentTheme, state.nightMode);
  applyFountainSkin(state.currentFountainSkin);
  updateFountainLevel(state.level);
  state.hudDirty = true;
  saveGame();
  renderShop();
  Sound.pop();
}

function deleteFromServer() {
  if (!confirm('Usunąć zapis z serwera?')) return;
  ServerAPI.deletePlayer(playerId).then(() => {
    pendingServerSave = false;
    updateSaveBtnState();
    refreshLeaderboard();
    showToast('🗑️ Usunięto', 'ok');
  });
}

/* ============================================================
   AUDIO
   ============================================================ */
const bgMusic = document.getElementById('bgMusic');
const volumeSlider = document.getElementById('volumeSlider');
const volumePct = document.getElementById('volumePct');
const sfxSlider = document.getElementById('sfxSlider');
const sfxPct = document.getElementById('sfxPct');
bgMusic.volume = 0.4;
volumePct.textContent = '40%';
let sfxVolume = 0.8;
sfxPct.textContent = '80%';
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  bgMusic.play().catch(() => {});
}
volumeSlider.addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  bgMusic.volume = v;
  volumePct.textContent = Math.round(v * 100) + '%';
  state.dirty = true; saveLocal();
});
sfxSlider.addEventListener('input', (e) => {
  sfxVolume = parseFloat(e.target.value);
  sfxPct.textContent = Math.round(sfxVolume * 100) + '%';
  state.dirty = true; saveLocal();
});

const Sound = (() => {
  let ctx = null;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(fA, fB, dur, type = 'square', vol = 0.13) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fA, t0);
    if (fB !== fA) osc.frequency.exponentialRampToValueAtTime(Math.max(1, fB), t0 + dur);
    gain.gain.setValueAtTime(vol * sfxVolume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function noise(dur, ff, vol = 0.25, ft = 'lowpass') {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.7);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = ft; f.frequency.setValueAtTime(ff, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(vol * sfxVolume, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  return {
    unlock() { ensure(); },
    spawn() { tone(320, 820, 0.12, 'square', 0.06); },
    splash() { noise(0.3, 1000, 0.12, 'lowpass'); tone(220, 90, 0.2, 'sine', 0.04); },
    pop() { tone(600, 1200, 0.10, 'triangle', 0.06); },
    crocEmerge() { tone(160, 110, 0.32, 'sawtooth', 0.07); },
    whistle() {
      const c = ensure(); if (!c) return;
      const t0 = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(900, t0);
      o.frequency.exponentialRampToValueAtTime(120, t0 + 0.55);
      g.gain.setValueAtTime(0.07 * sfxVolume, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + 0.6);
    },
    thud() { noise(0.35, 240, 0.28, 'lowpass'); tone(120, 55, 0.35, 'sine', 0.13); },
    coin() { tone(1200, 1800, 0.07, 'square', 0.055); setTimeout(() => tone(1600, 2200, 0.09, 'square', 0.045), 50); },
    upgrade() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, f * 1.5, 0.22, 'triangle', 0.1), i * 70)); },
    egg() { [880, 1175, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, f, 0.16, 'sine', 0.08), i * 60)); },
    reelTick() { tone(2000, 2000, 0.015, 'square', 0.035); },
    reelWin() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, f * 1.2, 0.28, 'triangle', 0.11), i * 60)); },
    jackpot() { [262, 330, 392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, f * 1.5, 0.35, 'sawtooth', 0.1), i * 80)); },
    mythic() { [196, 262, 330, 392, 523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, f * 1.7, 0.42, 'sawtooth', 0.12), i * 70)); }
  };
})();
window.addEventListener('pointerdown', () => { Sound.unlock(); unlockAudio(); }, { once: true });
window.addEventListener('keydown', () => { Sound.unlock(); unlockAudio(); }, { once: true });

/* ============================================================
   HUD REFS
   ============================================================ */
const elGold = document.getElementById('goldValue');
const elEgg = document.getElementById('eggValue');
const elLvlBadge = document.getElementById('lvlBadge');
const elLevelBar = document.getElementById('levelBar');
const elMultText = document.getElementById('multText');
const btnUpgrade = document.getElementById('btnUpgrade');
const btnShop = document.getElementById('btnShop');
const btnLoot = document.getElementById('btnLoot');
const btnNight = document.getElementById('btnNight');
const btnTheme = document.getElementById('btnTheme');
const btnSettings = document.getElementById('btnSettings');
const btnReset = document.getElementById('btnReset');
const elUpgradeCost = document.getElementById('upgradeCost');
const elShopEggCount = document.getElementById('shopEggCount');

// Rolling numbers (display values)
let displayGold = 0;
let displayEggs = 0;

const shopModal = document.getElementById('shopModal');
const shopItemsEl = document.getElementById('shopItems');
const shopEggsEl = document.getElementById('shopEggs');
const shopCloseBtn = document.getElementById('shopClose');

const introModal = document.getElementById('introModal');
const playerNameInput = document.getElementById('playerNameInput');

const lootModal = document.getElementById('lootModal');
const lootClose = document.getElementById('lootClose');
const lootEggs = document.getElementById('lootEggs');
const lootOpenBtn = document.getElementById('lootOpenBtn');
const reelStrip = document.getElementById('reelStrip');
const batchGrid = document.getElementById('batchGrid');
const singleReel = document.getElementById('singleReel');

const collectionModal = document.getElementById('collectionModal');
const collectionClose = document.getElementById('collectionClose');
const themeGrid = document.getElementById('themeGrid');
const fountainGrid = document.getElementById('fountainGrid');

const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');

const accountSection = document.getElementById('accountSection');
const accountListEl = document.getElementById('accountList');
const newAccountForm = document.getElementById('newAccountForm');
const btnNewAccount = document.getElementById('btnNewAccount');
const btnCreateAccount = document.getElementById('btnCreateAccount');
const btnCancelNew = document.getElementById('btnCancelNew');

function pulseStat(id) {
  const el = document.getElementById(id);
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

function updateHUD() {
  elShopEggCount.textContent = `${state.eggs} Jajek`;
  elLvlBadge.textContent = `Lv ${state.level}`;
  elLevelBar.style.width = ((state.level / RANK_NAMES.length) * 100) + '%';
  elMultText.textContent = `×${RANK_MULT[state.level - 1].toFixed(1)}`;
  const cost = nextUpgradeCost();
  if (cost === null) {
    btnUpgrade.disabled = true;
    elUpgradeCost.textContent = 'MAX RANGA ✨';
  } else {
    btnUpgrade.disabled = state.gold < cost;
    elUpgradeCost.textContent = formatNum(cost) + ' 🪙';
  }
  if (shopModal.classList.contains('open')) shopEggsEl.textContent = state.eggs;
  if (lootModal.classList.contains('open')) {
    lootEggs.textContent = state.eggs;
    updateLootOpenBtn();
  }
}

/* ============================================================
   ROLLING NUMBERS
   ============================================================ */
function updateRollingNumbers(dt) {
  const targetGold = state.gold;
  const targetEgg = state.eggs;

  const diffGold = targetGold - displayGold;
  if (Math.abs(diffGold) > 0.5) {
    const speed = Math.max(Math.abs(diffGold) / 0.35, 100);
    displayGold += Math.sign(diffGold) * Math.min(Math.abs(diffGold), speed * dt);
  } else {
    displayGold = targetGold;
  }

  const diffEgg = targetEgg - displayEggs;
  if (Math.abs(diffEgg) > 0.05) {
    const speed = Math.max(Math.abs(diffEgg) / 0.35, 3);
    displayEggs += Math.sign(diffEgg) * Math.min(Math.abs(diffEgg), speed * dt);
  } else {
    displayEggs = targetEgg;
  }

  elGold.textContent = formatNum(Math.floor(displayGold));
  elEgg.textContent = Math.floor(displayEggs);
}

/* ============================================================
   GAME JUICE — CPS counter, gold gain float
   ============================================================ */
const CPS_LIMIT = 15;
const cpsClicks = [];

function registerClickCPS() {
  const now = performance.now();
  cpsClicks.push(now);
  while (cpsClicks.length && now - cpsClicks[0] > 1000) cpsClicks.shift();
  return cpsClicks.length;
}
function isCPSFull() {
  const now = performance.now();
  while (cpsClicks.length && now - cpsClicks[0] > 1000) cpsClicks.shift();
  return cpsClicks.length >= CPS_LIMIT;
}
function getCPS() {
  const now = performance.now();
  while (cpsClicks.length && now - cpsClicks[0] > 1000) cpsClicks.shift();
  return cpsClicks.length;
}

const elCpsValue = document.getElementById('cpsValue');
const elCpsWidget = document.getElementById('cpsWidget');
const elCpsRingFill = document.getElementById('cpsRingFill');
const CPS_RING_CIRC = 125.66;

function updateCPSCounter() {
  const cps = getCPS();
  elCpsValue.textContent = cps;

  const pct = Math.min(1, cps / CPS_LIMIT);
  if (elCpsRingFill) {
    elCpsRingFill.style.strokeDashoffset = (CPS_RING_CIRC * (1 - pct)).toFixed(1);
  }

  elCpsWidget.classList.remove('t1', 't2', 't3', 'maxed');
  if (cps >= 15) elCpsWidget.classList.add('t3', 'maxed');
  else if (cps >= 11) elCpsWidget.classList.add('t2');
  else if (cps >= 6) elCpsWidget.classList.add('t1');
}

function spawnClickRipple(clientX, clientY) {
  const el = document.createElement('div');
  el.className = 'clickRipple';
  el.style.left = clientX + 'px';
  el.style.top = clientY + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

let _goldFloatAccum = 0;
let _goldFloatTimer = null;
function flashGoldGain(amount) {
  const panel = document.getElementById('goldStat');
  if (!panel) return;
  _goldFloatAccum += amount;
  if (_goldFloatTimer) return;
  _goldFloatTimer = setTimeout(() => {
    _goldFloatTimer = null;
    const amt = _goldFloatAccum;
    _goldFloatAccum = 0;
    if (amt <= 0) return;
    const el = document.createElement('div');
    el.className = 'goldGain';
    el.textContent = '+' + formatNum(amt);
    panel.appendChild(el);
    setTimeout(() => el.remove(), 1300);

    const valEl = document.getElementById('goldValue');
    if (valEl) {
      valEl.classList.remove('gainFlash');
      void valEl.offsetWidth;
      valEl.classList.add('gainFlash');
    }
  }, 150);
}

function flashEggGain(amount) {
  const panel = document.getElementById('eggStat');
  if (!panel) return;
  const el = document.createElement('div');
  el.className = 'goldGain eggGain';
  el.textContent = '+' + amount;
  panel.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

/* ============================================================
   SHOP
   ============================================================ */
function renderShop() {
  shopItemsEl.innerHTML = '';
  shopEggsEl.textContent = state.eggs;
  for (const item of SHOP_ITEMS) {
    const tier = shopState[item.id];
    const maxed = tier >= item.maxTier;
    const cost = maxed ? 0 : shopCost(item, tier);
    const card = document.createElement('div');
    card.className = 'shopItem' + (maxed ? ' maxed' : '');
    card.innerHTML = `
      <div class="itemHead">
        <span class="itemIcon">${item.icon}</span>
        <div>
          <div class="itemName">${item.name}</div>
          <div class="itemTier">${maxed ? 'MAX' : `Poziom ${tier} / ${item.maxTier}`}</div>
        </div>
      </div>
      <div class="itemDesc">${item.desc}</div>
      <div class="itemEffect">${maxed ? item.fmtEffect(item.maxTier) : `${item.fmtEffect(tier)}<span class="arrow">→</span>${item.fmtEffect(tier + 1)}`}</div>
    `;
    const pips = document.createElement('div');
    pips.className = 'barPips';
    for (let i = 0; i < item.maxTier; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < tier ? ' on' : '');
      pips.appendChild(pip);
    }
    card.appendChild(pips);
    const buyBtn = document.createElement('button');
    buyBtn.className = 'buyBtn' + (maxed ? ' maxed' : '');
    if (maxed) { buyBtn.textContent = '✓ MAX'; buyBtn.disabled = true; }
    else {
      buyBtn.textContent = `${cost} 🥚`;
      buyBtn.disabled = state.eggs < cost;
      buyBtn.addEventListener('click', () => {
        if (state.eggs < cost) return;
        state.eggs -= cost;
        shopState[item.id]++;
        state.hudDirty = true; state.dirty = true;
        Sound.upgrade();
        updateHUD(); renderShop(); saveGame();
      });
    }
    card.appendChild(buyBtn);
    shopItemsEl.appendChild(card);
  }
}
function openShop() { shopModal.classList.add('open'); renderShop(); }
function closeShop() { shopModal.classList.remove('open'); }

/* ============================================================
   LOOTBOX
   ============================================================ */
let reelAnimating = false;
let batchRevealActive = false;
let currentBatch = 1;
let lootSkipHandler = null;
let lootTimers = [];

function clearLootTimers() {
  for (const t of lootTimers) clearTimeout(t);
  lootTimers = [];
}
function scheduleLoot(fn, delay) {
  const id = setTimeout(fn, delay);
  lootTimers.push(id);
  return id;
}

function updateLootOpenBtn() {
  const busy = reelAnimating || batchRevealActive;
  lootOpenBtn.disabled = state.eggs < currentBatch || busy;
  lootOpenBtn.textContent = `🎲 OTWÓRZ (${currentBatch} 🥚)`;
  const skipBtn = document.getElementById('lootSkipBtn');
  if (skipBtn) skipBtn.style.display = busy ? 'flex' : 'none';
}

const lootSkipBtn = document.getElementById('lootSkipBtn');
lootSkipBtn.addEventListener('click', () => {
  if (lootSkipHandler) { const h = lootSkipHandler; lootSkipHandler = null; h(); }
});

function lootCtx() {
  return {
    state, shopState,
    getRankMult,
    onThemeUnlocked: () => setTimeout(renderThemeGrid, 100),
    onSkinUnlocked: () => setTimeout(renderFountainGrid, 100),
    onLevelUp: () => { updateFountainLevel(state.level); }
  };
}

function pickReward() {
  const luckBonus = (shopState.luckyCharm || 0) * 0.08;
  const totalWeight = LOOT_REWARDS.reduce((s, r) => {
    let w = r.weight;
    if (r.rarity === 'rare') w *= (1 + luckBonus);
    if (r.rarity === 'epic') w *= (1 + luckBonus * 1.5);
    if (r.rarity === 'legendary') w *= (1 + luckBonus * 2);
    if (r.rarity === 'mythic') w *= (1 + luckBonus * 2.5);
    return s + w;
  }, 0);
  let r = Math.random() * totalWeight;
  for (const reward of LOOT_REWARDS) {
    let w = reward.weight;
    if (reward.rarity === 'rare') w *= (1 + luckBonus);
    if (reward.rarity === 'epic') w *= (1 + luckBonus * 1.5);
    if (reward.rarity === 'legendary') w *= (1 + luckBonus * 2);
    if (reward.rarity === 'mythic') w *= (1 + luckBonus * 2.5);
    r -= w;
    if (r <= 0) return reward;
  }
  return LOOT_REWARDS[0];
}
function pickSuspense(winnerRarity) {
  const winnerRank = RARITY_RANK[winnerRarity];
  const candidates = [];
  for (const r of LOOT_REWARDS) {
    const rr = RARITY_RANK[r.rarity];
    if (rr === winnerRank + 1) candidates.push({ item: r, weight: 8 });
    if (rr === winnerRank + 2) candidates.push({ item: r, weight: 3 });
    if (rr === winnerRank) candidates.push({ item: r, weight: 2 });
  }
  if (candidates.length === 0) return LOOT_REWARDS[Math.floor(Math.random() * LOOT_REWARDS.length)];
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of candidates) { r -= c.weight; if (r <= 0) return c.item; }
  return candidates[0].item;
}
function renderReelItem(reward) {
  const div = document.createElement('div');
  div.className = 'reelItem ' + reward.rarity;
  div.innerHTML = `<div class="ic">${reward.icon}</div><div class="nm">${reward.label}</div>`;
  return div;
}
function buildReelStrip(winner, winIndex, stripLen) {
  const strip = [];
  for (let i = 0; i < stripLen; i++) {
    if (i === winIndex) strip.push(winner);
    else if (i >= winIndex - 3 && i < winIndex) strip.push(pickSuspense(winner.rarity));
    else if (i > winIndex && i <= winIndex + 2) strip.push(pickSuspense(winner.rarity));
    else strip.push(LOOT_REWARDS[Math.floor(Math.random() * LOOT_REWARDS.length)]);
  }
  return strip;
}

function finishLootSingle(winner) {
  const flash = document.getElementById('lootWinFlash');
  flash.classList.remove('go', 'legendary', 'mythic');
  void flash.offsetWidth;
  if (winner.rarity === 'mythic') flash.classList.add('mythic');
  else if (winner.rarity === 'legendary') flash.classList.add('legendary');
  flash.classList.add('go');
  if (winner.rarity === 'mythic') { Sound.mythic(); burstParticles(new THREE.Vector3(0, 3, 0), 0xff6ad5, 120); }
  else if (winner.rarity === 'legendary') { Sound.jackpot(); burstParticles(new THREE.Vector3(0, 3, 0), 0xffd24a, 80); }
  else if (winner.rarity === 'epic' || winner.rarity === 'rare') { Sound.reelWin(); burstParticles(new THREE.Vector3(0, 3, 0), 0xc78eff, 50); }
  else { Sound.egg(); burstParticles(new THREE.Vector3(0, 2.5, 0), 0x9fe8ff, 25); }
  spawnPopup(winner.label, new THREE.Vector3(0, 3.5, 0), false, 0, 2.8);
}

function openSingleLootbox() {
  if (reelAnimating || batchRevealActive) return;
  if (state.eggs < 1) { Sound.pop(); return; }
  state.eggs -= 1;
  state.stats.lootboxesOpened++;
  state.dirty = true;
  updateHUD();
  lootEggs.textContent = state.eggs;

  const winner = pickReward();
  reelStrip.innerHTML = '';
  const stripLen = 50;
  const winIndex = 42;
  const strip = buildReelStrip(winner, winIndex, stripLen);
  for (const r of strip) reelStrip.appendChild(renderReelItem(r));

  reelAnimating = true;
  lootOpenBtn.disabled = true;
  updateLootOpenBtn();
  reelStrip.style.transition = 'none';
  reelStrip.style.transform = 'translateX(0px)';
  void reelStrip.offsetHeight;

  const firstItem = reelStrip.querySelector('.reelItem');
  const itemW = firstItem ? firstItem.offsetWidth : 140;
  const reelEl = reelStrip.parentElement;
  const reelW = reelEl.clientWidth;
  const targetX = (reelW / 2) - (winIndex * itemW + itemW / 2);
  const DURATION = 5200;

  reelStrip.style.transition = `transform ${DURATION}ms cubic-bezier(0.08, 0.85, 0.15, 1)`;
  reelStrip.style.transform = `translateX(${targetX}px)`;

  const ticks = 55;
  for (let i = 0; i < ticks; i++) {
    const t = i / ticks;
    const delay = DURATION * Math.pow(t, 1.9);
    scheduleLoot(() => { if (reelAnimating) Sound.reelTick(); }, delay);
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearLootTimers();
    lootSkipHandler = null;
    reelAnimating = false;
    updateLootOpenBtn();
    winner.apply(lootCtx());
    state.hudDirty = true;
    state.dirty = true;
    updateHUD();
    saveGame();
    finishLootSingle(winner);
  };

  lootSkipHandler = () => {
    clearLootTimers();
    reelStrip.style.transition = 'transform 0.08s ease-out';
    reelStrip.style.transform = `translateX(${targetX}px)`;
    lootSkipHandler = null;
    finish();
  };

  scheduleLoot(finish, DURATION + 120);
}

function openBatchLootbox(n) {
  if (reelAnimating || batchRevealActive) return;
  if (state.eggs < n) { Sound.pop(); return; }
  state.eggs -= n;
  state.stats.lootboxesOpened += n;
  state.dirty = true;
  updateHUD();
  lootEggs.textContent = state.eggs;

  const winners = [];
  for (let i = 0; i < n; i++) winners.push(pickReward());

  batchGrid.className = 'batchGrid b' + (n <= 4 ? n : (n <= 10 ? 10 : 20));
  batchGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < n; i++) {
    const w = winners[i];
    const cell = document.createElement('div');
    cell.className = 'batchCard';
    cell.innerHTML = `
      <div class="batchInner">
        <div class="batchCover">❓</div>
        <div class="batchReveal ${w.rarity}">
          <div class="ic">${w.icon}</div>
          <div class="nm">${w.label}</div>
        </div>
      </div>`;
    batchGrid.appendChild(cell);
    cells.push(cell);
  }

  singleReel.style.display = 'none';
  batchGrid.style.display = 'grid';
  batchRevealActive = true;
  lootOpenBtn.disabled = true;
  updateLootOpenBtn();

  const REVEAL_INTERVAL = n === 1 ? 300 : Math.max(35, Math.min(300, 900 / Math.sqrt(n)));

  const revealCell = (i) => {
    if (i >= cells.length) return;
    cells[i].classList.add('revealed');
    Sound.reelTick();
    if (winners[i].rarity === 'mythic') {
      Sound.mythic();
      const flash = document.getElementById('lootWinFlash');
      flash.classList.remove('go', 'legendary', 'mythic');
      void flash.offsetWidth;
      flash.classList.add('mythic', 'go');
    } else if (winners[i].rarity === 'legendary') {
      Sound.jackpot();
      const flash = document.getElementById('lootWinFlash');
      flash.classList.remove('go', 'legendary', 'mythic');
      void flash.offsetWidth;
      flash.classList.add('legendary', 'go');
    }
  };

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearLootTimers();
    lootSkipHandler = null;
    for (let i = 0; i < cells.length; i++) cells[i].classList.add('revealed');

    const beforeGold = state.gold;
    const beforeEggs = state.eggs;
    for (const w of winners) w.apply(lootCtx());
    const goldGain = state.gold - beforeGold;
    const eggGain = state.eggs - beforeEggs;
    state.hudDirty = true;
    state.dirty = true;
    updateHUD();
    saveGame();
    batchRevealActive = false;
    updateLootOpenBtn();
    if (goldGain > 0) spawnPopup(`+${formatNum(goldGain)} złota (×${n})`, new THREE.Vector3(0, 3.5, 0), false, 0, 3.0);
    if (eggGain > 0) spawnPopup(`+${eggGain} jaj!`, new THREE.Vector3(0, 4.2, 0), true, 0.3, 3.0);
    Sound.reelWin();
    burstParticles(new THREE.Vector3(0, 3, 0), 0xffe08a, 40);
  };

  lootSkipHandler = () => { finish(); };

  for (let i = 0; i < cells.length; i++) {
    scheduleLoot(() => revealCell(i), i * REVEAL_INTERVAL);
  }
  scheduleLoot(finish, n * REVEAL_INTERVAL + 700);
}

function openLootbox() {
  if (currentBatch === 1) openSingleLootbox();
  else openBatchLootbox(currentBatch);
}
lootOpenBtn.addEventListener('click', openLootbox);

document.querySelectorAll('.batchBtn[data-batch]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (reelAnimating || batchRevealActive) return;
    currentBatch = parseInt(btn.dataset.batch);
    document.querySelectorAll('.batchBtn').forEach(b => b.classList.toggle('active', b === btn));
    const ci = document.getElementById('customBatchInput');
    if (ci) ci.value = '';
    refreshLootPreview();
    updateLootOpenBtn();
    Sound.pop();
  });
});

const customBatchInput = document.getElementById('customBatchInput');
const customBatchBtn = document.getElementById('customBatchBtn');

function applyCustomBatch() {
  if (reelAnimating || batchRevealActive) return;
  let v = parseInt(customBatchInput.value, 10);
  if (isNaN(v) || v < 1) { showToast('Podaj liczbę ≥ 1', 'warn'); Sound.pop(); return; }
  v = Math.min(v, 999);
  currentBatch = v;
  document.querySelectorAll('.batchBtn').forEach(b => b.classList.remove('active'));
  customBatchBtn.classList.add('active');
  refreshLootPreview();
  updateLootOpenBtn();
  Sound.pop();
}
customBatchBtn.addEventListener('click', applyCustomBatch);
customBatchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustomBatch(); });
customBatchInput.addEventListener('input', () => {
  let v = customBatchInput.value.replace(/[^\d]/g, '');
  if (v && parseInt(v, 10) < 1) v = '1';
  customBatchInput.value = v;
});

function refreshLootPreview() {
  if (currentBatch === 1) {
    batchGrid.style.display = 'none';
    batchGrid.innerHTML = '';
    singleReel.style.display = 'block';
    reelStrip.innerHTML = '';
    for (let i = 0; i < 6; i++) reelStrip.appendChild(renderReelItem(LOOT_REWARDS[i % LOOT_REWARDS.length]));
    reelStrip.style.transition = 'none';
    reelStrip.style.transform = 'translateX(0)';
  } else {
    singleReel.style.display = 'none';
    const previewCount = Math.min(currentBatch, 20);
    batchGrid.innerHTML = '';
    batchGrid.style.display = 'grid';
    batchGrid.className = 'batchGrid b' + (currentBatch <= 4 ? currentBatch : (currentBatch <= 10 ? 10 : 20));
    for (let i = 0; i < previewCount; i++) {
      const cell = document.createElement('div');
      cell.className = 'batchCard';
      cell.innerHTML = `<div class="batchInner"><div class="batchCover">❓</div></div>`;
      batchGrid.appendChild(cell);
    }
    if (currentBatch > 20) {
      const note = document.createElement('div');
      note.className = 'batchOverflowNote';
      note.textContent = `+${currentBatch - 20} więcej...`;
      batchGrid.appendChild(note);
    }
  }
}

/* ============================================================
   AWARDS
   ============================================================ */
const goldBatch = { value: 0, count: 0, timer: 0, pos: new THREE.Vector3() };

function awardCroc(c) {
  const rankMult = getRankMult();
  const shopMult = 1 + (shopState.goldMult || 0) * 0.3;
  const base = COLOR_VALUES[c.color] || 1;
  const value = Math.floor(base * rankMult * shopMult);
  state.gold += value;
  state.hudDirty = true;
  state.dirty = true;
  state.stats.crocsFallen++;
  goldBatch.value += value;
  goldBatch.count++;
  goldBatch.pos.copy(c.mesh.position);
  goldBatch.pos.x += 1.5;
  goldBatch.pos.y = 0.5;
  state.eggProgress += 1;
  const threshold = Math.max(10, 55 - (shopState.eggChance || 0) * 5);
  while (state.eggProgress >= threshold) {
    state.eggProgress -= threshold;
    awardEgg();
  }
}
function flushGoldBatch() {
  if (goldBatch.count === 0) return;
  const phrases = ['+{v} sosiku', '+{v} monet', '+{v} papcontentu', '+{v} złociutkich', '+{v} mamonki'];
  const tpl = phrases[Math.floor(rand() * phrases.length)];
  let txt = tpl.replace('{v}', formatNum(goldBatch.value));
  if (goldBatch.count > 1) txt += ` ×${goldBatch.count}`;
  spawnPopup(txt, goldBatch.pos, false, 0, 1.8);
  Sound.coin();
  burstParticles(goldBatch.pos, 0xffe08a, Math.min(16, 4 + goldBatch.count * 2));
  pulseStat('goldStat');
  flashGoldGain(goldBatch.value);
  goldBatch.value = 0;
  goldBatch.count = 0;
  goldBatch.timer = 0.2;
}
function awardEgg() {
  state.eggs += 1;
  state.hudDirty = true;
  state.dirty = true;
  pulseStat('eggStat');
  flashEggGain(1);
  const pos = new THREE.Vector3(14, 2.4, 0);
  spawnPopup('+1 JAJO POLLO', pos, true, 0, 2.2);
  Sound.egg();
  spawnFloatingEggsAt(14, 2.0, 0, 3);
}

/* ============================================================
   LEADERBOARD
   ============================================================ */
const lb = document.getElementById('lb');
const lbBody = document.getElementById('lbBody');
const lbStatus = document.getElementById('lbStatus');
const lbClose = document.getElementById('lbClose');
const lbToggle = document.getElementById('lbToggle');

let lbExpanded = false;
let lbLastPlayers = null;

function setLbStatus(online) {
  lbStatus.textContent = online ? 'online' : 'offline';
  lbStatus.className = 'lbStatus ' + (online ? 'online' : 'offline');
}

async function refreshLeaderboard() {
  if (!playerId) {
    lbBody.innerHTML = '';
    const sb = document.createElement('button');
    sb.className = 'lbSaveBtn'; sb.id = 'lbSaveBtn';
    sb.textContent = '💾 Zapisz na serwer';
    sb.disabled = true;
    lbBody.appendChild(sb);
    lbBody.insertAdjacentHTML('beforeend', '<div class="lbEmpty">Wybierz konto</div>');
    updateSaveBtnState();
    return;
  }
  const players = await ServerAPI.getLeaderboard();
  if (!ServerAPI.online) {
    players.push({ id: playerId, playerName: state.playerName, gold: state.gold, level: state.level, eggs: state.eggs, stats: state.stats, updatedAt: Date.now() });
    setLbStatus(false);
  } else setLbStatus(true);

  players.sort((a, b) => {
    const lvA = a.level || 1, lvB = b.level || 1;
    if (lvB !== lvA) return lvB - lvA;
    return (b.gold || 0) - (a.gold || 0);
  });

  lbLastPlayers = players;
  renderLeaderboard(players);
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return 'przed chwilą';
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
  if (s < 604800) return `${Math.floor(s / 86400)} dni temu`;
  if (s < 2592000) return `${Math.floor(s / 604800)} tyg. temu`;
  return `${Math.floor(s / 2592000)} mies. temu`;
}

function renderLeaderboard(players) {
  lbBody.innerHTML = '';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'lbSaveBtn'; saveBtn.id = 'lbSaveBtn';
  saveBtn.textContent = '💾 Zapisz na serwer';
  saveBtn.addEventListener('click', (e) => { e.stopPropagation(); saveToServer(); });
  lbBody.appendChild(saveBtn);

  if (players.length === 0) {
    lbBody.insertAdjacentHTML('beforeend', '<div class="lbEmpty">Brak graczy</div>');
    updateSaveBtnState();
    return;
  }

  const myIdx = players.findIndex(p => p.id === playerId);
  const TOP = 3;
  const RANGE = 3;

  const rows = [];
  if (lbExpanded) {
    for (let i = 0; i < players.length; i++) rows.push({ type: 'player', idx: i });
  } else {
    const topCount = Math.min(TOP, players.length);
    for (let i = 0; i < topCount; i++) rows.push({ type: 'player', idx: i });

    if (myIdx < 0 || myIdx < TOP) {
      const extra = Math.min(players.length, TOP + 4);
      for (let i = topCount; i < extra; i++) rows.push({ type: 'player', idx: i });
    } else {
      const start = Math.max(TOP, myIdx - RANGE);
      const end = Math.min(players.length - 1, myIdx + RANGE);
      if (start > TOP) rows.push({ type: 'gap' });
      for (let i = start; i <= end; i++) rows.push({ type: 'player', idx: i });
    }
  }

  for (const r of rows) {
    if (r.type === 'gap') {
      const g = document.createElement('div');
      g.className = 'lbGap';
      g.textContent = '· · ·';
      lbBody.appendChild(g);
      continue;
    }
    lbBody.appendChild(buildLbRow(players[r.idx], r.idx, players));
  }

  const footerBtn = document.createElement('button');
  footerBtn.className = 'lbExpandBtn';
  if (lbExpanded) {
    footerBtn.textContent = '▲ POKAŻ MNIEJ';
  } else {
    footerBtn.textContent = `▼ POKAŻ CAŁĄ TABELĘ (${players.length})`;
  }
  footerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    lbExpanded = !lbExpanded;
    renderLeaderboard(lbLastPlayers || players);
    Sound.pop();
  });
  lbBody.appendChild(footerBtn);

  updateSaveBtnState();
}

function buildLbRow(p, i, players) {
  const isMe = p.id === playerId;
  const rank = i + 1;
  const rankClass = rank <= 3 ? ` rank-${rank}` : '';
  const row = document.createElement('div');
  row.className = 'lbRow' + (isMe ? ' me' : '') + rankClass;
  const rn = RANK_NAMES[Math.min((p.level || 1) - 1, 29)] || 'NOWICJUSZ';
  const timeStr = p.updatedAt ? ` · ${timeAgo(p.updatedAt)}` : '';
  row.innerHTML = `
    <div class="lbRank">#${i + 1}</div>
    <div>
      <div class="lbName">${escapeHtml(p.playerName || 'Pollo')}${isMe ? ' <span class="meTag">TY</span>' : ''}</div>
      <div class="lbDetail">${rn}${timeStr}</div>
    </div>
    <div class="lbRight">
      <div class="lbLvBig">Lv ${p.level || 1}</div>
      <div class="lbGold">${formatNum(p.gold || 0)} 🪙</div>
    </div>
  `;
  const detail = document.createElement('div');
  detail.className = 'lbRowDetail';
  const st = p.stats || {};
  const playtimeMin = Math.floor((st.playtime || 0) / 60);
  const date = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('pl-PL') : '-';
  detail.innerHTML = `
    <div class="dRow"><span>👑 Poziom</span><b>${p.level || 1} / 30</b></div>
    <div class="dRow"><span>🪙 Złoto</span><b>${formatNum(p.gold || 0)}</b></div>
    <div class="dRow"><span>🥚 Jajka</span><b>${p.eggs || 0}</b></div>
    <div class="dRow"><span>🐔 Pollo</span><b>${formatNum(st.pollosSpawned || 0)}</b></div>
    <div class="dRow"><span>🐊 Cocodrillo</span><b>${formatNum(st.crocsFallen || 0)}</b></div>
    <div class="dRow"><span>🎁 Skrzynki</span><b>${st.lootboxesOpened || 0}</b></div>
    <div class="dRow"><span>⏱️ Czas</span><b>${playtimeMin} min</b></div>
    <div class="dRow"><span>📅 Ostatnia</span><b>${date}</b></div>
  `;
  if (isMe) {
    const del = document.createElement('button');
    del.className = 'lbDelete';
    del.textContent = '🗑️ USUŃ MNIE Z SERWERA';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteFromServer(); });
    detail.appendChild(del);
  }
  row.appendChild(detail);
  row.addEventListener('click', () => {
    const wasOpen = detail.style.display === 'block';
    lbBody.querySelectorAll('.lbRowDetail').forEach(d => d.style.display = 'none');
    lbBody.querySelectorAll('.lbRow').forEach(r => r.classList.remove('expanded'));
    if (!wasOpen) { detail.style.display = 'block'; row.classList.add('expanded'); Sound.pop(); }
  });
  return row;
}

lbClose.addEventListener('click', () => { lb.classList.add('hidden'); lbToggle.classList.add('show'); });
lbToggle.addEventListener('click', () => { lb.classList.remove('hidden'); lbToggle.classList.remove('show'); refreshLeaderboard(); });
document.getElementById('lbRefresh').addEventListener('click', async (e) => {
  e.stopPropagation();
  const btn = e.currentTarget;
  btn.classList.add('spin');
  lbExpanded = false;
  await refreshLeaderboard();
  setTimeout(() => btn.classList.remove('spin'), 800);
});

/* ============================================================
   THEME / FOUNTAIN GRIDS (combined collection modal)
   ============================================================ */
function renderThemeGrid() {
  themeGrid.innerHTML = '';
  for (const theme of THEMES) {
    const unlocked = state.unlockedThemes.includes(theme.id);
    const opt = document.createElement('div');
    opt.className = 'collectionItem' + (state.currentTheme === theme.id ? ' active' : '') + (!unlocked ? ' locked' : '');
    if (theme.id === 'default') {
      opt.style.background = 'linear-gradient(180deg, #9cc4e0, #f5f0e6)';
    } else {
      try {
        const tex = getThemeTexture(theme.id);
        const canvas = tex.image;
        if (canvas) opt.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.7)})`;
      } catch (e) {
        opt.style.background = 'linear-gradient(135deg, #3a3a6a, #1a1a3a)';
      }
    }
    let label = theme.label;
    if (!unlocked) label = '???';
    opt.innerHTML = `
      <div class="rarityTag ${theme.rarity || 'rare'}">${(theme.rarity || 'rare').toUpperCase()}</div>
      <div class="bgLabel">${theme.icon} ${label}</div>
    `;
    if (unlocked) {
      opt.addEventListener('click', () => {
        state.currentTheme = theme.id;
        state.dirty = true;
        saveLocal();
        applyTheme(state.currentTheme, state.nightMode);
        renderThemeGrid();
        Sound.pop();
        showToast(`Motyw: ${theme.label}`, 'ok');
      });
    } else {
      opt.addEventListener('click', () => { showToast('🔒 Odblokuj przez jaja!', 'warn'); Sound.pop(); });
    }
    themeGrid.appendChild(opt);
  }
}

function renderFountainGrid() {
  fountainGrid.innerHTML = '';
  for (const skin of FOUNTAIN_SKINS) {
    const unlocked = state.unlockedFountainSkins.includes(skin.id);
    const opt = document.createElement('div');
    opt.className = 'collectionItem' + (state.currentFountainSkin === skin.id ? ' active' : '') + (!unlocked ? ' locked' : '');
    let bg;
    if (skin.animated === 'rainbow') bg = 'linear-gradient(135deg, #ff4040, #ffb040, #ffe060, #9ce870, #60b8ff, #b88fff)';
    else if (skin.animated === 'void') bg = 'radial-gradient(circle, #200040, #000000)';
    else bg = `linear-gradient(135deg, #${skin.dome.toString(16).padStart(6,'0')}, #${skin.base.toString(16).padStart(6,'0')})`;
    opt.style.background = bg;
    let label = skin.label;
    if (!unlocked) label = '???';
    opt.innerHTML = `
      <div class="rarityTag ${skin.rarity}">${skin.rarity.toUpperCase()}</div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:52px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));z-index:1;">⛲</div>
      <div class="bgLabel">${skin.icon} ${label}</div>
    `;
    if (unlocked) {
      opt.addEventListener('click', () => {
        state.currentFountainSkin = skin.id;
        state.dirty = true;
        saveLocal();
        applyFountainSkin(state.currentFountainSkin);
        renderFountainGrid();
        Sound.pop();
        showToast(`Skin fontanny: ${skin.label}`, 'ok');
      });
    } else {
      opt.addEventListener('click', () => { showToast('🔒 Odblokuj przez jaja!', 'warn'); Sound.pop(); });
    }
    fountainGrid.appendChild(opt);
  }
}

function setCollectionTab(which) {
  document.querySelectorAll('.collTab').forEach(t => t.classList.toggle('active', t.dataset.tab === which));
  if (which === 'themes') {
    themeGrid.style.display = 'grid';
    fountainGrid.style.display = 'none';
    renderThemeGrid();
  } else {
    themeGrid.style.display = 'none';
    fountainGrid.style.display = 'grid';
    renderFountainGrid();
  }
}

document.querySelectorAll('.collTab').forEach(tab => {
  tab.addEventListener('click', () => {
    setCollectionTab(tab.dataset.tab);
    Sound.pop();
  });
});

function openCollection(which = 'themes') {
  collectionModal.classList.add('open');
  setCollectionTab(which);
}
function closeCollection() {
  collectionModal.classList.remove('open');
}
collectionClose.addEventListener('click', () => { closeCollection(); Sound.pop(); });
collectionModal.addEventListener('click', (e) => { if (e.target === collectionModal) closeCollection(); });

/* ============================================================
   SETTINGS MODAL
   ============================================================ */
function openSettings() { settingsModal.classList.add('open'); }
function closeSettings() { settingsModal.classList.remove('open'); }
settingsClose.addEventListener('click', () => { closeSettings(); Sound.pop(); });
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

/* ============================================================
   ACCOUNTS
   ============================================================ */
function renderAccountList() {
  const accounts = getAccounts();
  accountListEl.innerHTML = '';
  if (accounts.length === 0) {
    accountSection.style.display = 'none';
    newAccountForm.style.display = 'block';
    playerNameInput.value = '';
    setTimeout(() => playerNameInput.focus(), 200);
    return;
  }
  accountSection.style.display = 'block';
  newAccountForm.style.display = 'none';
  for (const acc of accounts) {
    const row = document.createElement('div');
    row.className = 'accountRow';
    row.innerHTML = `
      <div class="accountAvatar">🐔</div>
      <div class="accountInfo">
        <div class="accountName">${escapeHtml(acc.name)}</div>
        <div class="accountMeta">Utworzone ${new Date(acc.createdAt).toLocaleDateString('pl-PL')}</div>
      </div>
      <button class="accountDelete">🗑️</button>
    `;
    const pick = () => selectAccount(acc);
    row.querySelector('.accountAvatar').addEventListener('click', pick);
    row.querySelector('.accountInfo').addEventListener('click', pick);
    row.querySelector('.accountDelete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Usunąć konto "${acc.name}"?`)) return;
      const updated = accounts.filter(a => a.id !== acc.id);
      setAccounts(updated);
      try { localStorage.removeItem('pollo_cocodrillo_v3_' + acc.id); } catch (e2) {}
      Sound.pop();
      renderAccountList();
    });
    accountListEl.appendChild(row);
  }
  if (accounts.length >= MAX_ACCOUNTS) {
    btnNewAccount.style.display = 'none';
    const note = document.createElement('div');
    note.className = 'accountLimitNote';
    note.textContent = `⚠️ Limit ${MAX_ACCOUNTS} kont`;
    accountListEl.appendChild(note);
  } else btnNewAccount.style.display = 'block';
}

function selectAccount(acc) {
  playerId = acc.id;
  SAVE_KEY = 'pollo_cocodrillo_v3_' + acc.id;
  resetStateForAccount();
  loadGame();
  state.playerName = acc.name;
  state.introSeen = true;
  applyTheme(state.currentTheme, state.nightMode);
  applyFountainSkin(state.currentFountainSkin);
  updateFountainLevel(state.level);
  // Sync rolling numbers do aktualnych wartości (bez animacji przy wczytaniu)
  displayGold = state.gold;
  displayEggs = state.eggs;
  updateHUD();
  updateRollingNumbers(0);
  saveLocal();
  updateSaveBtnState();
  introModal.classList.remove('open');
  Sound.pop();
  setTimeout(refreshLeaderboard, 300);
}

btnNewAccount.addEventListener('click', () => {
  accountSection.style.display = 'none';
  newAccountForm.style.display = 'block';
  playerNameInput.value = '';
  setTimeout(() => playerNameInput.focus(), 150);
  Sound.pop();
});
btnCancelNew.addEventListener('click', () => { renderAccountList(); Sound.pop(); });
btnCreateAccount.addEventListener('click', () => {
  const name = (playerNameInput.value || '').trim().slice(0, 14);
  if (!name) { showToast('Wpisz nazwę!', 'warn'); playerNameInput.focus(); return; }
  const accounts = getAccounts();
  if (accounts.length >= MAX_ACCOUNTS) { showToast(`Limit!`, 'err'); return; }
  if (accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) { showToast('Konto istnieje!', 'err'); return; }
  const id = newAccountId();
  const newAcc = { id, name, createdAt: Date.now() };
  setAccounts([...accounts, newAcc]);
  selectAccount(newAcc);
});
playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnCreateAccount.click(); });

/* ============================================================
   INPUT / BUTTONS
   ============================================================ */
function trySpawnPollo() {
  if (!playerId) return;
  Sound.unlock(); unlockAudio();
  if (isCPSFull()) return;
  registerClickCPS();
  spawnPolloEntityExternal(state, shopState);
  Sound.spawn();
}

btnUpgrade.addEventListener('click', () => {
  Sound.unlock(); unlockAudio();
  const cost = nextUpgradeCost();
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  state.level++;
  state.hudDirty = true; state.dirty = true;
  Sound.upgrade();
  updateFountainLevel(state.level);
  burstParticles(new THREE.Vector3(0, 2.2, 0), 0xffd75e, 40);
  spawnPopup(`RANGA: ${RANK_NAMES[state.level - 1]}`, new THREE.Vector3(0, 3.5, 0), true, 0, 2.4);
  saveGame();
});
btnShop.addEventListener('click', () => { Sound.unlock(); unlockAudio(); openShop(); });
btnLoot.addEventListener('click', () => {
  Sound.unlock(); unlockAudio();
  lootModal.classList.add('open');
  reelAnimating = false;
  batchRevealActive = false;
  lootSkipHandler = null;
  clearLootTimers();
  refreshLootPreview();
  updateLootOpenBtn();
  updateHUD();
});
btnNight.addEventListener('click', () => {
  state.nightMode = !state.nightMode;
  if (state.currentTheme === 'default') applyTheme(state.currentTheme, state.nightMode);
  state.dirty = true;
  saveGame();
  Sound.pop();
});
btnTheme.addEventListener('click', () => { openCollection('themes'); Sound.pop(); });
btnSettings.addEventListener('click', () => { openSettings(); Sound.pop(); });
btnReset.addEventListener('click', () => resetGame());

shopCloseBtn.addEventListener('click', () => { closeShop(); Sound.pop(); });
shopModal.addEventListener('click', e => { if (e.target === shopModal) closeShop(); });
lootClose.addEventListener('click', () => { if (!reelAnimating && !batchRevealActive) { lootModal.classList.remove('open'); Sound.pop(); } });
lootModal.addEventListener('click', e => { if (e.target === lootModal && !reelAnimating && !batchRevealActive) lootModal.classList.remove('open'); });

window.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (shopModal.classList.contains('open')) closeShop();
    if (lootModal.classList.contains('open') && !reelAnimating && !batchRevealActive) lootModal.classList.remove('open');
    if (collectionModal.classList.contains('open')) collectionModal.classList.remove('open');
    if (settingsModal.classList.contains('open')) settingsModal.classList.remove('open');
  }
  if (introModal.classList.contains('open')) return;
  if (lootModal.classList.contains('open') || shopModal.classList.contains('open') || collectionModal.classList.contains('open') || settingsModal.classList.contains('open')) return;
  if (e.code === 'KeyU') btnUpgrade.click();
  if (e.code === 'KeyB') openShop();
  if (e.code === 'KeyN') btnNight.click();
  if (e.code === 'KeyL') btnLoot.click();
});

/* ============================================================
   CAMERA + CLICK
   ============================================================ */
const canvasEl = renderer.domElement;
const pointer = { down: false, x: 0, y: 0, id: null, startX: 0, startY: 0, startTime: 0, moved: false };
canvasEl.addEventListener('pointerdown', e => {
  pointer.down = true;
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.startX = e.clientX; pointer.startY = e.clientY;
  pointer.startTime = performance.now();
  pointer.moved = false;
  pointer.id = e.pointerId;
  try { canvasEl.setPointerCapture(e.pointerId); } catch (_) {}
});
canvasEl.addEventListener('pointerup', e => {
  if (e.pointerId !== pointer.id) return;
  const elapsed = performance.now() - pointer.startTime;
  const dx = Math.abs(e.clientX - pointer.startX);
  const dy = Math.abs(e.clientY - pointer.startY);
  const wasClick = !pointer.moved && elapsed < 350 && dx < 8 && dy < 8;
  pointer.down = false; pointer.id = null;
  try { canvasEl.releasePointerCapture(e.pointerId); } catch (_) {}
  if (wasClick) {
    if (introModal.classList.contains('open')) return;
    if (shopModal.classList.contains('open')) return;
    if (lootModal.classList.contains('open')) return;
    if (collectionModal.classList.contains('open')) return;
    if (settingsModal.classList.contains('open')) return;
    if (!playerId) return;
    spawnClickRipple(e.clientX, e.clientY);
    trySpawnPollo();
  }
});
canvasEl.addEventListener('pointercancel', () => { pointer.down = false; pointer.id = null; });
canvasEl.addEventListener('pointermove', e => {
  if (!pointer.down || e.pointerId !== pointer.id) return;
  const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (Math.abs(e.clientX - pointer.startX) > 8 || Math.abs(e.clientY - pointer.startY) > 8) pointer.moved = true;
  camState.theta -= dx * 0.0062;
  camState.phi = clamp(camState.phi - dy * 0.0052, 0.24, 1.44);
});
canvasEl.addEventListener('wheel', e => {
  e.preventDefault();
  camState.radius = clamp(camState.radius + e.deltaY * 0.022, 13, 62);
}, { passive: false });
document.addEventListener('touchmove', e => { if (e.target === canvasEl) e.preventDefault(); }, { passive: false });

/* ============================================================
   MAIN LOOP
   ============================================================ */
let _lastTime = performance.now();
let _elapsed = 0;
let _hudAccum = 0;
let _saveAccum = 0;
let _cpsAccum = 0;

function animate(now) {
  requestAnimationFrame(animate);
  let dt = (now - _lastTime) / 1000;
  _lastTime = now;
  dt = Math.min(dt, 0.05);
  _elapsed += dt;
  if (playerId) state.stats.playtime += dt;

  updatePollos(dt, shopState, Sound, null);
  updateCrocs(dt, shopState, Sound, awardCroc);
  updateFloatingEggs(dt);
  updateWorld(dt, _elapsed, state.nightMode);
  updateParticles(dt);
  updatePopups(dt);
  updateLightingSmooth(dt);
  updateFountainSkinAnim(state.currentFountainSkin, _elapsed);

  goldBatch.timer -= dt;
  if (goldBatch.count > 0 && goldBatch.timer <= 0) flushGoldBatch();

  syncInstances(state.nightMode);
  applyOrbitCamera();

  _hudAccum += dt;
  if (state.hudDirty || _hudAccum > 0.25) {
    _hudAccum = 0;
    updateHUD();
    state.hudDirty = false;
  }
  updateRollingNumbers(dt);
  _cpsAccum += dt;
  if (_cpsAccum > 0.08) {
    _cpsAccum = 0;
    updateCPSCounter();
  }
  _saveAccum += dt;
  if (_saveAccum > 20 && state.dirty && playerId) {
    _saveAccum = 0;
    state.dirty = false;
    saveLocal();
    pendingServerSave = true;
    updateSaveBtnState();
  }
  renderer.render(scene, camera);
}

/* ============================================================
   BOOT
   ============================================================ */
setTimeout(() => { finishLoading(); }, 2200);
applyTheme(state.currentTheme, state.nightMode);
applyFountainSkin(state.currentFountainSkin);
updateFountainLevel(state.level);
updateHUD();

introModal.classList.add('open');
renderAccountList();

requestAnimationFrame(animate);

window.addEventListener('beforeunload', (e) => {
  if (!playerId) return;
  saveLocal();
  if (pendingServerSave && ServerAPI.online) {
    e.preventDefault();
    e.returnValue = 'Masz niezapisany postęp!';
    return e.returnValue;
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && playerId) saveLocal(); });
document.addEventListener('click', () => { if (!audioUnlocked) unlockAudio(); }, { once: true });