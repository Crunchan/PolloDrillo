import * as THREE from 'three';

/* ========== SERVER ========== */
export const SERVER_CONFIG = {
  binId: '6aad8421ac6210605add6fd1',
  apiKey: '$2a$10$U5nkNQRDJuNJ7dug4DRR7.TP3xx5gVU93HwQvYsaOupR/rT3Wa/Hm',
  useServer: true
};
export const SERVER_SAVE_COOLDOWN = 45000;

/* ========== UTILS ========== */
let _seed = 987654321;
export function rand() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }
export function randRange(a, b) { return a + rand() * (b - a); }
export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function formatNum(n) {
  if (n >= 1e36) return (n / 1e36).toFixed(2) + 'Dc';
  if (n >= 1e33) return (n / 1e33).toFixed(2) + 'No';
  if (n >= 1e30) return (n / 1e30).toFixed(2) + 'Oc';
  if (n >= 1e27) return (n / 1e27).toFixed(2) + 'Sp';
  if (n >= 1e24) return (n / 1e24).toFixed(2) + 'Sx';
  if (n >= 1e21) return (n / 1e21).toFixed(2) + 'Qi';
  if (n >= 1e18) return (n / 1e18).toFixed(2) + 'Qa';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + 'Q';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ========== PLATFORM ========== */
export const IS_MOBILE = /Mobi|Android/i.test(navigator.userAgent);
export const MAX_POLLO_PER_COLOR = IS_MOBILE ? 400 : 800;
export const MAX_CROC_PER_COLOR = IS_MOBILE ? 400 : 800;
export const MAX_EYES = 3000;
export const MAX_POLLOS = 150;

/* ========== ACCOUNTS ========== */
export const ACCOUNTS_KEY = 'pollo_accounts_v1';
export const MAX_ACCOUNTS = 2;

/* ========== RANKS ========== */
export const RANK_NAMES = [
  'NOWICJUSZ','UCZEŃ','WOJOWNIK','RYCERZ','MISTRZ','WETERAN','ELITA','LEGENDA','MITYCZNY','KOSMICZNY',
  'GALAKTYCZNY','NIEŚMIERTELNY','PRAPOCZĄTEK','OSTATNI','NIESKOŃCZONY','POLLO-BÓG','COCODRILO-KRÓL','WŁADCA FONTANNY','MISTRZ ŚWIATA','ARCY-MISTRZ',
  'NIEZŁOMNY','PRZEDWIECZNY','ABSOLUT','JEDYNY','POLLO PRIME','COCODRILO OMEGA','KOSMICZNY WŁADCA','STWÓRCA','POLLO DRILLO','🐔∞🐊',
  'POLLO NADPOLLO','COCODRILO PAN','FONTANNA BÓG','WSZECH-POLLO','MISTRZ MULTIWERSUM','NIEBIOSAŃSKI','ANIOŁ POLLO','DEMON DRILO','LORD POLLO','KRÓL FONTANNY',
  'CESARZ JAJ','WŁADCA ŚWIATÓW','POLLO-INFINITY','COCODRILO PRIME','JEDYNY W SWOIM RODZAJU','POLLO NIESKOŃCZONY','OSTATNI Z DRILO','PRZEDWSZECHŚWIAT','POLLO ABSOLUT','COCODRILO ZERO',
  'PUSTKA I POLLO','PAN CAŁEGO STWORZENIA','POLLO MEGA-BÓG','COCODRILO NEXUS','STWÓRCA WSZYSTKIEGO','POLLO OMEGA','NIEZMIERZONY','POLLO-LEVIATHAN','COCODRILO TYTAN','WŁADCA CAŁOŚCI',
  'POLLO KOŃCOWY','COCODRILO FINALNY','MEGA POLLO','GIGA COCODRILO','TERA POLLO','OMEGA DRILO','🐔🔥🐊'
];
export const RANK_MULT = [
  1,1.4,1.8,2.4,3.2,4.2,5.5,7,9,11.5,14.5,18,22,27,33,40,48,58,70,84,
  100,120,145,175,210,250,300,360,430,520,
  600,690,790,910,1040,1200,1380,1580,1820,2080,
  2380,2730,3120,3580,4100,4700,5400,6200,7100,8100,
  9300,10700,12200,14000,16000,18300,21000,24000,27500,31500,
  36000,41000,47000,54000,62000,71000,81000
];
export const UPGRADE_COSTS = [
  2500, 9000, 25000, 70000, 190000, 480000, 1200000, 3000000, 7500000, 19000000,
  45000000, 115000000, 280000000, 680000000, 1650000000, 4000000000, 10000000000, 25000000000, 63000000000, 150000000000,
  380000000000, 950000000000, 2400000000000, 6000000000000, 15000000000000, 38000000000000, 95000000000000, 240000000000000, 600000000000000,
  1.32e15, 2.9e15, 6.4e15, 1.41e16, 3.1e16, 6.82e16, 1.5e17, 3.3e17, 7.26e17, 1.6e18,
  3.52e18, 7.74e18, 1.7e19, 3.75e19, 8.25e19, 1.82e20, 4.0e20, 8.8e20, 1.94e21, 4.27e21,
  9.4e21, 2.07e22, 4.55e22, 1.0e23, 2.2e23, 4.84e23, 1.06e24, 2.33e24, 5.13e24, 1.13e25,
  2.49e25, 5.48e25, 1.2e26, 2.64e26, 5.81e26, 1.28e27, 2.82e27
];
export const COLOR_VALUES = { white: 3, red: 6, blue: 12, yellow: 20, green: 35, pink: 55 };
export const COLOR_ORDER = ['white', 'red', 'blue', 'yellow', 'green', 'pink'];

/* ========== SHOP ========== */
export const SHOP_ITEMS = [
  { id: 'goldMult', icon: '🪙', name: 'Złoty Mnożnik', desc: 'Każdy Cocodrillo daje więcej złota.', baseCost: 2, costScale: 1.5, maxTier: 15, fmtEffect: (t) => `+${t * 30}% złota` },
  { id: 'polloSpeed', icon: '💨', name: 'Bieg Pollo', desc: 'Pollo szybciej biegają.', baseCost: 2, costScale: 1.45, maxTier: 12, fmtEffect: (t) => `+${t * 12}% szybkości` },
  { id: 'crocSpeed', icon: '🐊', name: 'Bieg Cocodrillo', desc: 'Cocodrillo szybciej idą.', baseCost: 3, costScale: 1.5, maxTier: 12, fmtEffect: (t) => `+${t * 12}% szybkości` },
  { id: 'eggChance', icon: '🥚', name: 'Szansa Jajek', desc: 'Mniej Cocodrillo na jajo.', baseCost: 4, costScale: 1.55, maxTier: 10, fmtEffect: (t) => `1 jajo / ${Math.max(10, 55 - t * 5)} coco` },
  { id: 'morePollo', icon: '🐔', name: 'Więcej Pollo', desc: 'Klik spawnuje więcej.', baseCost: 5, costScale: 1.6, maxTier: 8, fmtEffect: (t) => `+${t} Pollo / klik` },
  { id: 'luckyCharm', icon: '🍀', name: 'Szczęście', desc: 'Rzadsze nagrody.', baseCost: 6, costScale: 1.6, maxTier: 8, fmtEffect: (t) => `+${t * 8}% rzadkości` }
];

/* ========== PATHS (as arrays to avoid THREE coupling) ========== */
export const PATH_POLLO_POINTS = [[-13.0, 0, 0.6], [-8.0, 0, 0.3], [-2.4, 0, 0.0]];
export const PATH_CROC_POINTS = [[4.5, 0, 0], [15.8, 0, 0]];

/* ========== RARITY ========== */
export const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };

