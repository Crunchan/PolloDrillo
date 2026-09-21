import * as THREE from 'three';
import { IS_MOBILE, rand, randRange, clamp, THEMES, FOUNTAIN_SKINS } from './config.js';

/* ============================================================
   RENDERER
   ============================================================ */
export const renderer = new THREE.WebGLRenderer({
  antialias: !IS_MOBILE,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a2848, 50, 190);

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);
export const camState = { target: new THREE.Vector3(0, 1.6, 0), theta: 0, phi: 0.95, radius: IS_MOBILE ? 20 : 27 };
export function applyOrbitCamera() {
  const { target, theta, phi, radius } = camState;
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
}
applyOrbitCamera();

/* ============================================================
   LIGHTS
   ============================================================ */
export const hemi = new THREE.HemisphereLight(0x4a6a9c, 0x1a2438, 0.15);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0x9cb8e8, 0.55);
sun.position.set(-50, 70, -40);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048);
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 100;
sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.025;
scene.add(sun, sun.target);
export const nightAmbient = new THREE.HemisphereLight(0x4060a0, 0x18202c, 0.55);
scene.add(nightAmbient);
export const waterLight = new THREE.PointLight(0x7ecdff, 1.5, 14, 2);
waterLight.position.set(0, 1.5, 0);
scene.add(waterLight);

/* ============================================================
   SHARED MATERIALS
   ============================================================ */
const MAT = {
  body: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  pollo: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  croc: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
};
export { MAT };

/* ============================================================
   GEOMETRY UTILS
   ============================================================ */
const _tmpColor = new THREE.Color();
export function pushTri(pos, col, a, b, c, color, jitter = 0.06) {
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  _tmpColor.set(color);
  const f = 1 + (rand() - 0.5) * jitter * 2;
  for (let i = 0; i < 3; i++) col.push(Math.min(1, _tmpColor.r * f), Math.min(1, _tmpColor.g * f), Math.min(1, _tmpColor.b * f));
}
export function buildGeometry(pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
export function colorize(geo, color, jitter = 0.07) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i += 3) {
    const f = 1 + (rand() - 0.5) * jitter * 2;
    for (let k = 0; k < 3; k++) arr[(i + k) * 3 + 0] = Math.min(1, c.r * f), arr[(i + k) * 3 + 1] = Math.min(1, c.g * f), arr[(i + k) * 3 + 2] = Math.min(1, c.b * f);
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
export function mergeGeos(list) {
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let off = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}

/* ============================================================
   SKY / STARS / MOON
   ============================================================ */
function makeSkyDome(topHex, bottomHex, exp = 0.85) {
  const geo = new THREE.SphereGeometry(240, 22, 14);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color(topHex);
  const bottom = new THREE.Color(bottomHex);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = clamp(pos.getY(i) / 240 * 0.5 + 0.5, 0, 1);
    c.copy(bottom).lerp(top, Math.pow(t, exp));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -1000;
  return m;
}
const daySky = makeSkyDome(0x9cc4e0, 0xf5f0e6, 0.75);
const nightSky = makeSkyDome(0x0a1430, 0x1c2a48, 0.7);
nightSky.visible = false;
scene.add(daySky, nightSky);

export const stars = (() => {
  const N = IS_MOBILE ? 500 : 900;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const u = rand(), v = rand();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 210;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    c.setHSL(0.58 + (rand() - 0.5) * 0.08, 0.3 + rand() * 0.4, 0.75 + rand() * 0.25);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, fog: false });
  const p = new THREE.Points(geo, mat);
  p.renderOrder = -900; p.visible = true;
  scene.add(p);
  return p;
})();

export const moon = (() => {
  const group = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(6.5, 22, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false })
  );
  group.add(m);
  // Kratery
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xc8d0e8, fog: false });
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(randRange(0.5, 1.2), 8), craterMat);
    const a = rand() * Math.PI * 2, r = rand() * 5;
    c.position.set(Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(Math.max(0, 6.5 * 6.5 - r * r)) - 0.1);
    c.lookAt(0, 0, 1);
    group.add(c);
  }
  // Glow sprite
  const gc = document.createElement('canvas');
  gc.width = gc.height = 256;
  const gctx = gc.getContext('2d');
  const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(200,220,255,0.85)');
  grad.addColorStop(0.35, 'rgba(150,180,255,0.3)');
  grad.addColorStop(1, 'rgba(100,140,255,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(gc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  glow.scale.set(38, 38, 1);
  group.add(glow);
  group.position.set(-58, 88, -110);
  group.visible = true;
  group.renderOrder = -950;
  scene.add(group);
  return group;
})();

/* ============================================================
   WORLD — ISLANDS / BRIDGES / BARN / CLOUDS / LAMPS
   ============================================================ */
