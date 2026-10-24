// Prueba de punta a punta en navegador: TV + celulares, sin TV, cooperativo, mapa y teclado.
// Requisitos: npm i --no-save playwright peer && npx playwright install chromium
// 1) npm run build && npm start        (puerto 3000)
// 2) node tests/peer-server.mjs        (otra terminal)
// 3) node tests/e2e.mjs                (capturas en tests/out/)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const Q = '?peerhost=127.0.0.1&peerport=9000&peerpath=/';
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const PASS_HASH = 'b84278f09dc30d6b6710c7628dbe93a440013d3dd152c147c19fe00ba4fecf4f';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'OK ' : 'MAL'} ${msg}`); if (!ok) fails++; };

const glArgs = process.platform === 'win32'
  ? ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
  : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
const browser = await chromium.launch({ args: glArgs });
async function watch(page, tag) {
  await page.route(/fonts\.g(oogleapis|static)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|fonts|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
}
async function tv(size = { width: 1600, height: 900 }, touch = false) {
  const p = await browser.newPage({ viewport: size, isMobile: touch, hasTouch: touch });
  await watch(p, 'TV');
  await p.goto(BASE + '/' + Q, { waitUntil: 'domcontentloaded' });
  await p.evaluate((h) => { localStorage.setItem('fc_ok', h); localStorage.removeItem('fc_cfg'); }, PASS_HASH);
  await p.reload({ waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 30; i++) {
    const ready = await p.evaluate(() => !!(window.__fcHost && window.__fcHost.peerStatus === 'ready' && sessionStorage.getItem('fc_code'))).catch(() => false);
    if (ready) break;
    await sleep(300);
  }
  await sleep(500);
  return p;
}
async function phone(code, tag, size = { width: 412, height: 860 }) {
  const p = await browser.newPage({ viewport: size, isMobile: true, hasTouch: true });
  await watch(p, tag);
  await p.goto(`${BASE}/mando${Q}&c=${code}`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 30 && !(await p.locator('.me, .top').count()); i++) await sleep(250);
  await sleep(300);
  return p;
}
const waitTurn = async (pages, secs = 60) => {
  for (let i = 0; i < secs; i++) { for (const p of pages) if (await p.locator('.rb.fire').count()) return p; await sleep(1000); }
  return null;
};
const tapFire = async (p, ms = 150) => {
  const b = await p.locator('.rb.fire').boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(ms); await p.mouse.up();
};

// ---------- 1. TV + celular, mapa elegido, apuntar y disparar ----------
{
  const t = await tv();
  const code = await t.evaluate(() => sessionStorage.getItem('fc_code'));
  check(!!code, `sala creada (${code})`);
  const a = await phone(code, 'J1');
  await t.screenshot({ path: OUT + '1_lobby_tv.png' });
  await a.screenshot({ path: OUT + '1_lobby_j1.png', fullPage: true });
  await a.locator('.isl-btn[data-island="billar"]').click();
  await sleep(800);
  check(await t.locator('.isl-btn.on[data-island="billar"]').count() === 1, 'el mapa elegido en el celular llega al TV');
  check(await t.evaluate(() => !!(window.__fcHost && window.__fcHost.demo && window.__fcHost.demo.island === 'billar')), 'el fondo del lobby cambia a la isla elegida');
  check((await t.locator('.isl-pill').innerText()).includes('Mesa de Billar'), 'el lobby del TV muestra el nombre de la isla elegida');
  await a.locator('[data-sens="baja"]').click();
  check(await a.evaluate(() => JSON.parse(localStorage.getItem('fc_ctrl') || '{}').sens === 'baja'), 'ajuste de sensibilidad se guarda en localStorage');
  await a.locator('[data-sens="media"]').click();
  await a.getByRole('button', { name: 'Elegir' }).click();
  await sleep(300);
  await a.getByText('Sí, verlo aquí').click();
  await a.setViewportSize({ width: 860, height: 400 });
  await a.getByText('¡A PELEAR!').click();
  await sleep(1000);
  check((await t.locator('.banner').allInnerTexts()).join(' ').includes('Mesa de Billar') || await t.evaluate(() => !!(window.__fcHost && window.__fcHost.match && window.__fcHost.match.island === 'billar')), 'la partida usa el mapa elegido');
  await sleep(2500);
  check(await a.evaluate(() => !!(window.__fcMirror && window.__fcMirror.snaps.length)), 'el celular recibe la partida (vista en el celular)');
  const p = await waitTurn([a]);
  check(!!p, 'llega el turno del jugador');
  if (p) {
    check(await t.locator('.radar .rdot.act').count() === 1 && await p.locator('.radar.sm .rdot.act').count() === 1, 'radar visible en TV y celular con vista con pollito del turno resaltado');
    const occ = await t.evaluate(() => {
      const h = window.__fcHost;
      const m = h.match;
      const r = h.renderer;
      const ch = m.activeChicken();
      const head = { x: ch.x, y: ch.y + 0.95, z: ch.z };
      const nx = ch.x - Math.sin(ch.yaw) * 9, nz = ch.z - Math.cos(ch.yaw) * 9;
      const normalPos = { x: nx, y: Math.max(ch.y + 6, r.groundBelow(nx, 24, nz) + 1.6), z: nz };
      const mx = (head.x + normalPos.x) * 0.5, my = (head.y + normalPos.y) * 0.5, mz = (head.z + normalPos.z) * 0.5;
      m.terrain.sphere(mx / 0.5, my / 0.5, mz / 0.5, 4, 1);
      const blockedNormal = r.rayBlocked(head, normalPos);
      for (let i = 0; i < 60; i++) r.updateCamera({ m: 'follow', f: [ch.x, ch.y, ch.z], yaw: ch.yaw }, 1 / 60);
      const blockedAdjusted = r.rayBlocked(head, r.cam.position);
      m.terrain.carve(mx, my, mz, 2.6, false);
      return { blockedNormal, blockedAdjusted };
    });
    check(occ.blockedNormal && !occ.blockedAdjusted, 'la cámara evita quedar tapada por obstáculos del terreno');
    const anims = await t.evaluate(() => {
      const h = window.__fcHost;
      const m = h.match;
      const r = h.renderer;
      const v = m.view();
      const activeId = v.turn.ch;
      const ach = v.chickens.find((c) => c.id === activeId);
      const idle = v.chickens.find((c) => c.id !== activeId && c.alive);
      idle.yaw = Math.atan2(ach.x - idle.x, ach.z - idle.z) + 0.7;
      for (let i = 0; i < 20; i++) r.draw(v, 1 / 60);
      const idleLook = Math.abs(r.chickens.get(idle.id).obj.userData.head.rotation.y) > 0.1;

      ach.air = true; ach.backflip = true;
      r.draw(v, 0.2);
      const acObj = r.chickens.get(activeId).obj;
      const flipOk = Math.abs(acObj.userData.body.rotation.x) > 0.5;
      const flapOk = Math.abs(acObj.userData.wings[1].position.y - 0.55) < 0.01;

      ach.air = false; ach.backflip = false;
      v.objs.push({ id: 99999, kind: 'mina', x: ach.x + 1.0, y: ach.y, z: ach.z, yaw: 0 });
      r.draw(v, 1 / 60);
      const scaredOk = r.chickens.get(activeId).scared && acObj.userData.eyes[0].scale.y > 0.2 && acObj.userData.beakLow.rotation.x > Math.PI / 2 + 0.5;

      v.phase = 'over';
      r.draw(v, 1 / 60);
      const cheerOk = r.chickens.get(activeId).cheering && acObj.userData.wings[1].rotation.z > 1.8;
      return { idleLook, flipOk, flapOk, scaredOk, cheerOk };
    });
    check(anims.idleLook && anims.flipOk && anims.flapOk && anims.scaredOk && anims.cheerOk, 'animaciones de pollitos: mirar al del turno, voltereta, aleteo, cara de susto y festejo');
    const t10 = await t.evaluate(() => {
      const h = window.__fcHost;
      const m = h.match;
      const r = h.renderer;
      const ch = m.activeChicken();
      const trapCrate = m.addObj({ kind: 'cajaArma', x: ch.x + 3, y: ch.y, z: ch.z, ground: true, trap: true });
      const fire = m.addObj({ kind: 'fuego', x: ch.x - 3, y: ch.y, z: ch.z, t: 4, r: 2 });
      m.teams[m.turn.team].visor = true;
      r.draw(m.view(), 1 / 60);
      const trapVis = !!(r.objs.get(trapCrate.id) && r.objs.get(trapCrate.id).trapMark && r.objs.get(trapCrate.id).trapMark.visible);
      const fireVis = !!(r.objs.get(fire.id) && r.objs.get(fire.id).mesh.visible);
      const visorCount = r.visorDots.filter((d) => d.visible).length;
      m.teams[m.turn.team].visor = false;
      return { trapVis, fireVis, visorCount };
    });
    check(t10.trapVis && t10.fireVis && t10.visorCount > 5, 'aviso visual en caja trampa, trayectoria completa con Visor y fuego de barril en 3D');
    await t.evaluate(() => {
      if (window.__fcHost && window.__fcHost.match) {
        window.__fcHost.match.objs = [];
        if (window.__fcHost.match.turn) window.__fcHost.match.turn.clock = 60;
      }
    });
    const chBefore = await t.evaluate(() => window.__fcHost.match.turn.ch);
    await p.locator('.pick-next').click(); await sleep(300);
    const chAfter = await t.evaluate(() => window.__fcHost.match.turn.ch);
    await p.locator('.pick-prev').click(); await sleep(300);
    const chBack = await t.evaluate(() => window.__fcHost.match.turn.ch);
    check(chAfter !== chBefore && chBack === chBefore, 'elegir pollito del turno con ▶ y ◀ cambia el pollito activo');
    await p.locator('.pad .fp-btn').click();
    for (let i = 0; i < 20; i++) {
      if (await t.evaluate(() => !!(window.__fcHost && window.__fcHost.match && window.__fcHost.match.turn && window.__fcHost.match.turn.fp))) break;
      await sleep(100);
    }
    const fpCheck = await t.evaluate(() => {
      const h = window.__fcHost;
      const m = h.match;
      const r = h.renderer;
      r.shake = 0;
      r.draw(m.view(), 1 / 60);
      const xh = r.xhair.position;
      const pr = r.project(xh.x, xh.y, xh.z);
      const centered = !!(pr && Math.abs(pr.x - r.w / 2) < 8 && Math.abs(pr.y - r.h / 2) < 8);
      const bodyHidden = !r.chickens.get(m.turn.ch).obj.userData.body.visible;
      return { mode: m.camera().m, centered, bodyHidden };
    });
    check(fpCheck.mode === 'fp' && fpCheck.centered && fpCheck.bodyHidden, 'vista en primera persona (👁‍🗨): cámara en cabeza con mira centrada');
    await p.locator('.pad .fp-btn').click();
    for (let i = 0; i < 20; i++) {
      if (await t.evaluate(() => !!(window.__fcHost && window.__fcHost.match && window.__fcHost.match.turn && !window.__fcHost.match.turn.fp))) break;
      await sleep(100);
    }
    await p.locator('.rb', { hasText: 'Apuntar' }).click(); await sleep(600);
    const p0 = await t.evaluate(() => window.__fcHost.match.turn.pitch);
    const jb = await p.locator('.joy').boundingBox();
    await p.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2);
    await p.mouse.down();
    await p.mouse.move(jb.x + jb.width / 2, jb.y + 12, { steps: 5 });
    await sleep(100);
    await p.mouse.up();
    await sleep(200);
    const pJoy = await t.evaluate(() => window.__fcHost.match.turn.pitch);
    check(Math.abs(pJoy - p0) < 1e-4, 'el joystick ya no mueve la mira');
    const before = await t.evaluate(() => ({ pitch: window.__fcHost.match.turn.pitch, yaw: window.__fcHost.match.activeChicken().yaw }));
    await p.mouse.move(430, 220);
    await p.mouse.down();
    await p.mouse.move(510, 140, { steps: 8 });
    await sleep(150);
    await p.mouse.up();
    await sleep(300);
    const after = await t.evaluate(() => ({ pitch: window.__fcHost.match.turn.pitch, yaw: window.__fcHost.match.activeChicken().yaw }));
    check(after.pitch > before.pitch + 0.1 && Math.abs(after.yaw - before.yaw) > 0.1, 'arrastrar en el celular cambia la mira poco a poco');
    await tapFire(p, 800); await sleep(2500);
    await t.screenshot({ path: OUT + '1_disparo_tv.png' });
    await p.screenshot({ path: OUT + '1_disparo_j1.png' });
  }
  await t.close(); await a.close();
}

// ---------- 2. Sin TV: el celular que crea la sala juega como J1 ----------
{
  const h = await tv({ width: 860, height: 400 }, true);
  await h.getByText('Jugar en este celular').click(); await sleep(800);
  const code = await h.evaluate(() => sessionStorage.getItem('fc_code'));
  const b = await phone(code, 'J2', { width: 860, height: 400 });
  await h.getByText('¡A PELEAR!').first().click(); await sleep(6000);
  const p = await waitTurn([h, b]);
  check(!!p, 'sin TV: llega un turno a un celular');
  if (p) {
    await p.locator('.wbtn').click(); await sleep(500);
    await p.getByText('Bandada de Palomas').click(); await sleep(600);
    await tapFire(p); await sleep(3000);
    await h.screenshot({ path: OUT + '2_sintv_host.png' });
    await b.screenshot({ path: OUT + '2_sintv_j2.png' });
  }
  await h.close(); await b.close();
}

// ---------- 3. Cooperativo con equipo compartido: rendirse, resultados y revancha ----------
{
  const t = await tv();
  const code = await t.evaluate(() => sessionStorage.getItem('fc_code'));
  const a = await phone(code, 'A');
  const b = await phone(code, 'B');
  check((await t.locator('.ro-note').innerText()).includes('Los ajustes los elige J1 desde su celular'), 'el TV avisa que J1 elige desde su celular');
  check(await t.locator('.cfgc .isl-btn:not([disabled])').count() === 0 && await t.locator('.slots .go[disabled]').count() === 1, 'el TV no deja editar ni iniciar si J1 está en celular');
  check(await b.locator('.isl-btn').count() === 0 && await b.locator('.cfg-summary .cs-item').count() === 6, 'J2 ve resumen de solo lectura y no puede editar ajustes');
  await b.screenshot({ path: OUT + '3_lobby_j2.png', fullPage: true });
  await a.getByRole('button', { name: 'Cooperativo' }).click(); await sleep(300);
  await a.getByRole('button', { name: 'Equipos compartidos' }).click(); await sleep(300);
  await a.setViewportSize({ width: 860, height: 400 }); await b.setViewportSize({ width: 860, height: 400 });
  await a.getByText('¡A PELEAR!').click(); await sleep(6000);
  const p = await waitTurn([a, b], 90);
  if (p) {
    await p.locator('.wbtn').click(); await sleep(400);
    await p.getByText('Rendirse').click(); await sleep(300); await p.getByText('¿Seguro?').click();
  }
  for (let i = 0; i < 40 && !(await t.locator('.res-title').count()); i++) await sleep(1000);
  check((await t.locator('.res-title').allInnerTexts()).join('') === '¡Derrota!', 'rendirse en cooperativo da derrota');
  await t.screenshot({ path: OUT + '3_resultados_tv.png' });
  await a.getByText('Revancha').click(); await sleep(4000);
  check(await t.locator('.teamsb').count() === 1, 'revancha arranca otra partida');
  await t.close(); await a.close(); await b.close();
}

// ---------- 4. Jugador con teclado en el TV y otro jugador desde otro PC en /mando ----------
{
  const t = await tv({ width: 1366, height: 768 });
  check((await t.locator('.join').innerText()).includes('o abre el link en otro PC'), 'el lobby del TV invita a abrir el link en otro PC');
  await t.mouse.click(700, 400); await t.keyboard.press('Space'); await sleep(400);
  check(await t.locator('.slot .meta', { hasText: 'Teclado' }).count() === 1, 'teclado se une con Espacio');
  const code = await t.evaluate(() => sessionStorage.getItem('fc_code'));
  const pc = await browser.newPage({ viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false });
  await watch(pc, 'PC2');
  await pc.goto(`${BASE}/mando${Q}&c=${code}`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 25 && !(await pc.locator('button[data-mode="pc"]').count()); i++) await sleep(300);
  check(await pc.locator('.ctrl.pcmode').count() === 1 && await pc.locator('button[data-mode="pc"].on').count() === 1, '/mando en PC entra en modo PC por defecto');
  await t.evaluate(() => window.__fcHost.setCfg({ cpuTeams: 0 }));
  await sleep(300);
  await t.keyboard.press('Enter'); await sleep(5000);
  check(await pc.evaluate(() => !!(window.__fcMirror && window.__fcMirror.snaps.length && !window.__fcMirror.renderer.phone)), 'el segundo PC ve la partida a pantalla completa');
  check(await pc.locator('.hud .teamsb').count() === 1 && await pc.locator('.hud .radar .rdot').count() >= 4 && await pc.locator('.pad').count() === 0, 'el modo PC muestra el HUD del TV y el radar sin botones táctiles');
  let kbDone = false, pcDone = false;
  for (let round = 0; round < 2; round++) {
    let who = null;
    for (let i = 0; i < 30 && !who; i++) {
      if (!kbDone && await t.locator('.keys').count()) who = 'kb';
      else if (!pcDone && await pc.locator('.keys').count()) who = 'pc';
      if (!who) await sleep(500);
    }
    if (who === 'kb') {
      kbDone = true;
      await t.keyboard.press('KeyR');
      await t.keyboard.down('Space'); await sleep(700); await t.keyboard.up('Space');
      await sleep(2500);
      await t.screenshot({ path: OUT + '4_teclado.png' });
    } else if (who === 'pc') {
      pcDone = true;
      await pc.locator('.wopen-btn').click(); await sleep(300);
      check(await pc.locator('.wgrid').count() === 1, 'el modo PC abre la cuadrícula de armas con el mouse');
      await pc.locator('.wgrid').getByText('Cerrar').click(); await sleep(200);
      const before = await t.evaluate(() => ({ pitch: window.__fcHost.match.turn.pitch, yaw: window.__fcHost.match.activeChicken().yaw }));
      await pc.mouse.click(640, 360);
      await pc.mouse.move(740, 260, { steps: 6 });
      await sleep(250);
      const after = await t.evaluate(() => ({ pitch: window.__fcHost.match.turn.pitch, yaw: window.__fcHost.match.activeChicken().yaw }));
      check(after.pitch > before.pitch + 0.05 && Math.abs(after.yaw - before.yaw) > 0.05, 'el jugador en otro PC apunta con el mouse');
      await pc.mouse.down(); await sleep(700); await pc.mouse.up();
      await sleep(2500);
      await pc.screenshot({ path: OUT + '4_pc_mando.png' });
    }
  }
  check(kbDone && pcDone, 'juegan su turno tanto el teclado del TV como el otro PC en /mando');
  await t.close(); await pc.close();
}

await browser.close();
console.log(errors.length ? `\nErrores de consola:\n${errors.join('\n')}` : '\nSin errores de consola');
console.log(fails || errors.length ? `\n${fails} FALLAS` : '\nTodo bien');
process.exit(fails || errors.length ? 1 : 0);