/* ========== THEMES ========== */
export const THEMES = [
  { id: 'default', label: 'Domyślne', icon: '☀️', rarity: 'common', lighting: null },
  { id: 'sunset', label: 'Zachód słońca', icon: '🌅', rarity: 'rare',
    lighting: { hemiSky: 0xffa060, hemiGround: 0x4a2010, hemiIntensity: 0.45, sunColor: 0xff7030, sunIntensity: 1.2, sunPos: [-40, 25, 20], ambientColor: 0xc05030, ambientGround: 0x40200a, ambientIntensity: 0.45, fogColor: 0x8a4060, fogNear: 40, fogFar: 170, bodyTint: 0xffe0d0 }},
  { id: 'space', label: 'Kosmos', icon: '🌌', rarity: 'epic',
    lighting: { hemiSky: 0x3040a0, hemiGround: 0x0a0510, hemiIntensity: 0.25, sunColor: 0xc0c0ff, sunIntensity: 0.6, sunPos: [-60, 80, -50], ambientColor: 0x5030a0, ambientGround: 0x100520, ambientIntensity: 0.5, fogColor: 0x1a0a40, fogNear: 50, fogFar: 200, bodyTint: 0xa0a0d0 }},
  { id: 'forest', label: 'Zaklęty las', icon: '🌲', rarity: 'rare',
    lighting: { hemiSky: 0x60a040, hemiGround: 0x102010, hemiIntensity: 0.55, sunColor: 0xb0d080, sunIntensity: 1.0, sunPos: [20, 40, 20], ambientColor: 0x305020, ambientGround: 0x102008, ambientIntensity: 0.5, fogColor: 0x2a4a20, fogNear: 30, fogFar: 150, bodyTint: 0xb0e090 }},
  { id: 'ocean', label: 'Głębia oceanu', icon: '🌊', rarity: 'rare',
    lighting: { hemiSky: 0x40a0c0, hemiGround: 0x0a1020, hemiIntensity: 0.5, sunColor: 0x80d0ff, sunIntensity: 1.0, sunPos: [10, 45, 20], ambientColor: 0x2050a0, ambientGround: 0x0a1830, ambientIntensity: 0.55, fogColor: 0x1040a0, fogNear: 30, fogFar: 160, bodyTint: 0xa0e0ff }},
  { id: 'lava', label: 'Wulkan', icon: '🌋', rarity: 'epic',
    lighting: { hemiSky: 0xff4020, hemiGround: 0x100000, hemiIntensity: 0.4, sunColor: 0xff6030, sunIntensity: 1.4, sunPos: [-30, 20, -10], ambientColor: 0x802010, ambientGround: 0x200800, ambientIntensity: 0.55, fogColor: 0x401010, fogNear: 30, fogFar: 140, bodyTint: 0xff9070 }},
  { id: 'candy', label: 'Kraina cukierków', icon: '🍭', rarity: 'rare',
    lighting: { hemiSky: 0xffc0e0, hemiGround: 0xa05080, hemiIntensity: 0.7, sunColor: 0xffe0f0, sunIntensity: 1.2, sunPos: [25, 35, 15], ambientColor: 0xff90c0, ambientGround: 0x60305a, ambientIntensity: 0.5, fogColor: 0xffd0e8, fogNear: 50, fogFar: 180, bodyTint: 0xffd0f0 }},
  { id: 'aurora', label: 'Zorza polarna', icon: '🌠', rarity: 'epic',
    lighting: { hemiSky: 0x60ffa0, hemiGround: 0x100820, hemiIntensity: 0.4, sunColor: 0x80ffd0, sunIntensity: 0.7, sunPos: [-50, 60, 30], ambientColor: 0x40c0a0, ambientGround: 0x0a0520, ambientIntensity: 0.6, fogColor: 0x205080, fogNear: 40, fogFar: 180, bodyTint: 0xb0ffe0 }},
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌃', rarity: 'epic',
    lighting: { hemiSky: 0xff20a0, hemiGround: 0x100020, hemiIntensity: 0.35, sunColor: 0x20ffd0, sunIntensity: 0.8, sunPos: [-30, 40, -20], ambientColor: 0x4020a0, ambientGround: 0x200040, ambientIntensity: 0.65, fogColor: 0x300860, fogNear: 30, fogFar: 150, bodyTint: 0xd0a0ff }},
  { id: 'tropical', label: 'Tropiki', icon: '🌴', rarity: 'rare',
    lighting: { hemiSky: 0x60d0e0, hemiGround: 0xa0a050, hemiIntensity: 0.75, sunColor: 0xfff0b0, sunIntensity: 1.5, sunPos: [30, 40, 15], ambientColor: 0xffc060, ambientGround: 0x604020, ambientIntensity: 0.5, fogColor: 0xa0e0f0, fogNear: 60, fogFar: 200, bodyTint: 0xfff8d0 }},
  { id: 'galaxy', label: 'Galaktyka', icon: '🌠', rarity: 'legendary',
    lighting: { hemiSky: 0xc060ff, hemiGround: 0x100020, hemiIntensity: 0.35, sunColor: 0xffc0ff, sunIntensity: 0.8, sunPos: [-50, 70, -40], ambientColor: 0x8040c0, ambientGround: 0x200040, ambientIntensity: 0.6, fogColor: 0x200840, fogNear: 40, fogFar: 180, bodyTint: 0xf0c0ff }},
  { id: 'inferno', label: 'Piekielna otchłań', icon: '🔥', rarity: 'mythic',
    lighting: { hemiSky: 0xff0000, hemiGround: 0x000000, hemiIntensity: 0.35, sunColor: 0xff2000, sunIntensity: 1.8, sunPos: [-20, 15, 0], ambientColor: 0xff0000, ambientGround: 0x300000, ambientIntensity: 0.7, fogColor: 0x200000, fogNear: 20, fogFar: 120, bodyTint: 0xff6040 }}
];