function createIslandGeometry(radius, depth, segments = 10) {
  const RINGS = [
    { r: 1.00, y: 0.00, c: 0x88cc60 }, { r: 0.99, y: -0.10, c: 0x6cb040 },
    { r: 0.90, y: -0.32, c: 0x8a6642 }, { r: 0.68, y: -0.62, c: 0x775433 },
    { r: 0.34, y: -0.86, c: 0x5f4029 }
  ];
  const pos = [], col = [];
  const rings = [];
  for (let ri = 0; ri < RINGS.length; ri++) {
    const def = RINGS[ri];
    const pts = [];
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2 + ri * 0.22;
      const j = 1 + (rand() - 0.5) * 0.22;
      pts.push(new THREE.Vector3(Math.cos(a) * def.r * radius * j, def.y * depth * (1 + (rand() - 0.5) * 0.18), Math.sin(a) * def.r * radius * j));
    }
    rings.push(pts);
  }
  const center = new THREE.Vector3(0, 0, 0);
  for (let s = 0; s < segments; s++) pushTri(pos, col, center, rings[0][(s + 1) % segments], rings[0][s], 0x94d85c, 0.09);
  for (let ri = 0; ri < RINGS.length - 1; ri++) {
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      const a = rings[ri][s], b = rings[ri][s2], c = rings[ri + 1][s2], d = rings[ri + 1][s];
      pushTri(pos, col, a, b, c, RINGS[ri + 1].c, 0.11);
      pushTri(pos, col, a, c, d, RINGS[ri + 1].c, 0.11);
    }
  }
  const tip = new THREE.Vector3(0, -1.18 * depth, 0);
  const last = rings[RINGS.length - 1];
  for (let s = 0; s < segments; s++) pushTri(pos, col, last[s], last[(s + 1) % segments], tip, 0x51392a, 0.11);
  return buildGeometry(pos, col);
}
function createIsland(x, z, radius, depth) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const geo = createIslandGeometry(radius, depth);
  const island = new THREE.Mesh(geo, MAT.body);
  island.receiveShadow = true; island.castShadow = true;
  group.add(island);
  const decorParts = [];
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, r = rand() * radius * 0.78, h = randRange(0.22, 0.42);
    const bush = new THREE.ConeGeometry(randRange(0.12, 0.2), h, 5);
    bush.rotateY(rand() * 6.28);
    bush.translate(Math.cos(a) * r, h * 0.5, Math.sin(a) * r);
    decorParts.push(colorize(bush, rand() > 0.5 ? 0x5fa83a : 0x74c24a, 0.14));
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2, r = rand() * radius * 0.8;
    const rock = new THREE.IcosahedronGeometry(randRange(0.14, 0.26), 0);
    rock.scale(1, 0.7, 1);
    rock.translate(Math.cos(a) * r, 0.1, Math.sin(a) * r);
    decorParts.push(colorize(rock, 0x9aa0a6, 0.12));
  }
  const decor = new THREE.Mesh(mergeGeos(decorParts), MAT.body);
  decor.castShadow = true; decor.receiveShadow = true;
  group.add(decor);
  scene.add(group);
  return group;
}
function createPrismGeometry(w, h, d, color) {
  const pos = [], col = [];
  const x = w / 2, z = d / 2;
  const A = new THREE.Vector3(-x, 0, z), B = new THREE.Vector3(x, 0, z);
  const C = new THREE.Vector3(0, h, z);
  const D = new THREE.Vector3(-x, 0, -z), E = new THREE.Vector3(x, 0, -z);
  const F = new THREE.Vector3(0, h, -z);
  pushTri(pos, col, A, B, C, color, 0.06); pushTri(pos, col, E, D, F, color, 0.06);
  pushTri(pos, col, D, A, C, color, 0.06); pushTri(pos, col, D, C, F, color, 0.06);
  pushTri(pos, col, B, E, F, color, 0.06); pushTri(pos, col, B, F, C, color, 0.06);
  pushTri(pos, col, A, D, E, color, 0.06); pushTri(pos, col, A, E, B, color, 0.06);
  return buildGeometry(pos, col);
}
function createBarn(x, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z); group.rotation.y = rotY;
  const W = 2.9, H = 1.85, D = 2.45;
  const parts = [];
  parts.push(colorize(new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0), 0xc0392b, 0.08));
  parts.push(colorize(new THREE.BoxGeometry(W + 0.1, 0.17, D + 0.1).translate(0, 0.085, 0), 0xf3ede2, 0.03));
  const corners = [[W/2-0.08, D/2-0.08], [-W/2+0.08, D/2-0.08], [W/2-0.08, -D/2+0.08], [-W/2+0.08, -D/2+0.08]];
  for (const [cx, cz] of corners) parts.push(colorize(new THREE.BoxGeometry(0.17, H, 0.17).translate(cx, H / 2, cz), 0x8e2b22, 0.05));
  const roof = createPrismGeometry(W + 0.6, 1.15, D + 0.5, 0x8e2b22);
  roof.translate(0, H, 0); parts.push(roof);
  parts.push(colorize(new THREE.BoxGeometry(W + 0.66, 0.1, 0.16).translate(0, H + 1.16, 0), 0xa5342a, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(1.05, 1.22, 0.1).translate(0, 0.61, D / 2 + 0.03), 0x5c3a1e, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.08, 1.22, 0.06).translate(0, 0.61, D / 2 + 0.08), 0x3e2513, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.72, 0.62, 0.1).translate(0, H * 0.78, D / 2 + 0.03), 0x4a2c14, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.78, 0.1, 0.12).translate(0, H * 0.78 + 0.28, D / 2 + 0.06), 0xf3ede2, 0.03));
  parts.push(colorize(new THREE.BoxGeometry(0.78, 0.1, 0.12).translate(0, H * 0.78 - 0.28, D / 2 + 0.06), 0xf3ede2, 0.03));
  parts.push(colorize(new THREE.BoxGeometry(0.1, 0.62, 0.12).translate(0, H * 0.78, D / 2 + 0.06), 0xf3ede2, 0.03));
  parts.push(colorize(new THREE.BoxGeometry(0.1, 0.5, 0.5).translate(W / 2 + 0.04, H * 0.62, 0), 0xf3ede2, 0.03));
  parts.push(colorize(new THREE.BoxGeometry(0.12, 0.36, 0.36).translate(W / 2 + 0.07, H * 0.62, 0), 0x2b3a4a, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.34, 0.85, 0.34).translate(-W * 0.28, H + 1.15, -D * 0.2), 0x6b4a34, 0.07));
  const mesh = new THREE.Mesh(mergeGeos(parts), MAT.body);
  mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);
  scene.add(group);
  return group;
}
function createBridge(ax, az, bx, bz, width) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(-dz, dx);
  const group = new THREE.Group();
  group.position.set((ax + bx) / 2, 0.14, (az + bz) / 2);
  group.rotation.y = angle;
  const parts = [];
  const plankCount = Math.max(3, Math.round(len / 0.44));
  for (let i = 0; i <= plankCount; i++) {
    const px = -len / 2 + (i / plankCount) * len;
    const shade = (i % 2 === 0) ? 0xa9743f : 0x96663a;
    parts.push(colorize(new THREE.BoxGeometry(0.31, 0.11, width).translate(px, 0, 0), shade, 0.13));
  }
  for (const side of [-1, 1]) parts.push(colorize(new THREE.BoxGeometry(len, 0.14, 0.16).translate(0, -0.13, side * (width / 2 - 0.1)), 0x6d4a29, 0.08));
  for (const side of [-1, 1]) {
    const rope = new THREE.CylinderGeometry(0.035, 0.035, len, 4);
    rope.rotateZ(Math.PI / 2);
    rope.translate(0, 0.62, side * (width / 2));
    parts.push(colorize(rope, 0x8a6b45, 0.08));
  }
  const postCount = Math.max(2, Math.round(len / 0.85));
  for (let i = 0; i <= postCount; i++) {
    const px = -len / 2 + (i / postCount) * len;
    for (const side of [-1, 1]) parts.push(colorize(new THREE.BoxGeometry(0.1, 0.7, 0.1).translate(px, 0.28, side * (width / 2)), 0x7a5433, 0.09));
  }
  const mesh = new THREE.Mesh(mergeGeos(parts), MAT.body);
  mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);
  scene.add(group);
  return group;
}

/* ============================================================
   FOUNTAIN
   ============================================================ */
export const fountainGroup = new THREE.Group();
scene.add(fountainGroup);
const fountainMats = { base: null, dome: null, core: null, groundGlow: null, _baseMat: null };

(function buildBase() {
  const parts = [];
  parts.push(colorize(new THREE.CylinderGeometry(1.95, 2.15, 0.52, 9).translate(0, 0.26, 0), 0xb8c2cc, 0.08));
  parts.push(colorize(new THREE.CylinderGeometry(1.7, 1.88, 0.36, 9).translate(0, 0.70, 0), 0xd0d8e0, 0.08));
  const rim = new THREE.TorusGeometry(1.58, 0.13, 4, 10);
  rim.rotateX(Math.PI / 2); rim.translate(0, 0.90, 0);
  parts.push(colorize(rim, 0x9fd0e8, 0.09));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const blk = new THREE.BoxGeometry(0.34, 0.32, 0.34);
    blk.rotateY(-a);
    blk.translate(Math.cos(a) * 2.12, 0.16, Math.sin(a) * 2.12);
    parts.push(colorize(blk, 0xa8b2bc, 0.12));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push(colorize(new THREE.CylinderGeometry(0.1, 0.13, 0.85, 6).translate(Math.cos(a) * 1.62, 0.43, Math.sin(a) * 1.62), 0xb0bac4, 0.09));
    parts.push(colorize(new THREE.OctahedronGeometry(0.14, 0).translate(Math.cos(a) * 1.62, 0.98, Math.sin(a) * 1.62), 0xa8e4ff, 0.06));
  }
  const base = new THREE.Mesh(mergeGeos(parts), MAT.body);
  base.castShadow = true; base.receiveShadow = true;
  fountainGroup.add(base);
  fountainMats.base = base;
})();

const DOME_RADIUS = 1.65;
const domeGeo = new THREE.SphereGeometry(DOME_RADIUS, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
const domeBasePos = new Float32Array(domeGeo.attributes.position.array);
const domePosAttr = domeGeo.attributes.position;
const domeMat = new THREE.MeshPhongMaterial({
  color: 0x8fd4ff, emissive: 0x1a5f9c, emissiveIntensity: 0.5,
  transparent: true, opacity: 0.6, shininess: 95, specular: 0xffffff,
  side: THREE.DoubleSide, depthWrite: false
});
const waterDome = new THREE.Mesh(domeGeo, domeMat);
waterDome.position.y = 1.05; waterDome.renderOrder = 2;
fountainGroup.add(waterDome);
fountainMats.dome = waterDome;

const coreMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
const waterCore = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), coreMat);
waterCore.position.y = 1.35; waterCore.renderOrder = 1;
fountainGroup.add(waterCore);
fountainMats.core = waterCore;

const ripples = [];
for (let i = 0; i < 4; i++) {
  const rg = new THREE.RingGeometry(0.4, 0.55, 24);
  rg.rotateX(-Math.PI / 2);
  const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  rm.position.y = 1.06;
  rm.userData.phase = i * 0.25;
  fountainGroup.add(rm);
  ripples.push(rm);
}
const droplets = [];
const dropGeo = new THREE.SphereGeometry(0.075, 6, 5);
const dropMat = new THREE.MeshLambertMaterial({ color: 0xa8e4ff, emissive: 0x3a8fc0, emissiveIntensity: 0.8, flatShading: true, transparent: true, opacity: 0.9 });
for (let i = 0; i < 9; i++) {
  const d = new THREE.Mesh(dropGeo, dropMat);
  d.userData = { angle: (i / 9) * Math.PI * 2, radius: 1.65 + rand() * 0.35, yBase: 1.15 + rand() * 0.7, bobPhase: rand() * 6.28, speed: 0.9 + rand() * 0.7 };
  fountainGroup.add(d);
  droplets.push(d);
}
const groundGlowMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
const groundGlow = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.4, 32).rotateX(-Math.PI / 2), groundGlowMat);
groundGlow.position.y = 0.03;
fountainGroup.add(groundGlow);
fountainMats.groundGlow = groundGlow;

