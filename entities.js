import * as THREE from 'three';
import {
  rand, randRange, IS_MOBILE,
  MAX_POLLO_PER_COLOR, MAX_CROC_PER_COLOR, MAX_EYES, MAX_POLLOS,
  COLOR_ORDER, PATH_POLLO_POINTS, PATH_CROC_POINTS,
  CHICKEN_PALETTES, CROC_PALETTES, pathToVectors
} from './config.js';
import { scene, MAT, colorize, mergeGeos } from './engine.js';

const PATH_POLLO = pathToVectors(PATH_POLLO_POINTS);
const PATH_CROC = pathToVectors(PATH_CROC_POINTS);

/* ============================================================
   POLLO GEOMETRY
   ============================================================ */
function createPolloGeometry(pal) {
  const parts = [];
  const S = 1.05;
  parts.push(colorize(new THREE.BoxGeometry(0.07, 0.24, 0.07).translate(-0.12, 0.12, 0.02), pal.leg, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.07, 0.24, 0.07).translate(0.12, 0.12, 0.02), pal.leg, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.14, 0.05, 0.2).translate(-0.12, 0.025, 0.06), pal.leg, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.14, 0.05, 0.2).translate(0.12, 0.025, 0.06), pal.leg, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.44, 0.42, 0.62).translate(0, 0.45, 0), pal.body, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.36, 0.16, 0.5).translate(0, 0.31, 0.02), pal.wing, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.08, 0.26, 0.38).translate(-0.25, 0.47, -0.02), pal.wing, 0.07));
  parts.push(colorize(new THREE.BoxGeometry(0.08, 0.26, 0.38).translate(0.25, 0.47, -0.02), pal.wing, 0.07));
  parts.push(colorize(new THREE.BoxGeometry(0.29, 0.29, 0.29).translate(0, 0.78, 0.21), pal.body, 0.06));
  const beak = new THREE.ConeGeometry(0.075, 0.17, 4);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.755, 0.42);
  parts.push(colorize(beak, pal.beak, 0.05));
  const wattle = new THREE.ConeGeometry(0.05, 0.13, 4);
  wattle.rotateX(Math.PI);
  wattle.translate(0, 0.655, 0.37);
  parts.push(colorize(wattle, pal.comb, 0.05));
  const combHeights = [0.11, 0.15, 0.10];
  const combZ = [0.10, 0.21, 0.32];
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.ConeGeometry(0.05, combHeights[i], 4);
    cone.translate(0, 0.925 + combHeights[i] * 0.5 - 0.05, combZ[i]);
    parts.push(colorize(cone, pal.comb, 0.05));
  }
  parts.push(colorize(new THREE.BoxGeometry(0.05, 0.07, 0.05).translate(-0.145, 0.83, 0.32), 0x1b1b1b, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.05, 0.07, 0.05).translate(0.145, 0.83, 0.32), 0x1b1b1b, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.025, 0.025, 0.02).translate(-0.155, 0.85, 0.345), 0xffffff, 0.01));
  parts.push(colorize(new THREE.BoxGeometry(0.025, 0.025, 0.02).translate(0.135, 0.85, 0.345), 0xffffff, 0.01));
  const tail = new THREE.ConeGeometry(0.17, 0.36, 4);
  tail.rotateX(-0.95);
  tail.translate(0, 0.62, -0.38);
  parts.push(colorize(tail, pal.tail, 0.07));
  const merged = mergeGeos(parts);
  merged.scale(S, S, S);
  return merged;
}
const polloGeo = {};
for (const k of Object.keys(CHICKEN_PALETTES)) polloGeo[k] = createPolloGeometry(CHICKEN_PALETTES[k]);

/* ============================================================
   CROC GEOMETRY
   ============================================================ */