/* ========== FOUNTAIN SKINS ========== */
export const FOUNTAIN_SKINS = [
  { id: 'default', label: 'Klasyczna', icon: '⛲', rarity: 'common',
    base: 0xb8c2cc, rim: 0x9fd0e8, dome: 0x8fd4ff, domeEmissive: 0x1a5f9c, core: 0xbfe8ff, groundGlow: 0x9fd8ff },
  { id: 'golden', label: 'Złota', icon: '🏆', rarity: 'rare',
    base: 0xd4a838, rim: 0xffd75e, dome: 0xffe9a0, domeEmissive: 0xc08000, core: 0xfff0c0, groundGlow: 0xffd24a },
  { id: 'ice', label: 'Lodowa', icon: '❄️', rarity: 'rare',
    base: 0xc8d8e8, rim: 0x9fe0ff, dome: 0xb0e8ff, domeEmissive: 0x205a9c, core: 0xd8f0ff, groundGlow: 0x80d0ff },
  { id: 'toxic', label: 'Toksyczna', icon: '☣️', rarity: 'rare',
    base: 0x4a6a30, rim: 0x80e040, dome: 0x90e040, domeEmissive: 0x205000, core: 0xb0f050, groundGlow: 0x80e040 },
  { id: 'fire', label: 'Ognista', icon: '🔥', rarity: 'epic',
    base: 0xa03820, rim: 0xff6030, dome: 0xff8030, domeEmissive: 0x801000, core: 0xffc060, groundGlow: 0xff5020 },
  { id: 'shadow', label: 'Mroczna', icon: '🌑', rarity: 'epic',
    base: 0x2a2038, rim: 0x6040a0, dome: 0x402050, domeEmissive: 0x100020, core: 0x8060c0, groundGlow: 0x5030a0 },
  { id: 'ghost', label: 'Widmowa', icon: '👻', rarity: 'epic',
    base: 0xe0e8f0, rim: 0xffffff, dome: 0xe0f0ff, domeEmissive: 0x6090c0, core: 0xffffff, groundGlow: 0xc0e0ff },
  { id: 'chroma', label: 'Chroma', icon: '🌈', rarity: 'legendary', animated: 'rainbow' },
  { id: 'void', label: 'Pustka', icon: '🕳️', rarity: 'mythic', animated: 'void' }
];