const fountainAddons = [];
function addAddon(level, group, animated = null) {
  group.visible = false;
  group.userData.minLevel = level;
  group.userData.animated = animated;
  fountainGroup.add(group);
  fountainAddons.push(group);
}

// Lv 2 — złota obwódka
(function(){ const g = new THREE.Group(); const rim = new THREE.TorusGeometry(1.64, 0.09, 6, 24).rotateX(Math.PI / 2).translate(0, 0.93, 0); g.add(new THREE.Mesh(colorize(rim, 0xffd75e, 0.03), MAT.body)); addAddon(2, g); })();
// Lv 3 — klejnoty wokół podstawy
(function(){ const g = new THREE.Group(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0x9fe8ff })); gem.position.set(Math.cos(a) * 2.3, 0.36, Math.sin(a) * 2.3); g.add(gem); } addAddon(3, g); })();
// Lv 4 — kryształ na filarze
(function(){ const g = new THREE.Group(); g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 6).translate(0, 2.9, 0), 0xd8e0e8), MAT.body)); const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshPhongMaterial({ color: 0xaee8ff, emissive: 0x2a7fb8, emissiveIntensity: 0.9, transparent: true, opacity: 0.92, shininess: 100 })); cr.position.y = 3.5; g.add(cr); addAddon(4, g, (t) => { cr.rotation.y = t * 1.5; }); })();
// Lv 5 — małe fontanny na filarach
(function(){ const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const x = Math.cos(a) * 1.7, z = Math.sin(a) * 1.7; g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.12, 0.16, 0.55, 6).translate(x, 1.2, z), 0xd8e0e8), MAT.body)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.7, 6).translate(x, 1.85, z), new THREE.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.7 }))); } addAddon(5, g); })();
// Lv 6 — orbitujące kule
(function(){ const g = new THREE.Group(); const orbs = []; for (let i = 0; i < 6; i++) { const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.9 })); orb.userData.phase = (i / 6) * Math.PI * 2; orb.userData.r = 2.6; g.add(orb); orbs.push(orb); } addAddon(6, g, (t) => { for (const o of orbs) { const a = t * 0.6 + o.userData.phase; o.position.set(Math.cos(a) * o.userData.r, 2.2 + Math.sin(t * 1.4 + o.userData.phase) * 0.35, Math.sin(a) * o.userData.r); } }); })();
// Lv 7 — świecące kolumny
(function(){ const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 8, 1, true).translate(Math.cos(a) * 1.4, 2.6, Math.sin(a) * 1.4), mat)); } addAddon(7, g); })();
// Lv 8 — 6 złotych filarów z kulami
(function(){ const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const x = Math.cos(a) * 2.55, z = Math.sin(a) * 2.55; g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.12, 0.14, 1.7, 6).translate(x, 0.85, z), 0xffd75e, 0.05), MAT.body)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6).translate(x, 1.85, z), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }))); } addAddon(8, g); })();
// Lv 9 — 3 małe pierścienie wokół kopuły
(function(){ const g = new THREE.Group(); const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.12, 0.03, 5, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); r.position.y = 2.6 + i * 0.18; r.userData.phase = i * 0.8; g.add(r); rings.push(r); } addAddon(9, g, (t) => { for (let i = 0; i < rings.length; i++) { rings[i].rotation.z = t * 0.5 + rings[i].userData.phase; rings[i].rotation.x = Math.sin(t * 0.8 + rings[i].userData.phase) * 0.4; } }); })();
// Lv 10 — baldachim
(function(){ const g = new THREE.Group(); const canopy = new THREE.TorusGeometry(1.4, 0.09, 6, 24).rotateX(Math.PI / 2).translate(0, 4.2, 0); g.add(new THREE.Mesh(colorize(canopy, 0xffd75e, 0.04), MAT.body)); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 5).translate(Math.cos(a) * 1.4, 3.85, Math.sin(a) * 1.4), 0xffd75e, 0.04), MAT.body)); } addAddon(10, g); })();
// Lv 11 — iskry wokół podstawy
(function(){ const g = new THREE.Group(); const sparks = []; const mat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }); for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), mat); s.userData.phase = (i / 10) * Math.PI * 2; s.userData.r = 2.05; s.userData.baseY = 0.9 + rand() * 0.5; g.add(s); sparks.push(s); } addAddon(11, g, (t) => { for (const s of sparks) { const a = t * 0.8 + s.userData.phase; s.position.set(Math.cos(a) * s.userData.r, s.userData.baseY + Math.sin(t * 2 + s.userData.phase) * 0.25, Math.sin(a) * s.userData.r); } }); })();
// Lv 12 — kryształowy posąg
(function(){ const g = new THREE.Group(); const statue = new THREE.Mesh(colorize(new THREE.OctahedronGeometry(0.42, 0), 0xffe58a, 0.04), MAT.body); statue.position.y = 4.55; statue.scale.set(1, 1.4, 1); g.add(statue); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 5.15, 0), new THREE.MeshBasicMaterial({ color: 0xffd24a }))); addAddon(12, g); })();
// Lv 13 — złota aureola nad rdzeniem
(function(){ const g = new THREE.Group(); const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); halo.position.y = 3.3; g.add(halo); addAddon(13, g, (t) => { halo.rotation.z = t * 0.6; }); })();
// Lv 14 — obracający się pierścień
(function(){ const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 6, 20).rotateX(Math.PI / 2).translate(0, 3.2, 0), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 })); g.add(ring); addAddon(14, g, (t) => { ring.rotation.y = t * 1.2; }); })();
// Lv 15 — pierścienie na ziemi
(function(){ const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb88fff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); ring.position.y = 0.05; g.add(ring); const ring2 = new THREE.Mesh(new THREE.RingGeometry(4.0, 4.15, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); ring2.position.y = 0.05; g.add(ring2); addAddon(15, g, (t) => { ring.rotation.z = t * 0.35; ring2.rotation.z = -t * 0.5; }); })();
// Lv 16 — kryształowe kolce na kopule
(function(){ const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 5), new THREE.MeshPhongMaterial({ color: 0xaee8ff, emissive: 0x2a7fb8, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 })); sp.position.set(Math.cos(a) * 1.05, 2.5, Math.sin(a) * 1.05); sp.rotation.z = Math.PI * 0.06; sp.rotation.y = -a; g.add(sp); } addAddon(16, g); })();
// Lv 17 — 2 filary z kryształami
(function(){ const g = new THREE.Group(); for (let i = 0; i < 2; i++) { const x = (i === 0 ? -1 : 1) * 2.4; g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.16, 0.2, 2.4, 6).translate(x, 1.2, 0), 0xdfe8f0), MAT.body)); g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshBasicMaterial({ color: 0x9fe8ff })).translateX(x).translateY(2.6)); } addAddon(17, g); })();
// Lv 18 — pływające klejnoty orbitujące szeroko
(function(){ const g = new THREE.Group(); const gems = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshPhongMaterial({ color: 0xcfefff, emissive: 0x4a9fd8, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 })); m.userData.phase = (i / 5) * Math.PI * 2; g.add(m); gems.push(m); } addAddon(18, g, (t) => { for (const m of gems) { const a = t * 0.35 + m.userData.phase; m.position.set(Math.cos(a) * 2.8, 3.6 + Math.sin(t * 0.9 + m.userData.phase) * 0.4, Math.sin(a) * 2.8); m.rotation.y = t; m.rotation.x = t * 0.6; } }); })();
// Lv 19 — 8 strumieni wody
(function(){ const g = new THREE.Group(); const jets = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const j = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.9, 6), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.65 })); j.position.set(Math.cos(a) * 1.9, 1.7, Math.sin(a) * 1.9); j.userData.phase = i * 0.5; g.add(j); jets.push(j); } addAddon(19, g, (t) => { for (const j of jets) j.position.y = 1.7 + Math.sin(t * 3 + j.userData.phase) * 0.25; }); })();
// Lv 20 — wielki pływający klejnot nad kopułą
(function(){ const g = new THREE.Group(); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshPhongMaterial({ color: 0x9fe8ff, emissive: 0x2a7fb8, emissiveIntensity: 1.1, transparent: true, opacity: 0.92, shininess: 120 })); gem.position.y = 5.0; g.add(gem); const halo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); halo.position.y = 5.0; g.add(halo); addAddon(20, g, (t) => { gem.rotation.y = t * 0.9; gem.rotation.x = Math.sin(t * 0.7) * 0.3; halo.rotation.z = -t * 0.6; }); })();
// Lv 21 — złoty posąg
(function(){ const g = new THREE.Group(); const s = new THREE.Mesh(colorize(new THREE.IcosahedronGeometry(0.5, 0), 0xffd24a, 0.03), MAT.body); s.position.y = 5.4; s.scale.set(1, 1.2, 1); g.add(s); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6).translate(0, 6.05, 0), new THREE.MeshBasicMaterial({ color: 0xffe58a }))); addAddon(21, g, (t) => { s.rotation.y = t * 0.8; }); })();
// Lv 22 — złote skrzydła po bokach
(function(){ const g = new THREE.Group(); for (const side of [-1, 1]) { const wingGroup = new THREE.Group(); for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15 + i * 0.25, 0.9), new THREE.MeshPhongMaterial({ color: 0xffd75e, emissive: 0xa06000, emissiveIntensity: 0.7, transparent: true, opacity: 0.9 })); w.position.set(side * (2.0 + i * 0.15), 1.5 + i * 0.05, -0.15 * i); w.rotation.x = -0.1 * i; wingGroup.add(w); } g.add(wingGroup); } addAddon(22, g); })();
// Lv 23 — orbitujące kryształy
(function(){ const g = new THREE.Group(); const crs = []; for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshPhongMaterial({ color: 0xb88fff, emissive: 0x5a3f9c, emissiveIntensity: 0.8, transparent: true, opacity: 0.9, shininess: 100 })); c.userData.phase = (i / 5) * Math.PI * 2; c.userData.r = 3.0; g.add(c); crs.push(c); } addAddon(23, g, (t) => { for (const c of crs) { const a = t * 0.5 + c.userData.phase; c.position.set(Math.cos(a) * c.userData.r, 3.5 + Math.sin(t * 1.6 + c.userData.phase) * 0.5, Math.sin(a) * c.userData.r); c.rotation.y = t * 1.5; } }); })();
// Lv 25 — łuk
(function(){ const g = new THREE.Group(); const arch = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.12, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0xff9ed4, transparent: true, opacity: 0.75 })); arch.position.y = 3.5; arch.rotation.y = Math.PI / 2; g.add(arch); addAddon(25, g, (t) => { arch.rotation.z = Math.sin(t * 0.8) * 0.15; }); })();
// Lv 26 — kolumny światła z podstawy w górę
(function(){ const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); const cols = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 6.5, 6, 1, true), mat); col.position.set(Math.cos(a) * 2.2, 3.5, Math.sin(a) * 2.2); g.add(col); cols.push(col); } addAddon(26, g, (t) => { for (let i = 0; i < cols.length; i++) { cols[i].scale.y = 1 + Math.sin(t * 1.8 + i) * 0.08; } }); })();
// Lv 27 — tęczowe pierścienie
(function(){ const g = new THREE.Group(); const cols = [0xff6060, 0xffb040, 0xffe060, 0x9ce870, 0x60b8ff, 0xb88fff]; for (let i = 0; i < cols.length; i++) { const r = 2.9 + i * 0.08; const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.06, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: cols[i], transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); ring.position.y = 0.04; g.add(ring); } addAddon(27, g, (t) => { g.rotation.y = t * 0.3; }); })();
// Lv 28 — gigantyczna aura + dodatkowe orbity
(function(){ const g = new THREE.Group(); const aura = new THREE.Mesh(new THREE.RingGeometry(5.0, 6.5, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb88fff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); aura.position.y = 0.06; g.add(aura); const orb1 = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.08, 8, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.85 })); orb1.position.y = 3.0; g.add(orb1); const orb2 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.06, 8, 40).rotateX(Math.PI / 2 + 0.3), new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.8 })); orb2.position.y = 3.2; g.add(orb2); addAddon(28, g, (t) => { aura.rotation.z = -t * 0.2; orb1.rotation.z = t * 0.5; orb1.rotation.y = t * 0.4; orb2.rotation.y = -t * 0.35; orb2.rotation.z = -t * 0.3; }); })();
// Lv 29 — druga warstwa orbitujących kryształów
(function(){ const g = new THREE.Group(); const outer = []; for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshPhongMaterial({ color: 0xffd24a, emissive: 0xa06000, emissiveIntensity: 1.0, transparent: true, opacity: 0.95 })); c.userData.phase = (i / 8) * Math.PI * 2; g.add(c); outer.push(c); } addAddon(29, g, (t) => { for (const c of outer) { const a = t * 0.4 + c.userData.phase; c.position.set(Math.cos(a) * 4.5, 4.6 + Math.sin(t * 1.1 + c.userData.phase * 2) * 0.5, Math.sin(a) * 4.5); c.rotation.y = t * 1.4; c.rotation.x = t * 0.8; } }); })();
// Lv 30 — MOCARNE FINAŁOWE: mega rdzeń, podwójne halo, korona kolców, słup światła
(function(){
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), new THREE.MeshPhongMaterial({ color: 0xffd24a, emissive: 0xff9d13, emissiveIntensity: 1.6, transparent: true, opacity: 0.98 }));
  core.position.y = 6.8;
  g.add(core);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.7, 36).rotateX(-Math.PI / 2), haloMat);
  halo.position.y = 6.8;
  g.add(halo);
  const halo2 = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.05, 36).rotateX(-Math.PI / 2 + 0.25), haloMat.clone());
  halo2.position.y = 6.9;
  g.add(halo2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.75, 5), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    spike.position.set(Math.cos(a) * 1.05, 6.8, Math.sin(a) * 1.05);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = -a;
    g.add(spike);
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 22, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 17;
  g.add(beam);
  const bRings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.4 + i * 0.4, 0.06, 6, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.85 }));
    r.position.y = 8 + i * 1.4;
    g.add(r);
    bRings.push(r);
  }
  addAddon(30, g, (t) => {
    core.rotation.y = t * 1.3;
    core.rotation.x = Math.sin(t * 0.9) * 0.25;
    halo.rotation.z = t * 0.9;
    halo2.rotation.z = -t * 1.1;
    halo2.rotation.x = Math.sin(t * 0.7) * 0.15;
    for (let i = 0; i < bRings.length; i++) bRings[i].rotation.z = t * (0.4 + i * 0.2) * (i % 2 ? -1 : 1);
    beam.material.opacity = 0.12 + Math.sin(t * 1.8) * 0.08;
  });
})();

