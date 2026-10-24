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
function watch(page, tag) {
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|fonts|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
}
async function tv(size = { width: 1600, height: 900 }, touch = false) {
  const p = await browser.newPage({ viewport: size, isMobile: touch, hasTouch: touch });
  watch(p, 'TV');
  await p.goto(BASE + '/' + Q);
  await p.evaluate((h) => { localStorage.setItem('fc_ok', h); localStorage.removeItem('fc_cfg'); }, PASS_HASH);
  await p.reload();
  await sleep(4000);
  return p;
}
async function phone(code, tag, size = { width: 412, height: 860 }) {
  const p = await browser.newPage({ viewport: size, isMobile: true, hasTouch: true });
  watch(p, tag);
  await p.goto(`${BASE}/mando${Q}&c=${code}`);
  await sleep(4000);
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
  await a.selectOption('select.sel', 'billar');
  await sleep(800);
  check(await t.$eval('select.sel', (e) => e.value) === 'billar', 'el mapa elegido en el celular llega al TV');
  await a.getByText('Sí, verlo aquí').click();
  await a.setViewportSize({ width: 860, height: 400 });
  await a.getByText('¡A PELEAR!').click();
  await sleep(1500);
  check((await t.locator('.banner').allInnerTexts()).join(' ').includes('Mesa de Billar'), 'la partida usa el mapa elegido');
  await sleep(5000);
  check(await a.evaluate(() => !!(window.__fcMirror && window.__fcMirror.snaps.length)), 'el celular recibe la partida (vista en el celular)');
  const p = await waitTurn([a]);
  check(!!p, 'llega el turno del jugador');
  if (p) {
    await p.locator('.rb', { hasText: 'Apuntar' }).click(); await sleep(800);
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

// ---------- 4. Jugador con teclado en el PC ----------
{
  const t = await tv({ width: 1366, height: 768 });
  await t.mouse.click(700, 400); await t.keyboard.press('Space'); await sleep(400);
  check(await t.locator('.slot .meta', { hasText: 'Teclado' }).count() === 1, 'teclado se une con Espacio');
  await t.keyboard.press('Enter'); await sleep(6000);
  let mine = false;
  for (let i = 0; i < 60 && !mine; i++) { mine = !!(await t.locator('.keys').count()); if (!mine) await sleep(1000); }
  check(mine, 'llega el turno del teclado');
  if (mine) { await t.keyboard.press('KeyR'); await t.keyboard.down('Space'); await sleep(900); await t.keyboard.up('Space'); await sleep(2500); await t.screenshot({ path: OUT + '4_teclado.png' }); }
  await t.close();
}

await browser.close();
console.log(errors.length ? `\nErrores de consola:\n${errors.join('\n')}` : '\nSin errores de consola');
console.log(fails || errors.length ? `\n${fails} FALLAS` : '\nTodo bien');
process.exit(fails || errors.length ? 1 : 0);