function createCrocGeometry(pal) {
  const parts = [];
  const S = 0.9;
  parts.push(colorize(new THREE.BoxGeometry(0.64, 0.4, 1.15).translate(0, 0.38, -0.1), pal.body, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.58, 0.16, 1.05).translate(0, 0.2, -0.1), pal.belly, 0.05));
  parts.push(colorize(new THREE.BoxGeometry(0.52, 0.32, 0.44).translate(0, 0.42, 0.7), pal.body, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.36, 0.16, 0.58).translate(0, 0.45, 1.15), pal.body, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.34, 0.12, 0.55).translate(0, 0.29, 1.13), pal.dark, 0.06));
  const toothZ = [0.95, 1.12, 1.28, 1.4];
  for (let i = 0; i < toothZ.length; i++) {
    for (const side of [-1, 1]) {
      const t = new THREE.ConeGeometry(0.035, 0.1, 4);
      t.rotateX(Math.PI); t.translate(side * 0.17, 0.345, toothZ[i]);
      parts.push(colorize(t, pal.tooth, 0.02));
    }
  }
  parts.push(colorize(new THREE.BoxGeometry(0.13, 0.12, 0.1).translate(-0.17, 0.6, 0.72), pal.eye, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.13, 0.12, 0.1).translate(0.17, 0.6, 0.72), pal.eye, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.06, 0.08, 0.04).translate(-0.17, 0.6, 0.78), pal.pupil, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.06, 0.08, 0.04).translate(0.17, 0.6, 0.78), pal.pupil, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.05, 0.04, 0.05).translate(-0.09, 0.54, 1.42), pal.dark, 0.02));
  parts.push(colorize(new THREE.BoxGeometry(0.05, 0.04, 0.05).translate(0.09, 0.54, 1.42), pal.dark, 0.02));
  const legPositions = [[-0.31, 0.36], [0.31, 0.36], [-0.31, -0.52], [0.31, -0.52]];
  for (const [lx, lz] of legPositions) {
    parts.push(colorize(new THREE.BoxGeometry(0.17, 0.26, 0.2).translate(lx, 0.13, lz), pal.dark, 0.06));
    parts.push(colorize(new THREE.BoxGeometry(0.19, 0.07, 0.26).translate(lx, 0.035, lz + 0.03), pal.dark, 0.05));
  }
  parts.push(colorize(new THREE.BoxGeometry(0.5, 0.32, 0.5).translate(0, 0.36, -0.98), pal.body, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.36, 0.24, 0.5).translate(0, 0.33, -1.38), pal.body, 0.06));
  parts.push(colorize(new THREE.BoxGeometry(0.22, 0.16, 0.44).translate(0, 0.31, -1.74), pal.dark, 0.06));
  const spikeZ = [0.45, 0.1, -0.28, -0.65, -1.0, -1.35, -1.66];
  for (let i = 0; i < spikeZ.length; i++) {
    const sz = spikeZ[i];
    const h = 0.2 - Math.abs(sz) * 0.035;
    const sp = new THREE.ConeGeometry(0.08, Math.max(0.09, h), 4);
    sp.translate(0, 0.6 - Math.abs(sz) * 0.02, sz);
    parts.push(colorize(sp, pal.spike, 0.07));
  }
  const merged = mergeGeos(parts);
  merged.scale(S, S, S);
  return merged;
}
const crocGeo = {};
for (const k of Object.keys(CROC_PALETTES)) crocGeo[k] = createCrocGeometry(CROC_PALETTES[k]);

/* ============================================================
   EGG GEOMETRY
   ============================================================ */
export const eggGeo = (() => {
  const g = new THREE.IcosahedronGeometry(0.22, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 + y * 0.35;
    p.setXYZ(i, p.getX(i) * k, y * 1.25, p.getZ(i) * k);
  }
  const merged = colorize(g, 0xffd24a, 0.05);
  merged.computeVertexNormals();
  return merged;
})();

/* ============================================================
   INSTANCED MESHES
   ============================================================ */