export function updateFountainLevel(level) {
  for (const g of fountainAddons) g.visible = level >= g.userData.minLevel;
}
export function animateFountain(time) {
  const pos = domePosAttr, base = domeBasePos;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
    const wave = Math.sin(time * 2.2 + x * 3.2 + z * 3.2) * 0.075 + Math.sin(time * 3.7 + y * 4.5) * 0.045 + Math.sin(time * 1.4 + x * 1.5 - z * 1.5) * 0.06;
    pos.setY(i, y + wave);
  }
  pos.needsUpdate = true;
  domeGeo.computeVertexNormals();
  for (const r of ripples) {
    const t = ((time * 0.75 + r.userData.phase) % 1);
    r.scale.set(0.4 + t * 2.2, 1, 0.4 + t * 2.2);
    r.material.opacity = (1 - t) * 0.75;
  }
  for (const d of droplets) {
    const u = d.userData;
    u.angle += u.speed * 0.012;
    d.position.set(Math.cos(u.angle) * u.radius, u.yBase + Math.sin(time * 2.0 + u.bobPhase) * 0.22, Math.sin(u.angle) * u.radius);
  }
  const pulse = 1 + Math.sin(time * 2.4) * 0.08;
  waterCore.scale.setScalar(pulse);
  waterCore.material.opacity = 0.45 + Math.sin(time * 2.4) * 0.15;
  groundGlow.material.opacity = 0.35 + Math.sin(time * 1.5) * 0.15;
  for (const g of fountainAddons) if (g.visible && g.userData.animated) g.userData.animated(time);
}

