// Motor gráfico 3D con Three.js: isla, agua, cielo, pollitos, objetos, partículas, cámaras y etiquetas
import * as THREE from 'three';
import { NX, NY, NZ, VOX, WORLD_X, WORLD_Z, CHICKEN_H, weaponById } from './constants.js';
import { TerrainMesh } from './mesher.js';
import { makeChicken, makeObject, PROJ_MODEL } from './models.js';

const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function skyTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(0.62, bottom); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function crosshairTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.lineWidth = 7; g.strokeStyle = '#2b1a10';
  g.beginPath(); g.arc(32, 32, 20, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.strokeStyle = '#ffffff';
  g.beginPath(); g.arc(32, 32, 20, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(32, 32, 6, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- partículas ----------------
class Particles {
  constructor(scene, max, lit) {
    this.max = max;
    this.list = [];
    const mat = lit ? new THREE.MeshLambertMaterial({ vertexColors: false }) : new THREE.MeshBasicMaterial({ toneMapped: false });
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.62, 0), mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.color = new THREE.Color();
    this.mesh.setColorAt(0, this.color);
    scene.add(this.mesh);
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.s = new THREE.Vector3();
    this.p = new THREE.Vector3();
  }
  add(p) {
    if (this.list.length >= this.max) this.list.shift();
    p.life = p.max = p.life || 1;
    p.rx = Math.random() * 6; p.ry = Math.random() * 6;
    p.spin = p.spin ?? (Math.random() - 0.5) * 10;
    this.list.push(p);
  }
  update(dt) {
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy -= (p.grav ?? 9) * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; p.vz *= 1 - p.drag * dt; }
      if (p.sway) { p.vx += Math.sin(p.life * 6 + p.rx) * p.sway * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt;
    }
    for (const p of this.list) {
      const k = p.life / p.max;
      const sz = p.size * (p.shrink ? Math.max(0.05, k) : p.grow ? 1 + (1 - k) * p.grow : 1);
      this.e.set(p.rx, p.ry, 0);
      this.q.setFromEuler(this.e);
      this.s.set(sz, p.flat ? sz * 0.2 : sz, sz);
      this.p.set(p.x, p.y, p.z);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(n, this.m);
      this.color.set(p.color);
      this.mesh.setColorAt(n, this.color);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------------- retratos de pollito (para el lobby) ----------------
let portraitR = null;
const portraitCache = new Map();
export function chickenPortrait(color, acc, robot = false, size = 160) {
  const key = `${color}|${acc}|${robot}|${size}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  try {
    if (!portraitR) {
      const canvas = document.createElement('canvas');
      portraitR = { r: new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true }), scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, 0.1, 50) };
      portraitR.r.setClearColor(0x000000, 0);
      portraitR.scene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.6));
      const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 3, 4); portraitR.scene.add(d);
    }
    const { r, scene, cam } = portraitR;
    r.setSize(size, size, false);
    const mesh = makeChicken(color, acc, robot);
    mesh.rotation.y = 0.5;
    scene.add(mesh);
    cam.position.set(0, 0.95, 3.7);
    cam.lookAt(0, 0.8, 0);
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/png');
    scene.remove(mesh);
    portraitCache.set(key, url);
    return url;
  } catch (e) {
    return '';
  }
}

export class Renderer {
  constructor(container, opts = {}) {
    this.container = container;
    this.quality = opts.quality || 'normal';
    this.phone = !!opts.phone;
    const canvas = document.createElement('canvas');
    canvas.className = 'gl';
    container.appendChild(canvas);
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'alta', powerPreference: 'high-performance' });
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.shadows = this.quality === 'alta' || (this.quality === 'normal' && !this.phone);
    if (this.shadows) { this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.overlay = document.createElement('div');
    this.overlay.className = 'ov3d';
    container.appendChild(this.overlay);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 400);
    this.cam.position.set(WORLD_X / 2, 40, WORLD_Z + 30);
    this.camLook = new THREE.Vector3(WORLD_X / 2, 4, WORLD_Z / 2);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.35);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
    this.sun.position.set(WORLD_X / 2 + 35, 70, WORLD_Z / 2 + 25);
    this.sun.target.position.set(WORLD_X / 2, 0, WORLD_Z / 2);
    this.scene.add(this.sun, this.sun.target);
    if (this.shadows) {
      this.sun.castShadow = true;
      const sc = this.sun.shadow.camera;
      sc.left = -52; sc.right = 52; sc.top = 52; sc.bottom = -52; sc.near = 10; sc.far = 180;
      this.sun.shadow.mapSize.set(this.quality === 'alta' ? 4096 : 2048, this.quality === 'alta' ? 4096 : 2048);
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.04;
    }
    this.parts = new Particles(this.scene, this.quality === 'ahorro' ? 260 : 600, true);
    this.glow = new THREE.Group(); // bolas de fuego
    this.scene.add(this.glow);
    this.xhair = new THREE.Sprite(new THREE.SpriteMaterial({ map: crosshairTexture(), depthTest: false, transparent: true }));
    this.xhair.scale.set(0.9, 0.9, 1);
    this.xhair.renderOrder = 10;
    this.xhair.visible = false;
    this.scene.add(this.xhair);
    this.dots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false });
    for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), dotMat); d.visible = false; d.renderOrder = 9; this.scene.add(d); this.dots.push(d); }
    this.cursor = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    ring.rotation.x = Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 30, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.35 }));
    beam.position.y = 15;
    this.cursor.add(ring, beam);
    this.cursor.visible = false;
    this.scene.add(this.cursor);
    this.ropeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6), new THREE.MeshLambertMaterial({ color: 0xff8fb1 }));
    this.ropeMesh.visible = false;
    this.scene.add(this.ropeMesh);
    this.shadowGeo = new THREE.CircleGeometry(0.45, 14);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
    this.chickens = new Map();
    this.objs = new Map();
    this.labels = new Map();
    this.floats = [];
    this.bubbles = [];
    this.tracers = [];
    this.time = 0;
    this.world = null;
    this.camMode = 'orbit';
    this.orbitA = 0;
    this.camYaw = 0;
    this.resize = this.resize.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(container);
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    const dprMax = this.quality === 'alta' ? 2 : this.quality === 'normal' ? (this.phone ? 1.25 : 1.5) : 0.75;
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax));
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 1.2 ? 68 : 55;
    this.cam.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // ---------------- mundo ----------------
  // teams: [{ color, dark, acc, robot }]; chickens: [{ id, team, name }]
  setWorld(terrain, teams, chickens) {
    this.clearWorld();
    this.terrain = terrain;
    const th = terrain.theme;
    this.theme = th;
    this.scene.background = skyTexture(th.sky[0], th.sky[1]);
    this.scene.fog = new THREE.Fog(th.fog, 70, 190);
    this.hemi.color.set(th.sky[1]);
    this.tmesh = new TerrainMesh(terrain, this.scene, { shadows: this.shadows });
    // agua con olas
    const wg = new THREE.PlaneGeometry(320, 320, 56, 56);
    wg.rotateX(-Math.PI / 2);
    this.waterGeo = wg;
    this.waterBase = Float32Array.from(wg.attributes.position.array);
    this.water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: th.water, transparent: true, opacity: 0.82, shininess: 90, specular: 0x666666 }));
    this.water.receiveShadow = this.shadows;
    this.water.position.set(WORLD_X / 2, th.waterVox * VOX, WORLD_Z / 2);
    this.scene.add(this.water);
    this.seabed = new THREE.Mesh(new THREE.PlaneGeometry(320, 320).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(th.water).multiplyScalar(0.45) }));
    this.seabed.position.set(WORLD_X / 2, 0.02, WORLD_Z / 2);
    this.scene.add(this.seabed);
    // montañas lejanas entre la neblina
    this.far = new THREE.Group();
    const fm = new THREE.MeshLambertMaterial({ color: new THREE.Color(th.fog).lerp(new THREE.Color(th.palette[1]), 0.35) });
    const fg = new THREE.SphereGeometry(1, 20, 12);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const m = new THREE.Mesh(fg, fm);
      const rr = 135 + Math.random() * 25;
      m.position.set(WORLD_X / 2 + Math.cos(a) * rr, -4, WORLD_Z / 2 + Math.sin(a) * rr);
      m.scale.set(18 + Math.random() * 20, 12 + Math.random() * 18, 14 + Math.random() * 10);
      this.far.add(m);
    }
    this.scene.add(this.far);
    // nubes redondas
    this.clouds = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xb8c4d0 });
    const cg = new THREE.SphereGeometry(1, 16, 10);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const b = new THREE.Mesh(cg, cm);
        b.scale.set(2.2 + Math.random() * 1.6, 1.3 + Math.random() * 0.8, 1.8 + Math.random() * 1.2);
        b.position.set(j * 2.2 - n, Math.random() * 0.8, Math.random() * 1.6 - 0.8);
        c.add(b);
      }
      c.position.set(Math.random() * 180 - 54, 30 + Math.random() * 12, Math.random() * 180 - 54);
      c.userData.v = 0.6 + Math.random() * 0.8;
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);
    // pollitos
    this.teamsMeta = teams;
    for (const c of chickens) {
      const t = teams[c.team];
      const obj = makeChicken(t.color, t.acc, t.robot);
      this.scene.add(obj);
      const sh = new THREE.Mesh(this.shadowGeo, this.shadowMat);
      sh.rotation.x = -Math.PI / 2;
      this.scene.add(sh);
      const umb = makeObject('sombrilla', 0.75);
      umb.position.y = 2.0; umb.visible = false;
      obj.add(umb);
      const lbl = document.createElement('div');
      lbl.className = 'lbl';
      lbl.style.setProperty('--tc', t.color);
      lbl.innerHTML = `<span class="ln"></span><span class="lh"></span>`;
      this.overlay.appendChild(lbl);
      this.chickens.set(c.id, { obj, sh, umb, lbl, name: c.name, team: c.team, hp: -1, shown: false });
      lbl.querySelector('.ln').textContent = c.name;
    }
    this.marker = document.createElement('div');
    this.marker.className = 'marker';
    this.marker.textContent = '▼';
    this.overlay.appendChild(this.marker);
    this.world = { cx: WORLD_X / 2, cz: WORLD_Z / 2 };
  }

  clearWorld() {
    if (!this.world) return;
    this.tmesh.dispose();
    this.scene.remove(this.water); this.water.geometry.dispose();
    this.scene.remove(this.seabed);
    this.scene.remove(this.clouds);
    this.scene.remove(this.far);
    for (const c of this.chickens.values()) { this.scene.remove(c.obj); this.scene.remove(c.sh); c.lbl.remove(); }
    for (const o of this.objs.values()) this.scene.remove(o.mesh);
    this.chickens.clear(); this.objs.clear();
    this.overlay.innerHTML = '';
    this.floats = []; this.bubbles = [];
    this.parts.list = [];
    this.world = null;
  }

  groundBelow(x, y, z) {
    const t = this.terrain;
    const i = Math.floor(x / VOX), k = Math.floor(z / VOX);
    if (i < 0 || k < 0 || i >= NX || k >= NZ) return -100;
    for (let j = Math.min(NY - 1, Math.floor((y + 0.1) / VOX)); j >= 0; j--) if (t.get(i, j, k)) return (j + 1) * VOX;
    return -100;
  }

  // comprueba si un rayo entre 'a' (pollito) y 'b' (cámara) choca con el terreno
  rayBlocked(a, b) {
    const t = this.terrain;
    if (!t) return false;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.8) return false;
    const steps = Math.ceil(dist / 0.35);
    const s0 = Math.max(1, Math.ceil((0.65 / dist) * steps));
    for (let s = s0; s <= steps; s++) {
      const u = s / steps;
      if (t.solid(a.x + dx * u, a.y + dy * u, a.z + dz * u)) return true;
    }
    return false;
  }

  project(x, y, z) {
    tmpV.set(x, y, z).project(this.cam);
    if (tmpV.z > 1) return null;
    return { x: (tmpV.x * 0.5 + 0.5) * this.w, y: (-tmpV.y * 0.5 + 0.5) * this.h };
  }

  // ---------------- efectos de una vez ----------------
  fx(e) {
    if (!this.world) return;
    const P = this.parts;
    const pal = this.theme.palette;
    switch (e.k) {
      case 'boom': {
        const n = Math.min(70, 18 + e.r * 14) * (this.quality === 'ahorro' ? 0.5 : 1);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6 * (e.r / 2);
          P.add({ x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * s, vy: 4 + Math.random() * 7, vz: Math.sin(a) * s, size: 0.18 + Math.random() * 0.22, color: Math.random() < 0.5 ? pal[1] : pal[2], life: 1 + Math.random() * 0.8, grav: 16 });
        }
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * Math.PI * 2, s = Math.random() * 2;
          P.add({ x: e.x + Math.cos(a) * e.r * 0.4, y: e.y + Math.random(), z: e.z + Math.sin(a) * e.r * 0.4, vx: Math.cos(a) * s, vy: 1.5 + Math.random() * 1.5, vz: Math.sin(a) * s, size: 0.4 + Math.random() * 0.5 * e.r * 0.5, color: ['#d8d2c8', '#bdb6ab', '#ece6dc'][i % 3], life: 1.2 + Math.random(), grav: -0.6, drag: 1.5, shrink: true });
        }
        const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.95, toneMapped: false }));
        ball.position.set(e.x, e.y, e.z);
        ball.userData = { t: 0, r: e.r };
        this.glow.add(ball);
        const ball2 = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 1, toneMapped: false }));
        ball2.position.set(e.x, e.y, e.z);
        ball2.userData = { t: 0, r: e.r * 0.6 };
        this.glow.add(ball2);
        this.shake = Math.min(1.2, (this.shake || 0) + e.r * 0.25);
        break;
      }
      case 'splash':
        for (let i = 0; i < (e.small ? 12 : 30); i++) {
          const a = Math.random() * Math.PI * 2, s = Math.random() * 2.5;
          P.add({ x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * s, vy: 4 + Math.random() * 6, vz: Math.sin(a) * s, size: 0.12 + Math.random() * 0.2, color: Math.random() < 0.6 ? '#ffffff' : '#bff1ff', life: 0.9, grav: 14 });
        }
        break;
      case 'feathers':
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
          P.add({ x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * s, vy: 2 + Math.random() * 4, vz: Math.sin(a) * s, size: 0.22, flat: true, color: Math.random() < 0.3 ? (e.color || '#ffd23a') : Math.random() < 0.5 ? '#ffd23a' : '#ffffff', life: 2.4 + Math.random(), grav: 2.2, drag: 2.5, sway: 6, spin: 3 });
        }
        break;
      case 'poof':
        for (let i = 0; i < 24; i++) {
          const a = Math.random() * Math.PI * 2, s = Math.random() * 3;
          P.add({ x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * s, vy: Math.random() * 3, vz: Math.sin(a) * s, size: 0.16, color: ['#fff6a8', '#a8f0ff', '#ffffff', '#ffb3ec'][i % 4], life: 0.8, grav: -1, drag: 2 });
        }
        break;
      case 'tracer': {
        const a = new THREE.Vector3(...e.a), b = new THREE.Vector3(...e.b);
        const g = new THREE.BufferGeometry().setFromPoints([a, b]);
        const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xfff3a0, transparent: true }));
        l.userData.t = 0.25;
        this.scene.add(l);
        this.tracers.push(l);
        break;
      }
      case 'dmg': this.floatText(`-${e.n}`, 'fd', e.x, e.y, e.z); break;
      case 'heal': this.floatText(`+${e.n}`, 'fh', e.x, e.y, e.z); break;
      case 'pickup': this.floatText(`${e.icon || ''} ${e.text}`, 'fp', e.x, e.y, e.z); break;
      case 'say': this.say(e.id, e.text); break;
      case 'react': {
        const c = this.chickens.get(e.id);
        if (c) this.floatText(e.e, 'fr', c.obj.position.x, c.obj.position.y + 2.2, c.obj.position.z);
        break;
      }
      case 'land': {
        const c = this.chickens.get(e.id);
        if (c) for (let i = 0; i < 6; i++) P.add({ x: c.obj.position.x, y: c.obj.position.y + 0.05, z: c.obj.position.z, vx: (Math.random() - 0.5) * 2, vy: 0.8, vz: (Math.random() - 0.5) * 2, size: 0.12, color: pal[1], life: 0.5, grav: 4 });
        break;
      }
      default: break;
    }
  }

  floatText(text, cls, x, y, z) {
    const el = document.createElement('div');
    el.className = 'ft ' + cls;
    el.textContent = text;
    this.overlay.appendChild(el);
    this.floats.push({ el, x, y, z, t: 0 });
  }

  say(id, text) {
    const c = this.chickens.get(id);
    if (!c) return;
    for (const b of this.bubbles) if (b.id === id) { b.el.remove(); b.dead = true; }
    this.bubbles = this.bubbles.filter((b) => !b.dead);
    const el = document.createElement('div');
    el.className = 'bub';
    el.textContent = text;
    this.overlay.appendChild(el);
    this.bubbles.push({ id, el, t: 0 });
  }

  // ---------------- dibujar ----------------
  draw(v, dt) {
    this.time += dt;
    if (!this.world) { this.r.render(this.scene, this.cam); return; }
    this.tmesh.update(this.phone ? 6 : 14);
    // agua
    const wy = v.water ?? this.theme.waterVox * VOX;
    this.water.position.y = wy;
    if (this.quality !== 'ahorro') {
      const pa = this.waterGeo.attributes.position.array, base = this.waterBase;
      for (let i = 0; i < pa.length; i += 3) pa[i + 1] = Math.sin(base[i] * 0.18 + this.time * 1.6) * 0.12 + Math.cos(base[i + 2] * 0.21 + this.time * 1.3) * 0.12;
      this.waterGeo.attributes.position.needsUpdate = true;
    }
    for (const c of this.clouds.children) { c.position.x += c.userData.v * dt; if (c.position.x > 130) c.position.x = -60; }

    const T = v.turn;
    const active = T ? T.ch : -1;
    const ach = v.chickens.find((s) => s.id === active);
    const isFp = !!(v.cam && v.cam.m === 'fp');
    // pollitos
    for (const s of v.chickens) {
      const c = this.chickens.get(s.id);
      if (!c) continue;
      const { obj, sh } = c;
      const vis = s.alive || s.dying;
      obj.visible = !!vis; sh.visible = !!vis;
      if (!vis) { c.lbl.style.display = 'none'; continue; }
      let ry = s.y;
      if (!s.air) { const gy0 = this.terrain.surfaceY(s.x, s.z, s.y + 0.7); if (Math.abs(gy0 - s.y) < 0.5) ry = gy0; }
      obj.position.set(s.x, ry, s.z);
      obj.rotation.y = s.yaw;
      const { body, gun, head, wings, eyes, pupils, beakTop, beakLow, robot } = obj.userData;
      body.visible = !(isFp && s.id === active);
      const w = s.walking ? Math.sin(this.time * 14) : 0;
      const cheering = v.phase === 'over' && s.alive && !s.dying;
      const nearMine = !!(v.objs && v.objs.some((o) => o.kind === 'mina' && Math.hypot(o.x - s.x, o.y - s.y, o.z - s.z) < 3.2));
      const scared = !!(s.hurt || s.dying || nearMine);
      c.scared = scared;
      c.cheering = cheering;

      // cuerpo: caminar, festejar o voltereta en salto atrás
      if (s.backflip && s.air) {
        if (!c.flipAct) { c.flipAct = true; c.flipT = 0.65; }
      } else if (!s.air) {
        c.flipAct = false;
        c.flipT = 0;
      }
      if (c.flipT > 0 && s.air) {
        c.flipT = Math.max(0, c.flipT - dt);
        const prog = 1 - c.flipT / 0.65;
        const ang = -prog * Math.PI * 2;
        const cy = 0.52;
        body.rotation.x = ang;
        body.position.y = cy * (1 - Math.cos(ang));
        body.position.z = -cy * Math.sin(ang);
        body.rotation.z = 0;
      } else if (cheering) {
        const hop = Math.abs(Math.sin(this.time * 9 + s.id * 1.3));
        body.position.y = hop * 0.28;
        body.position.z = 0;
        body.rotation.x = 0;
        body.rotation.z = Math.sin(this.time * 4.5 + s.id) * 0.14;
      } else {
        body.position.y = s.walking ? Math.abs(w) * 0.07 : 0;
        body.position.z = 0;
        body.rotation.z = s.walking ? w * 0.12 : Math.sin(this.time * 1.6 + s.id) * 0.02;
        body.rotation.x = s.air && !s.rope ? -0.25 : 0;
      }
      const breathe = 1 + Math.sin(this.time * 2.4 + s.id * 1.7) * 0.015;
      body.scale.set(1, breathe, 1);
      if (s.dying) { const k = 1 + Math.sin(this.time * 30) * 0.08; body.scale.set(k, k, k); }
      if (s.hurt) body.position.x = Math.sin(this.time * 60) * 0.05; else body.position.x = 0;

      // alas: aleteo al caer/volar, alas arriba al festejar o balanceo al caminar
      if (wings && wings.length === 2) {
        const baseZ = robot ? 0.25 : 0.35;
        if (cheering) {
          const wave = Math.sin(this.time * 16 + s.id) * 0.25;
          wings[0].rotation.set(0, 0, -(2.15 + wave));
          wings[1].rotation.set(0, 0, 2.15 + wave);
          wings[0].position.y = wings[1].position.y = 0.66;
        } else if (s.air && !s.rope) {
          const flap = Math.sin(this.time * 32 + s.id) * 0.95;
          wings[0].rotation.set(0, 0, -(0.55 + flap));
          wings[1].rotation.set(0, 0, 0.55 + flap);
          wings[0].position.y = wings[1].position.y = 0.55;
        } else if (s.walking) {
          wings[0].rotation.set(w * 0.25, 0, -baseZ);
          wings[1].rotation.set(-w * 0.25, 0, baseZ);
          wings[0].position.y = wings[1].position.y = 0.5;
        } else {
          wings[0].rotation.set(0, 0, -baseZ);
          wings[1].rotation.set(0, 0, baseZ);
          wings[0].position.y = wings[1].position.y = 0.5;
        }
      }

      // cara de susto (ojos grandes, pico abierto) al recibir daño o cerca de una mina
      if (eyes) {
        for (const e of eyes) {
          if (robot) e.scale.set(scared ? 0.1 : 0.07, scared ? 0.1 : 0.07, 0.03);
          else e.scale.set(scared ? 0.18 : 0.13, scared ? 0.22 : 0.16, scared ? 0.13 : 0.1);
        }
      }
      if (pupils) {
        for (const p of pupils) p.scale.set(scared ? 0.05 : 0.065, scared ? 0.06 : 0.08, 0.045);
      }
      if (beakTop) {
        beakTop.rotation.x = Math.PI / 2 - (scared ? 0.26 : 0);
        beakTop.position.y = (robot ? 0.92 : 0.93) + (scared ? 0.025 : 0);
      }
      if (beakLow) {
        beakLow.rotation.x = Math.PI / 2 + (scared ? 0.72 : 0.2);
        beakLow.position.y = scared ? 0.82 : 0.88;
      }

      // cabeza: los pollitos quietos miran al pollito del turno
      if (head) {
        let targetHeadYaw = 0;
        let targetHeadPitch = 0;
        if (!cheering && s.id !== active && ach && ach.alive && !s.walking && !s.air && !s.dying) {
          const dx = ach.x - s.x, dz = ach.z - s.z, dy = ach.y - s.y;
          let dYaw = Math.atan2(dx, dz) - s.yaw;
          while (dYaw > Math.PI) dYaw -= Math.PI * 2;
          while (dYaw < -Math.PI) dYaw += Math.PI * 2;
          targetHeadYaw = Math.max(-1.1, Math.min(1.1, dYaw));
          const dist = Math.hypot(dx, dz) || 1;
          targetHeadPitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(dy, dist) * 0.6));
        }
        const hk = Math.min(1, dt * 8);
        head.rotation.y += (targetHeadYaw - head.rotation.y) * hk;
        head.rotation.x += (targetHeadPitch - head.rotation.x) * hk;
      }

      c.umb.visible = !!s.umbrella;
      // arma en la mano del pollito activo
      const wpn = T && s.id === active ? weaponById(T.weapon) : null;
      gun.visible = !!(wpn && (wpn.aim === 'power' || wpn.id === 'escopeta' || wpn.id === 'cuerda') && v.phase === 'play' && !s.rope && !s.jet);
      if (gun.visible) gun.rotation.x = -(T.pitch || 0);
      // sombra
      const gy = this.groundBelow(s.x, s.y + 0.2, s.z);
      sh.position.set(s.x, gy + 0.03, s.z);
      const hgt = Math.max(0, s.y - gy);
      sh.scale.setScalar(Math.max(0.3, 1 - hgt * 0.08));
      sh.visible = gy > -50 && !this.shadows;
      // jetpack
      if (s.jet && Math.random() < 0.8) this.parts.add({ x: s.x - Math.sin(s.yaw) * 0.4, y: s.y + 0.3, z: s.z - Math.cos(s.yaw) * 0.4, vx: 0, vy: -4, vz: 0, size: 0.16, color: Math.random() < 0.5 ? '#ffb020' : '#ff5a1f', life: 0.35, grav: 0, shrink: true });
      // etiqueta
      if (c.hp !== s.hp) { c.hp = s.hp; c.lbl.querySelector('.lh').textContent = s.hp; }
      const p = this.project(s.x, ry + CHICKEN_H + 0.3, s.z);
      if (p && s.alive && !(isFp && s.id === active)) {
        c.lbl.style.display = '';
        c.lbl.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
        c.lbl.classList.toggle('act', s.id === active);
        c.lp = p;
      } else { c.lbl.style.display = 'none'; c.lp = null; }
    }
    // flecha sobre el pollito del turno
    const ac = this.chickens.get(active);
    if (ac && ac.lp && v.phase === 'play' && !isFp) {
      this.marker.style.display = '';
      this.marker.style.color = this.teamsMeta[ac.team].color;
      this.marker.style.transform = `translate(${ac.lp.x}px, ${ac.lp.y - 30 - Math.abs(Math.sin(this.time * 4)) * 10}px) translate(-50%, -100%)`;
    } else this.marker.style.display = 'none';

    // cuerda
    const roper = v.chickens.find((s) => s.rope && s.alive);
    if (roper) {
      const a = new THREE.Vector3(roper.x, roper.y + 0.8, roper.z), b = new THREE.Vector3(...roper.rope);
      const len = a.distanceTo(b);
      this.ropeMesh.visible = true;
      this.ropeMesh.position.copy(a).add(b).multiplyScalar(0.5);
      this.ropeMesh.scale.set(1, len, 1);
      this.ropeMesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    } else this.ropeMesh.visible = false;

    // objetos
    const seen = new Set();
    for (const o of v.objs) {
      seen.add(o.id);
      let it = this.objs.get(o.id);
      if (!it) {
        const kind = PROJ_MODEL[o.kind] || 'egg';
        const scale = { cajaArma: 1.2, cajaSalud: 1.2, cajaUtil: 1.2, barril: 1.1, mina: 1.25, paloma: 1.3, oro: 1.1, gallina: 0.9, guacamaya: 1.2 }[o.kind] || 1;
        const mesh = makeObject(kind, scale);
        this.scene.add(mesh);
        it = { mesh, kind: o.kind };
        if (o.kind.startsWith('caja')) { it.para = makeObject('sombrilla', 0.85); it.para.position.y = 1.35; mesh.add(it.para); }
        if (o.kind === 'lapida' && o.name) { const l = document.createElement('div'); l.className = 'lbl tomb'; l.textContent = o.name; this.overlay.appendChild(l); it.lbl = l; }
        this.objs.set(o.id, it);
      }
      const m = it.mesh;
      m.position.set(o.x, o.y, o.z);
      if (['bazuca', 'regalo', 'guacamaya', 'paloma'].includes(o.kind)) {
        m.rotation.set(0, o.yaw, 0);
        if (o.kind === 'bazuca') m.rotation.x = Math.PI / 2;
      } else if (['granada', 'maiz', 'oro', 'pop'].includes(o.kind)) {
        m.rotation.x += dt * 8; m.rotation.z += dt * 5;
      } else m.rotation.y = o.yaw;
      if (o.kind === 'gallina') m.position.y += Math.abs(Math.sin(this.time * 14)) * 0.12;
      if (o.kind === 'paloma') m.scale.y = 1.4 * (1 + Math.sin(this.time * 20) * 0.3);
      if (it.para) it.para.visible = !!o.para;
      if (o.kind === 'mina') m.visible = !o.trig || Math.sin(this.time * 30) > -0.3;
      if (o.kind === 'vela' && Math.random() < 0.5) this.parts.add({ x: o.x, y: o.y + 0.9, z: o.z, vx: (Math.random() - 0.5) * 0.4, vy: 1.2, vz: (Math.random() - 0.5) * 0.4, size: 0.1, color: Math.random() < 0.5 ? '#ffd23f' : '#ff7a1a', life: 0.4, grav: 0, shrink: true });
      if (['bazuca', 'guacamaya'].includes(o.kind) && Math.random() < 0.7) this.parts.add({ x: o.x, y: o.y, z: o.z, vx: 0, vy: 0.4, vz: 0, size: 0.22, color: '#d8d8d8', life: 0.6, grav: -0.5, grow: 1.5, drag: 1 });
      if (o.kind === 'oro' && Math.random() < 0.6) this.parts.add({ x: o.x, y: o.y + 0.2, z: o.z, vx: (Math.random() - 0.5), vy: 1, vz: (Math.random() - 0.5), size: 0.1, color: '#fff3a0', life: 0.5, grav: 0, shrink: true });
      if (it.lbl) {
        const p = this.project(o.x, o.y + 0.9, o.z);
        if (p) { it.lbl.style.display = ''; it.lbl.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`; } else it.lbl.style.display = 'none';
      }
    }
    for (const [id, it] of this.objs) if (!seen.has(id)) { this.scene.remove(it.mesh); if (it.lbl) it.lbl.remove(); this.objs.delete(id); }

    // mira, puntos guía y cursor del mapa
    const wp = T ? weaponById(T.weapon) : null;
    const showAim = ach && ach.alive && v.phase === 'play' && wp && (wp.aim === 'power' || wp.aim === 'direct') && !ach.rope && !ach.jet && T.mode !== 'target';
    if (showAim) {
      const cp = Math.cos(T.pitch), dx = Math.sin(ach.yaw) * cp, dy = Math.sin(T.pitch), dz = Math.cos(ach.yaw) * cp;
      const ox = isFp ? ach.x + dx * 0.25 : ach.x;
      const oy = isFp ? ach.y + 1.02 : ach.y + 0.75;
      const oz = isFp ? ach.z + dz * 0.25 : ach.z;
      this.xhair.visible = true;
      this.xhair.position.set(ox + dx * 4, oy + dy * 4, oz + dz * 4);
      this.dots.forEach((d, i) => { d.visible = !isFp && T.mode === 'aim'; d.position.set(ox + dx * (1 + i * 0.5), oy + dy * (1 + i * 0.5), oz + dz * (1 + i * 0.5)); });
    } else { this.xhair.visible = false; this.dots.forEach((d) => { d.visible = false; }); }
    if (T && T.mode === 'target' && T.cursor && v.phase === 'play') {
      this.cursor.visible = true;
      const cy = this.groundBelow(T.cursor[0], 30, T.cursor[1]);
      this.cursor.position.set(T.cursor[0], Math.max(cy, wy) + 0.1, T.cursor[1]);
      this.cursor.children[0].rotation.z += dt * 2;
    } else this.cursor.visible = false;

    // bolas de fuego, trazos y partículas
    for (let i = this.glow.children.length - 1; i >= 0; i--) {
      const b = this.glow.children[i];
      b.userData.t += dt;
      const k = b.userData.t / 0.45;
      b.scale.setScalar(b.userData.r * (0.4 + k * 1.1));
      b.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { this.glow.remove(b); b.geometry.dispose(); b.material.dispose(); }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const l = this.tracers[i];
      l.userData.t -= dt;
      l.material.opacity = Math.max(0, l.userData.t * 4);
      if (l.userData.t <= 0) { this.scene.remove(l); l.geometry.dispose(); l.material.dispose(); this.tracers.splice(i, 1); }
    }
    this.parts.update(dt);

    this.updateCamera(v.cam || { m: 'orbit' }, dt);

    // textos flotantes y globos
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      const p = this.project(f.x, f.y + f.t * 0.9, f.z);
      if (p) f.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
      f.el.style.opacity = String(Math.max(0, Math.min(1, 2.2 - f.t)));
      if (f.t > 2.2) { f.el.remove(); this.floats.splice(i, 1); }
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.t += dt;
      const c = this.chickens.get(b.id);
      const p = c && c.lp;
      if (p) { b.el.style.display = ''; b.el.style.transform = `translate(${p.x}px, ${p.y - 26}px) translate(-50%, -100%)`; } else b.el.style.display = 'none';
      if (b.t > 2.6) { b.el.remove(); this.bubbles.splice(i, 1); }
    }

    this.r.render(this.scene, this.cam);
  }

  updateCamera(c, dt) {
    const cx = WORLD_X / 2, cz = WORLD_Z / 2;
    let pos, look;
    const f = c.f ? new THREE.Vector3(c.f[0], c.f[1], c.f[2]) : new THREE.Vector3(cx, 4, cz);
    const back = (yaw, d) => new THREE.Vector3(-Math.sin(yaw) * d, 0, -Math.cos(yaw) * d);
    let speed = 3.2;
    if (c.yaw !== undefined) this.camYaw = c.yaw;
    switch (c.m) {
      case 'follow':
        pos = f.clone().add(back(c.yaw, 9)).add(new THREE.Vector3(0, 6, 0));
        look = f.clone().add(new THREE.Vector3(Math.sin(c.yaw) * 3, 1.0, Math.cos(c.yaw) * 3));
        break;
      case 'aim': {
        const right = new THREE.Vector3(-Math.cos(c.yaw), 0, Math.sin(c.yaw));
        const p = (c.pitch || 0) * 0.7;
        pos = f.clone().add(back(c.yaw, 4.8)).add(right.clone().multiplyScalar(1.2)).add(new THREE.Vector3(0, 2.4 - Math.sin(p) * 1.1, 0));
        look = f.clone().add(new THREE.Vector3(Math.sin(c.yaw) * Math.cos(p) * 9, 1.3 + Math.sin(p) * 9, Math.cos(c.yaw) * Math.cos(p) * 9));
        speed = 6;
        break;
      }
      case 'fp': {
        const p = c.pitch || 0;
        const cp = Math.cos(p), dx = Math.sin(c.yaw) * cp, dy = Math.sin(p), dz = Math.cos(c.yaw) * cp;
        pos = f.clone().add(new THREE.Vector3(dx * 0.25, 1.02, dz * 0.25));
        look = pos.clone().add(new THREE.Vector3(dx * 12, dy * 12, dz * 12));
        speed = 24;
        break;
      }
      case 'proj': case 'look': {
        const off = this.cam.position.clone().sub(this.camLook);
        off.y = 0;
        if (off.lengthSq() < 0.01) off.set(0, 0, 1);
        off.normalize().multiplyScalar(c.m === 'proj' ? 10 : 13);
        pos = f.clone().add(off).add(new THREE.Vector3(0, c.m === 'proj' ? 4 : 6, 0));
        look = f.clone();
        speed = c.m === 'proj' ? 4.5 : 2.5;
        break;
      }
      case 'target':
        pos = f.clone().add(back(c.yaw, 12)).add(new THREE.Vector3(0, 20, 0));
        look = f.clone();
        speed = 5;
        break;
      case 'over':
        pos = new THREE.Vector3(cx, 0, cz).add(back(c.yaw, 52)).add(new THREE.Vector3(0, 46, 0));
        look = new THREE.Vector3(cx, 2, cz);
        break;
      case 'orbit':
      default:
        this.orbitA += dt * 0.08;
        pos = new THREE.Vector3(cx + Math.sin(this.orbitA) * 56, 34, cz + Math.cos(this.orbitA) * 56);
        look = new THREE.Vector3(cx, 3, cz);
        speed = 1.5;
        break;
    }
    // que la cámara no se meta en el terreno ni quede tapada por montañas o decoraciones
    if (c.m !== 'fp') {
      const g = this.groundBelow(pos.x, NY * VOX, pos.z);
      if (pos.y < g + 1.6) pos.y = g + 1.6;
    }
    if (this.terrain && (c.m === 'follow' || c.m === 'aim' || c.m === 'look')) {
      const head = new THREE.Vector3(f.x, f.y + 0.95, f.z);
      if (this.rayBlocked(head, pos)) {
        const cand = new THREE.Vector3();
        let found = false;
        for (let s = 1; s <= 14 && !found; s++) {
          const u = s / 14;
          // 1) acercar y subir a la vez
          cand.copy(pos).lerp(head, u * 0.85);
          cand.y = Math.max(cand.y + u * 6.0, this.groundBelow(cand.x, cand.y + 4, cand.z) + 1.2);
          if (!this.terrain.solid(cand.x, cand.y, cand.z) && !this.rayBlocked(head, cand)) {
            pos.copy(cand);
            found = true;
            break;
          }
          // 2) acercar directo hacia el pollito (por delante del obstáculo)
          cand.copy(pos).lerp(head, u * 0.88);
          cand.y = Math.max(head.y + 0.6, cand.y);
          if (!this.terrain.solid(cand.x, cand.y, cand.z) && !this.rayBlocked(head, cand)) {
            pos.copy(cand);
            found = true;
            break;
          }
        }
        if (!found) {
          pos.copy(pos).lerp(head, 0.85);
          pos.y = head.y + 1.2;
        }
        speed = Math.max(speed, 6.0);
      }
    }
    if (c.m === 'fp') {
      this.cam.position.copy(pos);
      this.camLook.copy(look);
    } else {
      const k = 1 - Math.exp(-dt * speed);
      this.cam.position.lerp(pos, k);
      this.camLook.lerp(look, k);
    }
    this.camYaw = c.yaw !== undefined ? c.yaw : Math.atan2(this.camLook.x - this.cam.position.x, this.camLook.z - this.cam.position.z);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.2);
      this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    this.cam.lookAt(this.camLook);
    this.cam.updateMatrixWorld();
  }

  dispose() {
    this.ro.disconnect();
    this.clearWorld();
    this.r.dispose();
    this.canvas.remove();
    this.overlay.remove();
  }
}