/* ========== LOOT REWARDS ========== */
export const LOOT_REWARDS = [
  { id: 'gold_s', rarity: 'common', icon: '🪙', label: 'Złoto', weight: 300,
    apply: (ctx) => { const v = Math.floor(200 * ctx.getRankMult()); ctx.state.gold += v; return `+${formatNum(v)} złota`; } },
  { id: 'gold_m', rarity: 'uncommon', icon: '💰', label: 'Worek złota', weight: 120,
    apply: (ctx) => { const v = Math.floor(1000 * ctx.getRankMult()); ctx.state.gold += v; return `+${formatNum(v)} złota`; } },
  { id: 'gold_l', rarity: 'rare', icon: '💎', label: 'Kufer złota', weight: 40,
    apply: (ctx) => { const v = Math.floor(6000 * ctx.getRankMult()); ctx.state.gold += v; return `+${formatNum(v)} złota`; } },
  { id: 'gold_xl', rarity: 'epic', icon: '👑', label: 'Skarbiec!', weight: 12,
    apply: (ctx) => { const v = Math.floor(40000 * ctx.getRankMult()); ctx.state.gold += v; return `+${formatNum(v)} złota`; } },
  { id: 'egg_1', rarity: 'uncommon', icon: '🥚', label: '+1 Jajo', weight: 100,
    apply: (ctx) => { ctx.state.eggs += 1; return '+1 Jajo'; } },
  { id: 'egg_3', rarity: 'rare', icon: '🧺', label: '+3 Jaja', weight: 30,
    apply: (ctx) => { ctx.state.eggs += 3; return '+3 Jaja'; } },
  { id: 'egg_10', rarity: 'epic', icon: '🪺', label: '+10 Jaj!', weight: 6,
    apply: (ctx) => { ctx.state.eggs += 10; return '+10 Jaj!'; } },
  { id: 'perm_gold', rarity: 'epic', icon: '⚡', label: '+1 Mnożnik', weight: 5,
    apply: (ctx) => { ctx.shopState.goldMult = Math.min(15, ctx.shopState.goldMult + 1); return '+1 Mnożnik'; } },
  { id: 'theme_drop', rarity: 'legendary', icon: '🎨', label: 'MOTYW!', weight: 8,
    apply: (ctx) => {
      const locked = THEMES.filter(t => !ctx.state.unlockedThemes.includes(t.id));
      if (locked.length === 0) { const v = Math.floor(500000 * ctx.getRankMult()); ctx.state.gold += v; return `+${formatNum(v)} (max motywy)`; }
      const t = locked[Math.floor(Math.random() * locked.length)];
      ctx.state.unlockedThemes.push(t.id);
      ctx.state.dirty = true;
      ctx.onThemeUnlocked();
      return `🎨 MOTYW: ${t.label}!`;
    } },
  { id: 'fountain_drop', rarity: 'legendary', icon: '⛲', label: 'SKIN FONTANNY!', weight: 8,
    apply: (ctx) => {
      const locked = FOUNTAIN_SKINS.filter(s => !ctx.state.unlockedFountainSkins.includes(s.id));
      if (locked.length === 0) { const v = Math.floor(500000 * ctx.getRankMult()); ctx.state.gold += v; return `+${formatNum(v)} (max skiny)`; }
      const s = locked[Math.floor(Math.random() * locked.length)];
      ctx.state.unlockedFountainSkins.push(s.id);
      ctx.state.dirty = true;
      ctx.onSkinUnlocked();
      return `⛲ SKIN: ${s.label}!`;
    } },
  { id: 'rank_up', rarity: 'legendary', icon: '🌟', label: '+1 RANGA', weight: 1.5,
    apply: (ctx) => { if (ctx.state.level < 30) { ctx.state.level++; ctx.onLevelUp(); return `+1 RANGA!`; } ctx.state.gold += Math.floor(500000 * ctx.getRankMult()); return 'Bonus złota!'; } },
  { id: 'jackpot', rarity: 'legendary', icon: '🎰', label: 'JACKPOT!', weight: 0.5,
    apply: (ctx) => { const v = Math.floor(500000 * ctx.getRankMult()); ctx.state.gold += v; return `JACKPOT!`; } },
  { id: 'mega_jackpot', rarity: 'mythic', icon: '🌈', label: 'MEGA JACKPOT!!', weight: 0.08,
    apply: (ctx) => { const v = Math.floor(20000000 * ctx.getRankMult()); ctx.state.gold += v; ctx.state.eggs += 25; return `MEGA JACKPOT!`; } },
  { id: 'theme_mythic', rarity: 'mythic', icon: '🔥', label: 'MOTYW MYT.!!', weight: 0.5,
    apply: (ctx) => {
      const locked = THEMES.filter(t => !ctx.state.unlockedThemes.includes(t.id) && t.rarity === 'mythic');
      if (locked.length === 0) {
        const all = THEMES.filter(t => !ctx.state.unlockedThemes.includes(t.id));
        if (all.length === 0) { ctx.state.gold += Math.floor(2000000 * ctx.getRankMult()); return 'MAX motywy! Bonus!'; }
        const t = all[0]; ctx.state.unlockedThemes.push(t.id); ctx.onThemeUnlocked();
        return `🎨 MOTYW: ${t.label}!`;
      }
      const t = locked[0]; ctx.state.unlockedThemes.push(t.id);
      ctx.state.dirty = true; ctx.onThemeUnlocked();
      return `🔥 MYT. MOTYW: ${t.label}!!`;
    } },
  { id: 'fountain_mythic', rarity: 'mythic', icon: '🕳️', label: 'SKIN MYT.!!', weight: 0.5,
    apply: (ctx) => {
      const locked = FOUNTAIN_SKINS.filter(s => !ctx.state.unlockedFountainSkins.includes(s.id) && s.rarity === 'mythic');
      if (locked.length === 0) {
        const all = FOUNTAIN_SKINS.filter(s => !ctx.state.unlockedFountainSkins.includes(s.id));
        if (all.length === 0) { ctx.state.gold += Math.floor(2000000 * ctx.getRankMult()); return 'MAX skiny! Bonus!'; }
        const s = all[0]; ctx.state.unlockedFountainSkins.push(s.id); ctx.onSkinUnlocked();
        return `⛲ SKIN: ${s.label}!`;
      }
      const s = locked[0]; ctx.state.unlockedFountainSkins.push(s.id);
      ctx.state.dirty = true; ctx.onSkinUnlocked();
      return `🕳️ MYT. SKIN: ${s.label}!!`;
    } }
];