export function applyFountainSkin(skinId) {
  const skin = FOUNTAIN_SKINS.find(s => s.id === skinId) || FOUNTAIN_SKINS[0];
  if (skin.animated === 'rainbow' || skin.animated === 'void') return;
  if (!fountainMats._baseMat) fountainMats._baseMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  fountainMats._baseMat.color.setHex(skin.base);
  if (fountainMats.base) fountainMats.base.material = fountainMats._baseMat;
  if (fountainMats.dome) { fountainMats.dome.material.color.setHex(skin.dome); fountainMats.dome.material.emissive.setHex(skin.domeEmissive); }
  if (fountainMats.core) fountainMats.core.material.color.setHex(skin.core);
  if (fountainMats.groundGlow) fountainMats.groundGlow.material.color.setHex(skin.groundGlow);
  for (const r of ripples) r.material.color.setHex(skin.rim);
  for (const d of droplets) { d.material.color.setHex(skin.core); d.material.emissive.setHex(skin.domeEmissive); }
  waterLight.color.setHex(skin.core);
}
export function updateFountainSkinAnim(skinId, t) {
  const skin = FOUNTAIN_SKINS.find(s => s.id === skinId) || FOUNTAIN_SKINS[0];
  if (!fountainMats._baseMat) fountainMats._baseMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  if (fountainMats.base) fountainMats.base.material = fountainMats._baseMat;
  if (skin.animated === 'rainbow') {
    const h = (t * 0.15) % 1;
    const hueC = new THREE.Color().setHSL(h, 0.85, 0.6);
    const hueC2 = new THREE.Color().setHSL((h + 0.3) % 1, 0.85, 0.5);
    fountainMats._baseMat.color.copy(hueC2);
    fountainMats.dome.material.color.copy(hueC);
    fountainMats.dome.material.emissive.copy(hueC2);
    fountainMats.core.material.color.copy(hueC);
    fountainMats.groundGlow.material.color.copy(hueC);
    for (const r of ripples) r.material.color.copy(hueC);
    waterLight.color.copy(hueC);
  } else if (skin.animated === 'void') {
    const pulse = 0.3 + Math.sin(t * 2.5) * 0.15;
    fountainMats._baseMat.color.setRGB(pulse * 0.15, 0.02, pulse * 0.35);
    fountainMats.dome.material.color.setRGB(pulse * 0.3, 0.05, pulse * 0.5);
    fountainMats.dome.material.emissive.setRGB(pulse * 0.4, 0.05, pulse * 0.6);
    fountainMats.core.material.color.setRGB(pulse * 0.5, 0.1, pulse * 0.7);
    fountainMats.groundGlow.material.color.setRGB(pulse * 0.3, 0.05, pulse * 0.5);
    for (const r of ripples) r.material.color.setRGB(pulse * 0.4, 0.08, pulse * 0.6);
    waterLight.color.setRGB(pulse * 0.4, 0.05, pulse * 0.6);
  }
}

/* ============================================================
   CLOUDS + LAMPS + INSTANCES
   ============================================================ */
const clouds = [];
function createCloud(x, y, z, scale) {
  const g = new THREE.Group();
  const parts = [];
  const blobs = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < blobs; i++) {
    const box = new THREE.BoxGeometry(randRange(1.0, 2.0) * scale, randRange(0.6, 1.0) * scale, randRange(0.9, 1.7) * scale);
    box.translate(randRange(-1.2, 1.2) * scale, randRange(-0.25, 0.35) * scale, randRange(-0.9, 0.9) * scale);
    parts.push(colorize(box, 0xffffff, 0.04));
  }
  const mesh = new THREE.Mesh(mergeGeos(parts), MAT.body);
  g.add(mesh);
  g.position.set(x, y, z);
  g.userData = { baseY: y, bobPhase: rand() * 6.28, driftSpeed: randRange(0.15, 0.45) };
  scene.add(g);
  clouds.push(g);
}

const lamps = [];
function createLamp(x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.08, 0.11, 3.0, 6).translate(0, 1.5, 0), 0x2a1f16, 0.08), MAT.body));
  g.add(new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.22, 0.28, 0.2, 6).translate(0, 0.1, 0), 0x2a1f16, 0.08), MAT.body));
  const arm = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 5);
  arm.rotateZ(Math.PI / 2);
  arm.translate(0.25, 3.0, 0);
  g.add(new THREE.Mesh(colorize(arm, 0x2a1f16, 0.06), MAT.body));
  g.add(new THREE.Mesh(colorize(new THREE.BoxGeometry(0.34, 0.28, 0.34).translate(0.5, 3.0, 0), 0x3a2a1a, 0.08), MAT.body));
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd680 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bulbMat);
  bulb.position.set(0.5, 2.86, 0);
  g.add(bulb);
  const light = new THREE.PointLight(0xffb060, 0, 20, 1.4);
  light.position.set(0.5, 2.85, 0);
  g.add(light);
  scene.add(g);
  g.userData = { light, bulb };
  lamps.push(g);
  return g;
}

/* ============================================================
   FIREFLIES (night) + BUTTERFLIES (day)
   ============================================================ */
const fireflies = [];
(function createFireflies() {
  const ffGeo = new THREE.SphereGeometry(0.075, 6, 4);
  for (let i = 0; i < 34; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff0a0, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const m = new THREE.Mesh(ffGeo, mat);
    m.userData = {
      centerX: randRange(-14, 14),
      centerZ: randRange(-5, 5),
      radius: randRange(0.6, 2.8),
      speed: randRange(0.25, 0.7),
      phase: rand() * Math.PI * 2,
      bobSpeed: randRange(0.9, 2.2),
      baseY: randRange(0.4, 3.5),
      bobAmp: randRange(0.35, 0.9),
      pulsePhase: rand() * Math.PI * 2,
      pulseSpeed: randRange(1.6, 3.4)
    };
    m.visible = false;
    scene.add(m);
    fireflies.push(m);
  }
})();

const butterflies = [];
(function createButterflies() {
  const lwGeo = new THREE.PlaneGeometry(0.26, 0.2).translate(-0.13, 0, 0);
  const rwGeo = new THREE.PlaneGeometry(0.26, 0.2).translate(0.13, 0, 0);
  const bodyGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.24, 4);
  const colors = [0xff80b0, 0xffd24a, 0x9fd8ff, 0xb88fff, 0xff9c60, 0x7ce68a];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const col = colors[i % colors.length];
    const wingMat = new THREE.MeshBasicMaterial({
      color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.92, fog: false
    });
    const lw = new THREE.Mesh(lwGeo, wingMat);
    const rw = new THREE.Mesh(rwGeo, wingMat);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: 0x1a1a1a, fog: false }));
    body.rotation.z = Math.PI / 2;
    g.add(lw, rw, body);
    g.userData = {
      lw, rw,
      centerX: randRange(-13, 13),
      centerZ: randRange(-4, 4),
      radius: randRange(0.9, 2.8),
      speed: randRange(0.3, 0.6),
      phase: rand() * Math.PI * 2,
      flapPhase: rand() * Math.PI * 2,
      flapSpeed: randRange(9, 15),
      baseY: randRange(1.2, 3.8),
      bobAmp: randRange(0.2, 0.5),
      bobSpeed: randRange(1.2, 2.5)
    };
    g.visible = false;
    scene.add(g);
    butterflies.push(g);
  }
})();

/* Build world */
createIsland(-12, 0, 4.6, 3.2);
createIsland(0, 0, 5.0, 3.8);
createIsland(12, 0, 4.6, 3.2);
createBarn(-13.1, -1.9, 0.22);
createBridge(-8.6, 0, -4.4, 0, 1.9);
createBridge(4.4, 0, 8.6, 0, 1.9);
createCloud(-22, 16, -18, 1.5);
createCloud(18, 20, -24, 1.9);
createCloud(2, 24, -30, 1.6);
createCloud(26, 13, -6, 1.3);
createCloud(-16, 21, 14, 1.4);
createCloud(6, 18, 20, 1.2);
createCloud(-30, 12, -2, 1.4);
createLamp(-9.5, -2.6, 0.3);
createLamp(9.5, 2.6, -0.3);
createLamp(0, -4.6, 0);

/* ============================================================
   PARTICLES
   ============================================================ */