const polloInstances = {};
for (const k of Object.keys(polloGeo)) {
  const inst = new THREE.InstancedMesh(polloGeo[k], MAT.pollo, MAX_POLLO_PER_COLOR);
  inst.count = 0; inst.frustumCulled = false; inst.castShadow = false;
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(inst);
  polloInstances[k] = inst;
}
const crocInstances = {};
for (const k of Object.keys(crocGeo)) {
  const inst = new THREE.InstancedMesh(crocGeo[k], MAT.croc, MAX_CROC_PER_COLOR);
  inst.count = 0; inst.frustumCulled = false; inst.castShadow = false;
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(inst);
  crocInstances[k] = inst;
}
const eyeGeo = new THREE.IcosahedronGeometry(0.13, 0);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
const eyeInstances = new THREE.InstancedMesh(eyeGeo, eyeMat, MAX_EYES);
eyeInstances.count = 0; eyeInstances.frustumCulled = false; eyeInstances.visible = false;
eyeInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(eyeInstances);

const EYE_LOCAL_L = new THREE.Matrix4().makeTranslation(-0.145 * 1.05, 0.83 * 1.05, 0.345 * 1.05 + 0.01);
const EYE_LOCAL_R = new THREE.Matrix4().makeTranslation(0.145 * 1.05, 0.83 * 1.05, 0.345 * 1.05 + 0.01);
const _tmpEyeM = new THREE.Matrix4();
const _tmpInstMatrix = new THREE.Matrix4();

/* ============================================================
   ENTITY LISTS
   ============================================================ */
export const pollos = [];
export const crocs = [];
export const floatingEggs = [];

/* ============================================================
   SPAWNING
   ============================================================ */
function spawnPolloEntity(color, isLeader) {
  const scale = isLeader ? 1.55 : 1.05;
  const start = PATH_POLLO[0].clone();
  start.x += randRange(-0.35, 0.35);
  start.z += randRange(-0.35, 0.35);
  const obj = new THREE.Object3D();
  obj.position.copy(start);
  obj.rotation.y = Math.PI / 2;
  obj.scale.setScalar(scale);
  const p = {
    mesh: obj, color, isLeader, baseScale: scale,
    seg: 1, speed: 4.8, state: 'walk', phase: rand() * Math.PI * 2, t: 0
  };
  pollos.push(p);
  return p;
}

function spawnCrocEntity(color) {
  const obj = new THREE.Object3D();
  obj.position.set(0, 0.5, 0);
  obj.rotation.y = Math.PI / 2;
  obj.scale.setScalar(0.01);
  const c = {
    mesh: obj, color,
    seg: 0, speed: 3.8, state: 'emerge', t: 0, phase: rand() * Math.PI * 2,
    fallV: 0, awarded: false
  };
  crocs.push(c);
  return c;
}

/* ============================================================
   PUBLIC API
   ============================================================ */
export function spawnPollo(state, shopState) {
  const extraPerClick = shopState.morePollo || 0;
  const count = 1 + extraPerClick;
  for (let i = 0; i < count; i++) {
    if (pollos.length >= MAX_POLLOS) break;
    const color = COLOR_ORDER[state.colorIndex % COLOR_ORDER.length];
    state.colorIndex++;
    state.clickCount++;
    const isLeader = (state.clickCount % 10 === 0);
    const p = spawnPolloEntity(color, isLeader);
    const speedMult = 1 + (shopState.polloSpeed || 0) * 0.12;
    p.speed = 4.8 * speedMult * randRange(0.97, 1.03);
    state.stats.pollosSpawned++;
  }
}