/* ========== CHARACTER PALETTES ========== */
export const CHICKEN_PALETTES = {
  white:  { body: 0xf8f8f0, wing: 0xdcdcd0, tail: 0xc8c8bc, comb: 0xff4040, beak: 0xf5a623, leg: 0xe08a1e },
  red:    { body: 0xd9473a, wing: 0xb03528, tail: 0x8e2419, comb: 0xff5555, beak: 0xf5a623, leg: 0xe08a1e },
  blue:   { body: 0x4a90d9, wing: 0x3572b0, tail: 0x27568a, comb: 0xff5555, beak: 0xf5a623, leg: 0xe08a1e },
  yellow: { body: 0xf5d020, wing: 0xd9b010, tail: 0xb89000, comb: 0xff5555, beak: 0xf5a623, leg: 0xe08a1e },
  green:  { body: 0x5fa83a, wing: 0x4a8a2e, tail: 0x3a6a22, comb: 0xff5555, beak: 0xf5a623, leg: 0xe08a1e },
  pink:   { body: 0xff8fc4, wing: 0xe06aa8, tail: 0xc04a8a, comb: 0xff5555, beak: 0xf5a623, leg: 0xe08a1e }
};
export const CROC_PALETTES = {
  white:  { body: 0xf0f0e8, belly: 0xffffff, dark: 0xd0d0c4, spike: 0xffffff, eye: 0xffffff, pupil: 0x1b1b1b, tooth: 0xfff8e0 },
  red:    { body: 0xd9473a, belly: 0xf5d0c8, dark: 0xb03528, spike: 0xff7060, eye: 0xffffff, pupil: 0x1b1b1b, tooth: 0xfff8e0 },
  blue:   { body: 0x3f8fd0, belly: 0xcfe6f5, dark: 0x2a6ba0, spike: 0x63b0e8, eye: 0xffffff, pupil: 0x1b1b1b, tooth: 0xfff8e0 },
  yellow: { body: 0xf5d020, belly: 0xfff4b0, dark: 0xd9b010, spike: 0xffe060, eye: 0xffffff, pupil: 0x1b1b1b, tooth: 0xfff8e0 },
  green:  { body: 0x5fa83a, belly: 0xd8e6a8, dark: 0x3f7a26, spike: 0x7cc24a, eye: 0xffffff, pupil: 0x1b1b1b, tooth: 0xfff8e0 },
  pink:   { body: 0xff8fc4, belly: 0xffd0e8, dark: 0xe06aa8, spike: 0xffb0d4, eye: 0xffffff, pupil: 0x1b1b1b, tooth: 0xfff8e0 }
};

/* ========== PATH VECTOR HELPERS ========== */
export function pathToVectors(points) {
  return points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
}

/* ========== SHOP STATE ========== */
export function createShopState() {
  const s = {};
  for (const item of SHOP_ITEMS) s[item.id] = 0;
  return s;
}
export function shopCost(item, tier) {
  return Math.ceil(item.baseCost * Math.pow(item.costScale, tier));
}