const PCOUNT = 400;
const pPositions = new Float32Array(PCOUNT * 3);
const pColors = new Float32Array(PCOUNT * 3);
const pVel = new Float32Array(PCOUNT * 3);
const pLife = new Float32Array(PCOUNT);
let pCursor = 0;
for (let i = 0; i < PCOUNT; i++) pPositions[i * 3 + 1] = -9999;
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
const particleMat = new THREE.PointsMaterial({ size: 0.26, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false });
const particleSystem = new THREE.Points(particleGeo, particleMat);
particleSystem.frustumCulled = false;
scene.add(particleSystem);
export function burstParticles(pos, colorHex, count) {
  const c = new THREE.Color(colorHex);
  for (let i = 0; i < count; i++) {
    const idx = pCursor;
    pCursor = (pCursor + 1) % PCOUNT;
    pPositions[idx * 3] = pos.x; pPositions[idx * 3 + 1] = pos.y; pPositions[idx * 3 + 2] = pos.z;
    const speed = 1.6 + rand() * 3.2;
    const a = rand() * Math.PI * 2, e = rand() * Math.PI * 0.5;
    pVel[idx * 3] = Math.cos(a) * Math.cos(e) * speed;
    pVel[idx * 3 + 1] = Math.sin(e) * speed + 2.2;
    pVel[idx * 3 + 2] = Math.sin(a) * Math.cos(e) * speed;
    pLife[idx] = 0.85 + rand() * 0.7;
    const f = 0.8 + rand() * 0.4;
    pColors[idx * 3] = Math.min(1, c.r * f); pColors[idx * 3 + 1] = Math.min(1, c.g * f); pColors[idx * 3 + 2] = Math.min(1, c.b * f);
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate = true;
}
export function updateParticles(dt) {
  let dirty = false;
  for (let i = 0; i < PCOUNT; i++) {
    if (pLife[i] <= 0) continue;
    dirty = true;
    pLife[i] -= dt;
    if (pLife[i] <= 0) { pPositions[i * 3 + 1] = -9999; continue; }
    pVel[i * 3 + 1] -= 11.0 * dt;
    pPositions[i * 3] += pVel[i * 3] * dt;
    pPositions[i * 3 + 1] += pVel[i * 3 + 1] * dt;
    pPositions[i * 3 + 2] += pVel[i * 3 + 2] * dt;
  }
  if (dirty) particleGeo.attributes.position.needsUpdate = true;
}

/* ============================================================
   POPUPS
   ============================================================ */
const popupLayer = document.getElementById('popups');
const popups = [];
const _projVec = new THREE.Vector3();
export function spawnPopup(text, worldPos, isEgg = false, delay = 0, life = 1.9) {
  const el = document.createElement('div');
  el.className = 'popup' + (isEgg ? ' egg' : '');
  el.textContent = text;
  el.style.opacity = '0';
  popupLayer.appendChild(el);
  popups.push({ el, pos: worldPos.clone(), life, maxLife: life, delay, isEgg });
}
export function updatePopups(dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.life -= dt;
    if (p.life <= 0) { p.el.remove(); popups.splice(i, 1); continue; }
    p.pos.y += dt * 1.35;
    _projVec.copy(p.pos).project(camera);
    const behind = _projVec.z > 1;
    const x = (_projVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_projVec.y * 0.5 + 0.5) * window.innerHeight;
    const t = 1 - p.life / p.maxLife;
    const scale = t < 0.18 ? 0.4 + (t / 0.18) * 0.9 : 1.3 - (t - 0.18) * 0.32;
    const alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    p.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    p.el.style.opacity = behind ? '0' : alpha.toFixed(2);
  }
}

/* ============================================================
   THEMES — generate textures + lighting transitions
   ============================================================ */