export function updatePollos(dt, shopState, Sound, onCrocSpawned) {
  const crocsToSpawn = [];
  for (let i = pollos.length - 1; i >= 0; i--) {
    const p = pollos[i];
    const m = p.mesh;
    if (p.state === 'walk') {
      const target = PATH_POLLO[p.seg];
      if (!target) { p.state = 'absorb'; p.t = 0; continue; }
      const dx = target.x - m.position.x, dz = target.z - m.position.z;
      const dist = Math.hypot(dx, dz);
      const step = p.speed * dt;
      if (dist <= step || dist < 0.001) {
        m.position.x = target.x; m.position.z = target.z;
        p.seg++;
        if (p.seg >= PATH_POLLO.length) { p.state = 'absorb'; p.t = 0; }
      } else {
        m.position.x += (dx / dist) * step;
        m.position.z += (dz / dist) * step;
        m.rotation.y = Math.atan2(dx, dz);
      }
      p.phase += dt * 13;
      m.position.y = Math.abs(Math.sin(p.phase)) * 0.055 * p.baseScale;
      m.rotation.z = Math.sin(p.phase) * 0.06;
    } else if (p.state === 'absorb') {
      p.t += dt;
      const k = Math.min(1, p.t / 0.55);
      const ang = Math.PI + k * Math.PI * 3;
      const rad = 0.55 * (1 - k) + 0.05;
      m.position.set(Math.cos(ang) * rad, 0.9 + k * 0.4, Math.sin(ang) * rad);
      m.rotation.y += dt * 18;
      m.rotation.x = k * Math.PI * 0.7;
      m.scale.setScalar(p.baseScale * (1 - k * k));
      if (k >= 1) {
        pollos.splice(i, 1);
        Sound.splash();
        crocsToSpawn.push(p.color);
      }
    }
  }
  for (const color of crocsToSpawn) {
    spawnCrocEntity(color);
    Sound.crocEmerge();
    if (onCrocSpawned) onCrocSpawned();
  }
}

export function updateCrocs(dt, shopState, Sound, onCrocFall) {
  for (let i = crocs.length - 1; i >= 0; i--) {
    const c = crocs[i];
    const m = c.mesh;
    if (c.state === 'emerge') {
      c.t += dt;
      const k = Math.min(1, c.t / 0.5);
      const e = 1 - Math.pow(1 - k, 3);
      m.scale.setScalar(Math.max(0.01, e * 0.9));
      m.position.y = 0.5 + Math.sin(k * Math.PI) * 0.4 + k * 0.1;
      m.position.x = k * 1.5;
      m.rotation.y = Math.PI / 2;
      if (k >= 1) {
        m.scale.setScalar(1);
        m.position.set(2.4, 0, 0);
        c.state = 'walk'; c.seg = 1;
        const speedMult = 1 + (shopState.crocSpeed || 0) * 0.12;
        c.speed = 3.8 * speedMult * randRange(0.95, 1.05);
      }
    } else if (c.state === 'walk') {
      const target = PATH_CROC[c.seg] || PATH_CROC[PATH_CROC.length - 1];
      const dx = target.x - m.position.x, dz = target.z - m.position.z;
      const dist = Math.hypot(dx, dz);
      const step = c.speed * dt;
      if (dist <= step || dist < 0.001) {
        m.position.x = target.x; m.position.z = target.z;
        c.seg++;
        if (c.seg >= PATH_CROC.length) { c.state = 'fall'; c.fallV = 0.5; Sound.whistle(); }
      } else {
        m.position.x += (dx / dist) * step;
        m.position.z += (dz / dist) * step;
        m.rotation.y = Math.atan2(dx, dz);
      }
      c.phase += dt * 9;
      m.position.y = Math.abs(Math.sin(c.phase)) * 0.05;
      m.rotation.z = Math.sin(c.phase) * 0.04;
    } else if (c.state === 'fall') {
      c.fallV += 22 * dt;
      m.position.x += c.speed * 0.8 * dt;
      m.position.y -= c.fallV * dt;
      m.rotation.z -= dt * 3.2;
      m.rotation.x += dt * 0.9;
      if (!c.awarded && m.position.y < -1.0) {
        c.awarded = true;
        Sound.thud();
        if (onCrocFall) onCrocFall(c);
      }
      if (m.position.y < -14) { crocs.splice(i, 1); }
    }
  }
}

export function updateFloatingEggs(dt) {
  for (let i = floatingEggs.length - 1; i >= 0; i--) {
    const e = floatingEggs[i];
    e.life -= dt;
    e.mesh.position.y += e.vy * dt;
    e.mesh.rotation.y += dt * 4.0;
    e.mesh.rotation.x += dt * 1.6;
    e.mesh.scale.setScalar(Math.max(0.01, Math.min(1, e.life / 2.2)));
    if (e.life <= 0) { scene.remove(e.mesh); floatingEggs.splice(i, 1); }
  }
}

export function spawnFloatingEggsAt(x, y, z, count) {
  for (let i = 0; i < count; i++) {
    const em = new THREE.Mesh(eggGeo, MAT.body);
    em.position.set(x + (i - 1) * 0.4, y + i * 0.15, z);
    em.castShadow = true;
    scene.add(em);
    floatingEggs.push({ mesh: em, life: 2.2 + i * 0.15, vy: 1.6 });
  }
}

/* ============================================================
   INSTANCE SYNC
   ============================================================ */
let _syncSkipCounter = 0;
export function syncInstances(nightMode) {
  const total = pollos.length + crocs.length;
  if (total > 200) {
    _syncSkipCounter = (_syncSkipCounter + 1) % 2;
    if (_syncSkipCounter === 1) return;
  }
  const skipEyes = pollos.length > (IS_MOBILE ? 80 : 150);

  const pCounts = { white: 0, red: 0, blue: 0, yellow: 0, green: 0, pink: 0 };
  for (let i = 0; i < pollos.length; i++) {
    const p = pollos[i];
    const inst = polloInstances[p.color];
    if (!inst) continue;
    const idx = pCounts[p.color];
    if (idx >= MAX_POLLO_PER_COLOR) continue;
    p.mesh.updateMatrix();
    _tmpInstMatrix.copy(p.mesh.matrix);
    inst.setMatrixAt(idx, _tmpInstMatrix);
    pCounts[p.color] = idx + 1;
  }
  for (const k in polloInstances) {
    const cnt = pCounts[k];
    polloInstances[k].count = cnt;
    if (cnt > 0) polloInstances[k].instanceMatrix.needsUpdate = true;
  }

  const cCounts = { white: 0, red: 0, blue: 0, yellow: 0, green: 0, pink: 0 };
  for (let i = 0; i < crocs.length; i++) {
    const c = crocs[i];
    const inst = crocInstances[c.color];
    if (!inst) continue;
    const idx = cCounts[c.color];
    if (idx >= MAX_CROC_PER_COLOR) continue;
    c.mesh.updateMatrix();
    _tmpInstMatrix.copy(c.mesh.matrix);
    inst.setMatrixAt(idx, _tmpInstMatrix);
    cCounts[c.color] = idx + 1;
  }
  for (const k in crocInstances) {
    const cnt = cCounts[k];
    crocInstances[k].count = cnt;
    if (cnt > 0) crocInstances[k].instanceMatrix.needsUpdate = true;
  }

  let eyeCount = 0;
  if (nightMode && !skipEyes) {
    for (const p of pollos) {
      if (eyeCount + 2 > MAX_EYES) break;
      p.mesh.updateMatrix();
      _tmpEyeM.multiplyMatrices(p.mesh.matrix, EYE_LOCAL_L);
      eyeInstances.setMatrixAt(eyeCount++, _tmpEyeM);
      _tmpEyeM.multiplyMatrices(p.mesh.matrix, EYE_LOCAL_R);
      eyeInstances.setMatrixAt(eyeCount++, _tmpEyeM);
    }
  }
  eyeInstances.count = eyeCount;
  if (eyeCount > 0) eyeInstances.instanceMatrix.needsUpdate = true;
  eyeInstances.visible = nightMode && eyeCount > 0 && !skipEyes;
}