function generateThemeTexture(id) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 512);
  const linGrad = (stops) => { const g = ctx.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; };
  switch (id) {
    case 'sunset': {
      ctx.fillStyle = linGrad([[0,'#1a0830'],[0.35,'#6a1a5a'],[0.62,'#d84a6a'],[0.82,'#ffa860'],[1,'#ffe0a0']]);
      ctx.fillRect(0,0,1024,512);
      ctx.fillStyle = 'rgba(255,240,200,0.9)';
      ctx.beginPath(); ctx.arc(512, 400, 90, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,180,140,0.3)';
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.ellipse(rand()*1024, 200+rand()*200, randRange(80,220), randRange(12,26), 0, 0, Math.PI*2); ctx.fill(); }
      break;
    }
    case 'space': {
      ctx.fillStyle = '#000005'; ctx.fillRect(0,0,1024,512);
      for (let i = 0; i < 400; i++) { const x = rand()*1024, y = rand()*512, s = rand()*2+0.5, b = 150+rand()*105; ctx.fillStyle = `rgba(${b},${b},255,${0.4+rand()*0.6})`; ctx.fillRect(x,y,s,s); }
      const nebula = ctx.createRadialGradient(400,250,20,400,250,400);
      nebula.addColorStop(0,'rgba(160,60,200,0.35)'); nebula.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = nebula; ctx.fillRect(0,0,1024,512);
      const nebula2 = ctx.createRadialGradient(700,320,30,700,320,350);
      nebula2.addColorStop(0,'rgba(60,120,220,0.3)'); nebula2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = nebula2; ctx.fillRect(0,0,1024,512);
      break;
    }
    case 'forest': {
      ctx.fillStyle = linGrad([[0,'#0a2010'],[0.5,'#1a4a20'],[1,'#2a5a30']]);
      ctx.fillRect(0,0,1024,512);
      for (let i = 0; i < 30; i++) {
        const x = rand()*1024, h = 200+rand()*300, w = 30+rand()*40;
        ctx.fillStyle = `rgba(20,${40+rand()*30|0},20,0.9)`;
        ctx.beginPath(); ctx.moveTo(x,512); ctx.lineTo(x+w,512); ctx.lineTo(x+w/2,512-h); ctx.closePath(); ctx.fill();
      }
      const rays = ctx.createLinearGradient(400,0,600,512);
      rays.addColorStop(0,'rgba(200,255,150,0.15)'); rays.addColorStop(1,'rgba(200,255,150,0)');
      ctx.fillStyle = rays; ctx.fillRect(0,0,1024,512);
      break;
    }
    case 'ocean': {
      ctx.fillStyle = linGrad([[0,'#001a40'],[0.4,'#005a9a'],[0.8,'#2080b0'],[1,'#40b0d0']]);
      ctx.fillRect(0,0,1024,512);
      ctx.strokeStyle = 'rgba(180,240,255,0.25)'; ctx.lineWidth = 3;
      for (let w = 0; w < 8; w++) {
        ctx.beginPath(); const y0 = 60+w*60; ctx.moveTo(0, y0);
        for (let x = 0; x <= 1024; x += 20) ctx.lineTo(x, y0 + Math.sin(x*0.02+w)*15);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(200,255,255,0.3)';
      for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(rand()*1024, rand()*512, randRange(3,12), 0, Math.PI*2); ctx.fill(); }
      break;
    }
    case 'lava': {
      ctx.fillStyle = '#100000'; ctx.fillRect(0,0,1024,512);
      ctx.strokeStyle = '#ff6020'; ctx.lineWidth = 4;
      ctx.shadowColor = '#ff8020'; ctx.shadowBlur = 20;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath(); let x = rand()*1024, y = rand()*512; ctx.moveTo(x,y);
        for (let j = 0; j < 4; j++) { x += randRange(-80,80); y += randRange(-60,60); ctx.lineTo(x,y); }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      const glow = ctx.createRadialGradient(512,400,50,512,400,500);
      glow.addColorStop(0,'rgba(255,100,0,0.5)'); glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0,0,1024,512);
      break;
    }
    case 'candy': {
      ctx.fillStyle = linGrad([[0,'#ffe0f0'],[0.5,'#ffb0d8'],[1,'#ff90c0']]);
      ctx.fillRect(0,0,1024,512);
      for (let i = 0; i < 200; i++) {
        const cols = ['#ff80b0','#ffe080','#b0e0ff','#a0ff80','#ffa080'];
        ctx.fillStyle = cols[Math.floor(rand()*cols.length)];
        ctx.beginPath(); ctx.arc(rand()*1024, rand()*512, randRange(4,14), 0, Math.PI*2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 6;
      for (let i = 0; i < 6; i++) {
        const cx = rand()*1024, cy = rand()*512;
        ctx.beginPath();
        for (let t = 0; t < Math.PI*4; t += 0.2) {
          const r = t*3, x = cx + Math.cos(t)*r, y = cy + Math.sin(t)*r;
          if (t === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'aurora': {
      ctx.fillStyle = linGrad([[0,'#000820'],[0.5,'#0a1040'],[1,'#1a2050']]);
      ctx.fillRect(0,0,1024,512);
      const auroraCols = [['rgba(100,255,180,0.4)','rgba(100,255,180,0)'],['rgba(140,180,255,0.35)','rgba(140,180,255,0)'],['rgba(180,100,255,0.3)','rgba(180,100,255,0)']];
      auroraCols.forEach((c, ci) => {
        const g = ctx.createLinearGradient(0, 100+ci*100, 0, 400+ci*50);
        g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0,512);
        for (let x = 0; x <= 1024; x += 10) ctx.lineTo(x, 200+ci*100+Math.sin(x*0.008+ci*2)*80);
        ctx.lineTo(1024,512); ctx.closePath(); ctx.fill();
      });
      for (let i = 0; i < 150; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3+rand()*0.7})`; ctx.fillRect(rand()*1024, rand()*300, 1.5, 1.5); }
      break;
    }
    case 'cyberpunk': {
      ctx.fillStyle = linGrad([[0,'#1a0030'],[0.4,'#200050'],[0.7,'#100040'],[1,'#000020']]);
      ctx.fillRect(0,0,1024,512);
      ctx.strokeStyle = 'rgba(255,50,180,0.4)'; ctx.lineWidth = 1.5;
      for (let i = -20; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(512+i*40, 280); ctx.lineTo(512+i*200, 512); ctx.stroke(); }
      for (let j = 0; j < 12; j++) { const y = 280+j*j*2; if (y > 512) break; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
      const neon = ctx.createLinearGradient(0, 250, 0, 512);
      neon.addColorStop(0,'rgba(0,255,220,0.3)'); neon.addColorStop(1,'rgba(255,0,180,0.4)');
      ctx.fillStyle = neon; ctx.fillRect(0,280,1024,232);
      ctx.fillStyle = '#000010';
      for (let i = 0; i < 30; i++) { const w = 30+rand()*80, x = rand()*1024, h = 100+rand()*150; ctx.fillRect(x, 280-h, w, h+30); }
      for (let i = 0; i < 200; i++) { ctx.fillStyle = rand() > 0.5 ? 'rgba(255,220,80,0.9)' : 'rgba(255,100,200,0.8)'; ctx.fillRect(rand()*1024, 130+rand()*140, 2, 3); }
      break;
    }
    case 'tropical': {
      ctx.fillStyle = linGrad([[0,'#40c0e0'],[0.5,'#80e0f0'],[0.85,'#ffd060'],[1,'#ffe080']]);
      ctx.fillRect(0,0,1024,512);
      const sunG = ctx.createRadialGradient(512,400,30,512,400,200);
      sunG.addColorStop(0,'rgba(255,240,180,0.95)'); sunG.addColorStop(0.4,'rgba(255,200,100,0.5)'); sunG.addColorStop(1,'rgba(255,200,100,0)');
      ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(512,400,200,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a3020'; ctx.fillRect(0,470,1024,42);
      for (let i = 0; i < 5; i++) {
        const x = 100+i*220;
        ctx.beginPath(); ctx.moveTo(x,512); ctx.lineTo(x+6,512); ctx.lineTo(x+4,400); ctx.lineTo(x+2,400); ctx.closePath(); ctx.fill();
        for (let a = 0; a < 8; a++) { const ang = -Math.PI/2+(a-3.5)*0.3; ctx.beginPath(); ctx.ellipse(x+3, 400, 40, 8, ang, 0, Math.PI*2); ctx.fill(); }
      }
      break;
    }
    case 'galaxy': {
      ctx.fillStyle = '#000010'; ctx.fillRect(0,0,1024,512);
      const cx = 512, cy = 256;
      for (let arm = 0; arm < 3; arm++) {
        const baseAng = arm*(Math.PI*2/3);
        for (let t = 0; t < 200; t++) {
          const r = t*2, ang = baseAng + r*0.015 + Math.sin(t*0.1)*0.2;
          const x = cx + Math.cos(ang)*r, y = cy + Math.sin(ang)*r*0.6;
          const size = Math.max(0.5, 4-t*0.02), alpha = 0.3+rand()*0.5, hue = 200+rand()*120;
          ctx.fillStyle = `hsla(${hue},80%,70%,${alpha})`; ctx.fillRect(x,y,size,size);
        }
      }
      const glow = ctx.createRadialGradient(cx,cy,10,cx,cy,150);
      glow.addColorStop(0,'rgba(255,220,255,0.6)'); glow.addColorStop(1,'rgba(80,40,160,0)');
      ctx.fillStyle = glow; ctx.fillRect(0,0,1024,512);
      for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(255,255,255,${rand()*0.9})`; ctx.fillRect(rand()*1024, rand()*512, 1.2, 1.2); }
      break;
    }
    case 'inferno': {
      ctx.fillStyle = '#000000'; ctx.fillRect(0,0,1024,512);
      const fireGrad = ctx.createLinearGradient(0, 512, 0, 0);
      fireGrad.addColorStop(0,'rgba(255,100,0,0.85)'); fireGrad.addColorStop(0.3,'rgba(200,40,0,0.6)');
      fireGrad.addColorStop(0.7,'rgba(100,0,0,0.3)'); fireGrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = fireGrad; ctx.fillRect(0,0,1024,512);
      for (let i = 0; i < 60; i++) {
        const x = rand()*1024, h = 40+rand()*150;
        const flame = ctx.createLinearGradient(x, 512, x, 512-h);
        flame.addColorStop(0,'rgba(255,180,60,0.9)'); flame.addColorStop(0.5,'rgba(255,60,0,0.6)'); flame.addColorStop(1,'rgba(80,0,0,0)');
        ctx.fillStyle = flame;
        ctx.beginPath(); ctx.moveTo(x-20, 512); ctx.quadraticCurveTo(x, 512-h*1.4, x+20, 512); ctx.closePath(); ctx.fill();
      }
      for (let i = 0; i < 200; i++) { ctx.fillStyle = `rgba(255,${100+rand()*100|0},0,${0.5+rand()*0.5})`; ctx.fillRect(rand()*1024, rand()*512, 2, 2); }
      break;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const themeTextures = {};
export function getThemeTexture(id) {
  if (!themeTextures[id]) themeTextures[id] = generateThemeTexture(id);
  return themeTextures[id];
}

const _lightingCurrent = {
  hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiIntensity: 0.15,
  sunColor: new THREE.Color(), sunIntensity: 0.55, sunPos: new THREE.Vector3(-50, 70, -40),
  ambientColor: new THREE.Color(), ambientGround: new THREE.Color(), ambientIntensity: 0.55,
  fogColor: new THREE.Color(), fogNear: 50, fogFar: 190,
  bodyTint: new THREE.Color()
};
const _lightingTarget = {
  hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiIntensity: 0.15,
  sunColor: new THREE.Color(), sunIntensity: 0.55, sunPos: new THREE.Vector3(-50, 70, -40),
  ambientColor: new THREE.Color(), ambientGround: new THREE.Color(), ambientIntensity: 0.55,
  fogColor: new THREE.Color(), fogNear: 50, fogFar: 190,
  bodyTint: new THREE.Color()
};
let _lightingInitialized = false;

function setLightingTarget(values) {
  _lightingTarget.hemiSky.setHex(values.hemiSky);
  _lightingTarget.hemiGround.setHex(values.hemiGround);
  _lightingTarget.hemiIntensity = values.hemiIntensity;
  _lightingTarget.sunColor.setHex(values.sunColor);
  _lightingTarget.sunIntensity = values.sunIntensity;
  _lightingTarget.sunPos.set(values.sunPos[0], values.sunPos[1], values.sunPos[2]);
  _lightingTarget.ambientColor.setHex(values.ambientColor);
  _lightingTarget.ambientGround.setHex(values.ambientGround);
  _lightingTarget.ambientIntensity = values.ambientIntensity;
  _lightingTarget.fogColor.setHex(values.fogColor);
  _lightingTarget.fogNear = values.fogNear;
  _lightingTarget.fogFar = values.fogFar;
  _lightingTarget.bodyTint.setHex(values.bodyTint);
  if (!_lightingInitialized) {
    _lightingCurrent.hemiSky.copy(_lightingTarget.hemiSky);
    _lightingCurrent.hemiGround.copy(_lightingTarget.hemiGround);
    _lightingCurrent.hemiIntensity = _lightingTarget.hemiIntensity;
    _lightingCurrent.sunColor.copy(_lightingTarget.sunColor);
    _lightingCurrent.sunIntensity = _lightingTarget.sunIntensity;
    _lightingCurrent.sunPos.copy(_lightingTarget.sunPos);
    _lightingCurrent.ambientColor.copy(_lightingTarget.ambientColor);
    _lightingCurrent.ambientGround.copy(_lightingTarget.ambientGround);
    _lightingCurrent.ambientIntensity = _lightingTarget.ambientIntensity;
    _lightingCurrent.fogColor.copy(_lightingTarget.fogColor);
    _lightingCurrent.fogNear = _lightingTarget.fogNear;
    _lightingCurrent.fogFar = _lightingTarget.fogFar;
    _lightingCurrent.bodyTint.copy(_lightingTarget.bodyTint);
    _lightingInitialized = true;
  }
}

export function updateLightingSmooth(dt) {
  const k = 1 - Math.exp(-2.5 * dt);
  _lightingCurrent.hemiSky.lerp(_lightingTarget.hemiSky, k);
  _lightingCurrent.hemiGround.lerp(_lightingTarget.hemiGround, k);
  _lightingCurrent.hemiIntensity += (_lightingTarget.hemiIntensity - _lightingCurrent.hemiIntensity) * k;
  _lightingCurrent.sunColor.lerp(_lightingTarget.sunColor, k);
  _lightingCurrent.sunIntensity += (_lightingTarget.sunIntensity - _lightingCurrent.sunIntensity) * k;
  _lightingCurrent.sunPos.lerp(_lightingTarget.sunPos, k);
  _lightingCurrent.ambientColor.lerp(_lightingTarget.ambientColor, k);
  _lightingCurrent.ambientGround.lerp(_lightingTarget.ambientGround, k);
  _lightingCurrent.ambientIntensity += (_lightingTarget.ambientIntensity - _lightingCurrent.ambientIntensity) * k;
  _lightingCurrent.fogColor.lerp(_lightingTarget.fogColor, k);
  _lightingCurrent.fogNear += (_lightingTarget.fogNear - _lightingCurrent.fogNear) * k;
  _lightingCurrent.fogFar += (_lightingTarget.fogFar - _lightingCurrent.fogFar) * k;
  _lightingCurrent.bodyTint.lerp(_lightingTarget.bodyTint, k);
  hemi.color.copy(_lightingCurrent.hemiSky);
  hemi.groundColor.copy(_lightingCurrent.hemiGround);
  hemi.intensity = _lightingCurrent.hemiIntensity;
  sun.color.copy(_lightingCurrent.sunColor);
  sun.intensity = _lightingCurrent.sunIntensity;
  sun.position.copy(_lightingCurrent.sunPos);
  nightAmbient.color.copy(_lightingCurrent.ambientColor);
  nightAmbient.groundColor.copy(_lightingCurrent.ambientGround);
  nightAmbient.intensity = _lightingCurrent.ambientIntensity;
  scene.fog.color.copy(_lightingCurrent.fogColor);
  scene.fog.near = _lightingCurrent.fogNear;
  scene.fog.far = _lightingCurrent.fogFar;
  MAT.body.color.copy(_lightingCurrent.bodyTint);
}

function defaultDayLighting() {
  return { hemiSky: 0xe8f2ff, hemiGround: 0x88a060, hemiIntensity: 1.15, sunColor: 0xfff8e8, sunIntensity: 1.8, sunPos: [20, 28, 15], ambientColor: 0x000000, ambientGround: 0x000000, ambientIntensity: 0, fogColor: 0xdfe8f0, fogNear: 80, fogFar: 220, bodyTint: 0xffffff };
}
function defaultNightLighting() {
  return { hemiSky: 0x6080b8, hemiGround: 0x2a3448, hemiIntensity: 0.55, sunColor: 0xb8ccf0, sunIntensity: 0.85, sunPos: [-50, 70, -40], ambientColor: 0x5878b8, ambientGround: 0x28344c, ambientIntensity: 0.95, fogColor: 0x223356, fogNear: 60, fogFar: 200, bodyTint: 0xa8b0d4 };
}

let customBgMesh = null;
export function applyTheme(themeId, nightMode) {
  if (customBgMesh) {
    scene.remove(customBgMesh);
    customBgMesh.geometry.dispose();
    if (customBgMesh.material.map) customBgMesh.material.map.dispose();
    customBgMesh.material.dispose();
    customBgMesh = null;
  }
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  if (theme.id === 'default') {
    daySky.visible = !nightMode;
    nightSky.visible = nightMode;
    stars.visible = nightMode;
    moon.visible = nightMode;
    setLightingTarget(nightMode ? defaultNightLighting() : defaultDayLighting());
    for (const l of lamps) {
      l.userData.light.intensity = nightMode ? 18 : 0;
      l.userData.bulb.material.color.setHex(nightMode ? 0xfff0c0 : 0xffd680);
    }
    return;
  }
  const tex = getThemeTexture(theme.id);
  const geo = new THREE.SphereGeometry(235, 32, 20);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  customBgMesh = new THREE.Mesh(geo, mat);
  customBgMesh.renderOrder = -1000;
  scene.add(customBgMesh);
  daySky.visible = false;
  nightSky.visible = false;
  stars.visible = false;
  moon.visible = false;
  if (theme.lighting) {
    setLightingTarget(theme.lighting);
    for (const l of lamps) l.userData.light.intensity = theme.lighting.hemiIntensity < 0.5 ? 15 : 0;
  }
}

/* ============================================================
   WORLD UPDATE
   ============================================================ */
export function updateWorld(dt, time, nightMode) {
  animateFountain(time);
  waterLight.intensity = (nightMode ? 1.0 : 1.5) + Math.sin(time * 3.1) * 0.3;
  for (const c of clouds) {
    c.position.x += c.userData.driftSpeed * dt;
    if (c.position.x > 46) c.position.x = -46;
    c.position.y = c.userData.baseY + Math.sin(time * 0.6 + c.userData.bobPhase) * 0.9;
  }
  for (const l of lamps) {
    if (l.userData.light.intensity > 0.5) {
      l.userData.light.intensity = 18 * (1 + Math.sin(time * 8 + l.position.x * 0.7) * 0.06);
    }
  }

  // Świetliki (tylko noc)
  const showFF = nightMode;
  for (const f of fireflies) {
    if (f.visible !== showFF) f.visible = showFF;
    if (!showFF) continue;
    const u = f.userData;
    const t = time * u.speed + u.phase;
    f.position.x = u.centerX + Math.cos(t) * u.radius;
    f.position.z = u.centerZ + Math.sin(t * 1.15) * u.radius;
    f.position.y = u.baseY + Math.sin(time * u.bobSpeed + u.phase) * u.bobAmp;
    const pulse = 0.35 + Math.sin(time * u.pulseSpeed + u.pulsePhase) * 0.55;
    f.material.opacity = Math.max(0.08, pulse);
  }

  // Motyle (tylko dzień)
  const showBF = !nightMode;
  for (const b of butterflies) {
    if (b.visible !== showBF) b.visible = showBF;
    if (!showBF) continue;
    const u = b.userData;
    const t = time * u.speed + u.phase;
    b.position.x = u.centerX + Math.cos(t) * u.radius;
    b.position.z = u.centerZ + Math.sin(t * 1.3) * u.radius;
    b.position.y = u.baseY + Math.sin(time * u.bobSpeed + u.phase * 2) * u.bobAmp;
    b.rotation.y = -t + Math.PI / 2;
    const flap = Math.sin(time * u.flapSpeed + u.flapPhase) * 0.95;
    u.lw.rotation.y = flap;
    u.rw.rotation.y = -flap;
    b.rotation.z = Math.sin(time * 3 + u.phase) * 0.14;
  }
}

/* ============================================================
   RESIZE
   ============================================================ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 120);
});