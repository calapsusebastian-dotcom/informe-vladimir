/* =========================================================
   Tablero de cumplimiento – meta vs. real por mes
   Los datos se guardan en el navegador (localStorage).
   ========================================================= */

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ABR   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const KEY   = 'tablero-cumplimiento-v2';
const COL   = { red: '#e24b4a', amber: '#ef9f27', green: '#639922' };

/* ---------- Utilidades ---------- */
const $   = (s) => document.querySelector(s);
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/** Convierte texto a número. Acepta 1.000,5 (formato Colombia), 1000.5 y 1.000 (miles). Vacío = NaN */
function num(v) {
  let s = String(v ?? '').trim().replace(/\s|\$/g, '');
  if (!s) return NaN;
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''));
  return parseFloat(s);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}


/** Confirmación en dos clics (sin ventanas emergentes del navegador) */
function confirmar(btn, texto, accion) {
  if (btn.dataset.armado) {
    clearTimeout(btn._t); delete btn.dataset.armado;
    btn.textContent = btn.dataset.orig; accion(); return;
  }
  btn.dataset.orig = btn.textContent; btn.dataset.armado = '1';
  btn.textContent = texto;
  btn._t = setTimeout(() => { delete btn.dataset.armado; btn.textContent = btn.dataset.orig; }, 4000);
}

function estado(v, ind) {
  if (v >= ind.hi / 100) return { t: 'En meta',      c: 'green' };
  if (v >= ind.lo / 100) return { t: 'En riesgo',    c: 'amber' };
  return                        { t: 'Bajo la meta', c: 'red' };
}

/* ---------- Datos ---------- */
function nuevoIndicador(nombre) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nombre: nombre || 'Nuevo indicador',
    anio: new Date().getFullYear(),
    unidad: '',
    lo: 70,
    hi: 90,
    meses: Array.from({ length: 12 }, () => ({ meta: '', real: '' })),
  };
}

function ejemplo() {
  const ind = nuevoIndicador('Venta de combustible (ejemplo)');
  ind.unidad = 'galones';
  const d = [[1000,820],[1000,910],[1100,1050],[1100,760],[1200,1180],[1200,1090],
             [1250,1260],[1250,980],[1300,1210],[1300,1105],[1350,''],[1400,'']];
  ind.meses = d.map(([meta, real]) => ({ meta: String(meta), real: String(real) }));
  return ind;
}

function valido(s) {
  return s && Array.isArray(s.indicadores) && s.indicadores.length &&
         s.indicadores.every((i) => i && Array.isArray(i.meses) && i.meses.length === 12);
}

function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (valido(s)) return s;
  } catch (e) { /* sin datos guardados */ }
  if (typeof DATOS_INICIALES !== 'undefined' && valido(DATOS_INICIALES)) return JSON.parse(JSON.stringify(DATOS_INICIALES));
  const e = ejemplo();
  return { indicadores: [e], actual: e.id };
}

function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* almacenamiento no disponible */ }
  if (typeof window.alGuardar === 'function') window.alGuardar(); // sincronización con la nube (nube.js)
}

let state = cargar();
const CONFIG_BASE = { empresa: '', logo: '', color: '#1f5fbf', corte: '' };
state.config = Object.assign({}, CONFIG_BASE, state.config || {});
const actual = () => state.indicadores.find((i) => i.id === state.actual) || state.indicadores[0];

/* =========================================================
   GRÁFICOS (SVG)
   ========================================================= */

/** Velocímetro: arco gris que se llena con el color del estado. v = 0.85 → 85 %, null = sin dato */
function gauge(v, ind) {
  const cx = 100, cy = 86, R = 66;
  const L1 = ind.lo / 100, L2 = ind.hi / 100;
  const ang = (x) => (225 - 270 * Math.min(Math.max(x, 0), 1)) * Math.PI / 180;
  const p = (x, r) => [cx + r * Math.cos(ang(x)), cy - r * Math.sin(ang(x))];
  const f = (n) => n.toFixed(2);
  const arc = (a, b) => {
    const [x1, y1] = p(a, R), [x2, y2] = p(b, R);
    return `M${f(x1)} ${f(y1)} A${R} ${R} 0 ${(b - a) * 270 > 180 ? 1 : 0} 1 ${f(x2)} ${f(y2)}`;
  };

  let s = `<svg viewBox="0 0 200 186" class="gauge" role="img" aria-label="Cumplimiento ${v == null ? 'sin dato' : fmt(v * 100, 1) + ' %'}">`;
  s += `<path d="${arc(0, 1)}" fill="none" stroke="#eceef2" stroke-width="13"/>`;
  if (v != null && v > 0.004) {
    s += `<path d="${arc(0, Math.min(v, 1))}" fill="none" stroke="${COL[estado(v, ind).c]}" stroke-width="13" pathLength="100" class="g-fill"/>`;
  }
  // Marcas de los rangos: desde dónde es "En riesgo" y desde dónde "En meta"
  [[L1, COL.amber], [L2, COL.green]].forEach(([x, c]) => {
    if (x >= 1) return;
    const [x1, y1] = p(x, R - 9), [x2, y2] = p(x, R + 9), [lx, ly] = p(x, R + 18);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="2.5"/>`;
    s += `<text x="${f(lx)}" y="${f(ly + 4)}" text-anchor="middle" font-size="10" fill="#9aa1ab">${fmt(x * 100)}</text>`;
  });
  for (let i = 0; i <= 20; i++) {
    const [x1, y1] = p(i / 20, R - 16), [x2, y2] = p(i / 20, R - 11);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#d5d9e0" stroke-width="1"/>`;
  }
  const [m1x, m1y] = p(1, R - 9), [m2x, m2y] = p(1, R + 9);
  s += `<line x1="${f(m1x)}" y1="${f(m1y)}" x2="${f(m2x)}" y2="${f(m2y)}" stroke="#1d2129" stroke-width="2.5"/>`;
  const [ax, ay] = p(0, R + 14), [bx, by] = p(1, R + 14);
  s += `<text x="${f(ax + 6)}" y="${f(ay + 8)}" text-anchor="middle" font-size="11" fill="#6b7280">0%</text>`;
  s += `<text x="${f(bx - 8)}" y="${f(by + 8)}" text-anchor="middle" font-size="11" font-weight="600" fill="#1d2129">Meta</text>`;

  if (v == null) {
    s += `<circle cx="${cx}" cy="${cy}" r="5" fill="#d5d9e0"/>`;
    s += `<text x="${cx}" y="178" text-anchor="middle" font-size="15" fill="#9aa1ab">Sin dato</text>`;
    return s + '</svg>';
  }
  const a = ang(v), L = 50, W = 3, T = 9;
  const tip = [cx + L * Math.cos(a), cy - L * Math.sin(a)];
  const tail = [cx - T * Math.cos(a), cy + T * Math.sin(a)];
  const px = Math.sin(a) * W, py = Math.cos(a) * W;
  s += `<g class="g-needle" style="--r:${(-270 * Math.min(Math.max(v, 0), 1)).toFixed(1)}deg"><polygon points="${f(tip[0])},${f(tip[1])} ${f(cx + px)},${f(cy + py)} ${f(tail[0])},${f(tail[1])} ${f(cx - px)},${f(cy - py)}" fill="#1d2129"/></g>`;
  s += `<circle cx="${cx}" cy="${cy}" r="5" fill="#1d2129"/><circle cx="${cx}" cy="${cy}" r="2" fill="#fff"/>`;
  s += `<text x="${cx}" y="180" text-anchor="middle" font-size="26" font-weight="600" fill="#1d2129">${fmt(v * 100, 1)}%</text>`;
  return s + '</svg>';
}

/** Número corto para etiquetas: 2.530 → 2,5k · 1.250.000 → 1,3 M */
function corto(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return fmt(n / 1e6, 1).replace(/,0$/, '') + ' M';
  if (a >= 1e4) return fmt(n / 1e3, 0) + 'k';
  if (a >= 1e3) return fmt(n / 1e3, 1).replace(/,0$/, '') + 'k';
  return fmt(n);
}

function pasoBonito(x) {
  if (!(x > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const r = x / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p;
}

/** Barras agrupadas: meta (gris) y real (color según estado) */
/** Cómo se muestran los datos en las barras: 'tabla' (debajo), 'barras' (encima de cada barra) o 'ninguno' */
let modoDatos = 'tabla';
try { const m = localStorage.getItem('tablero-modo-datos'); if (['tabla', 'barras', 'ninguno'].includes(m)) modoDatos = m; } catch (e) { /* sin almacenamiento */ }

function barras(datos, ind) {
  const tabla = modoDatos === 'tabla', encima = modoDatos === 'barras';
  const W = 960, H = tabla ? 366 : 320, pl = 84, pr = 16, pt = (encima || tabla) ? 34 : 20, pb = tabla ? 86 : 40;
  const vals = datos.flatMap((d) => [d.m, d.r, d.a]).filter((v) => v > 0);
  const max = vals.length ? Math.max(...vals) : 1;
  const paso = pasoBonito(max / 4);
  const tope = Math.ceil(max / paso) * paso;
  const alto = H - pt - pb;
  const h = (v) => alto * v / tope;
  const cw = (W - pl - pr) / 12, bw = Math.min(cw * 0.34, 28);

  let s = `<svg viewBox="0 0 ${W} ${H}" class="bars" role="img" aria-label="Meta y real por mes">`;
  for (let t = 0; t <= tope + paso / 1000; t += paso) {
    const y = pt + alto * (1 - t / tope);
    s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="#eceef2"/>`;
    s += `<text x="${pl - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#6b7280">${fmt(t)}</text>`;
  }
  if (tabla) s += `<rect x="${pl}" y="${H - pb + 44 + 18 - 14}" width="${W - pl - pr}" height="18" rx="4" fill="#f4f5f7"/>`;
  datos.forEach((d, i) => {
    const x0 = pl + cw * i + cw / 2;
    if (d.m > 0) {
      s += `<rect x="${x0 - bw - 2}" y="${H - pb - h(d.m)}" width="${bw}" height="${h(d.m)}" rx="3" fill="#c9ced6" class="bar" style="animation-delay:${i * 90}ms"><title>${MESES[i]} · Meta ${fmt(d.m)}</title></rect>`;
      if (tabla) s += `<text class="dato" x="${x0 - bw / 2 - 2}" y="${H - pb - h(d.m) - 6}" text-anchor="middle" font-size="10.5" fill="#8a919c" style="animation-delay:${i * 90 + 900}ms">${corto(d.m)}</text>`;
      if (encima) s += `<text class="dato" x="${x0 - 2}" y="${H - pb - h(d.m) - 6}" text-anchor="end" font-size="10.5" fill="#8a919c" style="animation-delay:${i * 90 + 900}ms">${fmt(d.m)}</text>`;
    }
    if (d.ok) {
      const e = estado(d.v, ind);
      s += `<rect x="${x0 + 2}" y="${H - pb - h(d.r)}" width="${bw}" height="${h(d.r)}" rx="3" fill="${COL[e.c]}" class="bar" style="animation-delay:${i * 90 + 250}ms"><title>${MESES[i]} · Real ${fmt(d.r)} (${fmt(d.v * 100, 1)} %)</title></rect>`;
      const ty = H - pb - h(d.r);
      if (tabla) s += `<text class="dato" x="${x0 + bw / 2 + 2}" y="${ty - 6}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${e.c === 'green' ? '#3b6d11' : e.c === 'amber' ? '#854f0b' : '#a32d2d'}" style="animation-delay:${i * 90 + 1000}ms">${corto(d.r)}</text>`;
      if (encima) s += `<text class="dato" x="${x0 + 2}" y="${ty - 17}" text-anchor="start" font-size="11.5" font-weight="700" fill="${e.c === 'green' ? '#3b6d11' : e.c === 'amber' ? '#854f0b' : '#a32d2d'}" style="animation-delay:${i * 90 + 1000}ms">${fmt(d.r)}</text>`;
      if (encima) s += `<text class="dato" x="${x0 + 2}" y="${ty - 5}" text-anchor="start" font-size="10" fill="#6b7280" style="animation-delay:${i * 90 + 1050}ms">${fmt(d.v * 100)}%</text>`;
    }
    s += `<text x="${x0}" y="${H - pb + 20}" text-anchor="middle" font-size="12" fill="#6b7280">${ABR[i]}</text>`;
    if (tabla) {
      const y1 = H - pb + 44, y2 = y1 + 18, y3 = y2 + 18, dl = i * 60 + 500;
      const col = d.ok ? { green: '#3b6d11', amber: '#854f0b', red: '#a32d2d' }[estado(d.v, ind).c] : '#9aa1ab';
      s += `<text class="dato" x="${x0}" y="${y1}" text-anchor="middle" font-size="11" fill="#6b7280" style="animation-delay:${dl}ms">${d.m > 0 ? fmt(d.m) : '—'}</text>`;
      s += `<text class="dato" x="${x0}" y="${y2}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${col}" style="animation-delay:${dl + 40}ms">${d.ok ? fmt(d.r) : '—'}</text>`;
      s += `<text class="dato" x="${x0}" y="${y3}" text-anchor="middle" font-size="11" font-weight="600" fill="${col}" style="animation-delay:${dl + 80}ms">${d.ok ? fmt(d.v * 100, 1) + '%' : '—'}</text>`;
    }
  });
  if (tabla) {
    const y1 = H - pb + 44, y2 = y1 + 18, y3 = y2 + 18;
    [['Meta', y1], ['Real', y2], ['Cumpl.', y3]].forEach(([t, y]) => {
      s += `<text x="${pl - 8}" y="${y}" text-anchor="end" font-size="11" font-weight="600" fill="#6b7280">${t}</text>`;
    });
  }
  // Año anterior: línea punteada con puntos
  const pts = datos.map((d, i) => d.a >= 0 ? [pl + cw * i + cw / 2, H - pb - h(d.a), d.a, i] : null).filter(Boolean);
  if (pts.length && datos.some((d) => d.a > 0)) {
    s += `<polyline points="${pts.map((q) => q[0] + ',' + q[1]).join(' ')}" fill="none" stroke="#5f6670" stroke-width="1.5" stroke-dasharray="4 4" class="fade-in" style="animation-delay:700ms"/>`;
    pts.forEach((q) => { s += `<circle cx="${q[0]}" cy="${q[1]}" r="3.5" fill="#fff" stroke="#5f6670" stroke-width="1.5" class="fade-in" style="animation-delay:800ms"><title>${MESES[q[3]]} · ${ind.anio - 1}: ${fmt(q[2])}</title></circle>`; });
  }
  s += `<line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="#c9ced6"/>`;
  return s + '</svg>';
}

/** Líneas de acumulado: real vs. meta (y año anterior) */
function acumulado(datos, ind) {
  const W = 960, H = 300, pl = 84, pr = 130, pt = 16, pb = 36;
  let am = 0, ar = 0, aa = 0, ultimo = -1;
  datos.forEach((d, i) => { if (!isNaN(d.r) && d.m > 0) ultimo = i; });
  const serie = datos.map((d, i) => {
    am += d.m > 0 ? d.m : 0;
    if (i <= ultimo) ar += !isNaN(d.r) ? d.r : 0;
    aa += d.a >= 0 ? d.a : 0;
    return { m: am, r: i <= ultimo ? ar : null, a: aa };
  });
  const tieneAnt = datos.some((d) => d.a > 0);
  const max = Math.max(1, ...serie.map((x) => Math.max(x.m, x.r || 0, tieneAnt ? x.a : 0)));
  const paso = pasoBonito(max / 4), tope = Math.ceil(max / paso) * paso;
  const alto = H - pt - pb, cw = (W - pl - pr) / 11;
  const X = (i) => pl + cw * i, Y = (v) => pt + alto * (1 - v / tope);
  const accent = '#f26b1d'; // naranja cálido del acumulado

  let s = `<svg viewBox="0 0 ${W} ${H}" class="bars" role="img" aria-label="Acumulado real vs. meta"><defs><linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity="0.38"/><stop offset="1" stop-color="${accent}" stop-opacity="0.03"/></linearGradient></defs>`;
  for (let t = 0; t <= tope + paso / 1000; t += paso) {
    s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="#eceef2"/>`;
    s += `<text x="${pl - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="#6b7280">${fmt(t)}</text>`;
  }
  ABR.forEach((m, i) => { s += `<text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="#6b7280">${m}</text>`; });
  const linea = (vals, color, extra) =>
    `<polyline class="${/dasharray/.test(extra) ? 'fade-in' : 'draw'}" ${/dasharray/.test(extra) ? '' : 'pathLength="1"'} points="${vals.map((v, i) => v == null ? null : X(i) + ',' + Y(v)).filter(Boolean).join(' ')}" fill="none" stroke="${color}" ${extra}/>`;

  if (tieneAnt) {
    s += linea(serie.map((x) => x.a), '#7c5cc4', 'stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"');
    serie.forEach((x, i) => { s += `<circle cx="${X(i)}" cy="${Y(x.a)}" r="3" fill="#fff" stroke="#7c5cc4" stroke-width="1.8" class="fade-in" style="animation-delay:${300 + i * 60}ms"><title>${MESES[i]} · ${ind.anio - 1} acumulado ${fmt(x.a)}</title></circle>`; });
  }
  s += linea(serie.map((x) => x.m), '#5f6670', 'stroke-width="2" stroke-dasharray="6 5"');

  if (ultimo >= 0) {
    const ptsR = serie.slice(0, ultimo + 1).map((x, i) => X(i) + ',' + Y(x.r));
    s += `<polygon points="${X(0)},${Y(0)} ${ptsR.join(' ')} ${X(ultimo)},${Y(0)}" fill="url(#gradAcum)" class="fade-in" style="animation-delay:900ms"/>`;
    s += linea(serie.map((x) => x.r), accent, 'stroke-width="3" stroke-linejoin="round"');
    serie.slice(0, ultimo + 1).forEach((x, i) => {
      s += `<circle cx="${X(i)}" cy="${Y(x.r)}" r="4" fill="${accent}" stroke="#fff" stroke-width="1.5" class="fade-in" style="animation-delay:${400 + i * 80}ms"><title>${MESES[i]} · Real acumulado ${fmt(x.r)} · Meta acumulada ${fmt(x.m)}</title></circle>`;
      if (i !== ultimo) s += `<text class="dato" x="${X(i)}" y="${Y(x.r) - 10}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${accent}" style="animation-delay:${700 + i * 80}ms">${fmt(x.r)}</text>`;
    });
    const u = serie[ultimo], brecha = u.r - u.m;
    s += `<text x="${X(ultimo) + 10}" y="${Y(u.r) + 4}" font-size="12" font-weight="600" fill="${accent}">${fmt(u.r)}</text>`;
    s += `<text x="${X(ultimo) + 10}" y="${Y(u.r) + 20}" font-size="11" fill="${brecha >= 0 ? '#3b6d11' : '#a32d2d'}">${brecha >= 0 ? '+' : ''}${fmt(brecha)} vs. meta</text>`;
  }
  const uM = serie[11];
  if (tieneAnt) {
    let ya = Y(uM.a) + 4;
    if (Math.abs(ya - (Y(uM.m) + 4)) < 14) ya += ya >= Y(uM.m) + 4 ? 13 : -13;
    s += `<text x="${X(11) + 8}" y="${ya}" font-size="11" font-weight="600" fill="#7c5cc4">${ind.anio - 1} ${fmt(uM.a)}</text>`;
  }
  s += `<text x="${X(11) + 8}" y="${Y(uM.m) + 4}" font-size="11" fill="#5f6670">Meta ${fmt(uM.m)}</text>`;
  return s + '</svg>';
}

/** Variación contra el año anterior en los mismos meses que tienen real */
function variacion(datos) {
  let r = 0, a = 0, n = 0;
  datos.forEach((d) => { if (d.ok && d.a > 0) { r += d.r; a += d.a; n++; } });
  return n && a > 0 ? r / a - 1 : null;
}

const fmtVar = (x) => x == null ? '—' : (x > 0 ? '+' : '') + fmt(x * 100, 1) + '%';
const clsVar = (x) => x == null ? '' : x >= 0 ? 'txt-green' : 'txt-red';


/* =========================================================
   SECCIÓN 1: INGRESAR DATOS
   ========================================================= */

function renderSelect() {
  const s = $('#selIndicador');
  s.innerHTML = state.indicadores
    .map((i) => `<option value="${i.id}">${esc(i.nombre)} · ${esc(i.anio)}</option>`)
    .join('');
  s.value = actual().id;
}

function renderCaptura() {
  const ind = actual();
  renderSelect();
  $('#nombre').value = ind.nombre;
  $('#anio').value = ind.anio;
  $('#unidad').value = ind.unidad;
  $('#lo').value = ind.lo;
  $('#hi').value = ind.hi;
  $('#errRangos').textContent = '';
  $('#thAnt').textContent = `Real ${Number(ind.anio) - 1 || 'año anterior'}`;

  $('#tablaMeses').innerHTML = MESES.map((m, i) => `
    <tr>
      <td>${m}</td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-k="meta" value="${esc(ind.meses[i].meta)}" aria-label="Meta ${m}"></td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-k="real" value="${esc(ind.meses[i].real)}" aria-label="Real ${m}"></td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-k="ant" value="${esc(ind.meses[i].ant ?? '')}" aria-label="Año anterior ${m}"></td>
      <td id="c${i}"></td>
    </tr>`).join('');
  actualizarFilas();
}

function actualizarFilas() {
  const ind = actual();
  ind.meses.forEach((x, i) => {
    const m = num(x.meta), r = num(x.real), td = $('#c' + i);
    const inMeta = document.querySelector(`input[data-i="${i}"][data-k="meta"]`);
    const inReal = document.querySelector(`input[data-i="${i}"][data-k="real"]`);
    const malMeta = x.meta !== '' && isNaN(m);
    const malReal = x.real !== '' && isNaN(r);
    inMeta.style.borderColor = malMeta ? 'var(--red)' : '';
    inReal.style.borderColor = malReal ? 'var(--red)' : '';

    if (malMeta || malReal) {
      td.innerHTML = '<span class="txt-red" style="font-size:13px">Revisa el número</span>';
    } else if (m > 0 && r >= 0) {
      const v = r / m, e = estado(v, ind);
      td.innerHTML = `<span class="pill ${e.c}">${fmt(v * 100, 1)}% · ${e.t}</span>`;
    } else {
      td.innerHTML = '<span class="muted">—</span>';
    }
  });
}

/* Cambios en la tabla */
$('#tablaMeses').addEventListener('input', (e) => {
  const el = e.target;
  if (!el.dataset.k) return;
  actual().meses[+el.dataset.i][el.dataset.k] = el.value.trim();
  guardar();
  actualizarFilas();
});

/* Cambios en los datos del indicador */
['nombre', 'anio', 'unidad'].forEach((id) => {
  $('#' + id).addEventListener('input', (e) => {
    actual()[id] = e.target.value;
    guardar();
    renderSelect();
    if (id === 'anio') $('#thAnt').textContent = `Real ${Number(e.target.value) - 1 || 'año anterior'}`;
  });
});

['lo', 'hi'].forEach((id) => {
  $('#' + id).addEventListener('input', () => {
    const lo = num($('#lo').value), hi = num($('#hi').value);
    if (!(lo > 0 && hi > lo && hi <= 100)) {
      $('#errRangos').textContent = 'El valor de "En meta" debe ser mayor que el de "En riesgo" y no pasar de 100.';
      return;
    }
    $('#errRangos').textContent = '';
    actual().lo = lo;
    actual().hi = hi;
    guardar();
    actualizarFilas();
  });
});

/* Indicadores */
$('#selIndicador').addEventListener('change', (e) => {
  state.actual = e.target.value;
  guardar();
  renderCaptura();
});

$('#btnNuevo').addEventListener('click', () => {
  const ind = nuevoIndicador();
  state.indicadores.push(ind);
  state.actual = ind.id;
  guardar();
  renderCaptura();
  $('#nombre').focus();
  $('#nombre').select();
  toast('Indicador creado. Ponle nombre y llena sus meses.');
});

$('#btnEliminar').addEventListener('click', (ev) => confirmar(ev.currentTarget, '¿Seguro? Clic otra vez', () => {
  const ind = actual();
  state.indicadores = state.indicadores.filter((i) => i.id !== ind.id);
  if (!state.indicadores.length) state.indicadores.push(nuevoIndicador());
  state.actual = state.indicadores[0].id;
  guardar();
  renderCaptura();
  toast('Indicador eliminado');
}));

$('#btnNuevoAnio').addEventListener('click', (ev) => {
  const sig = Number(listaAnios().slice(-1)[0]) + 1;
  confirmar(ev.currentTarget, `¿Crear ${sig} con todas las áreas? Clic otra vez`, () => {
    const base = state.indicadores.filter((i) => Number(i.anio) === sig - 1);
    let creados = 0;
    base.forEach((b) => {
      if (state.indicadores.some((i) => i.nombre === b.nombre && Number(i.anio) === sig)) return;
      const n = nuevoIndicador(b.nombre);
      Object.assign(n, { anio: sig, unidad: b.unidad, lo: b.lo, hi: b.hi,
        meses: b.meses.map((x) => ({ meta: x.meta, real: '', ant: '' })) });
      state.indicadores.push(n);
      if (!creados) state.actual = n.id;
      creados++;
    });
    anioSel = String(sig);
    guardar();
    renderCaptura();
    toast(creados ? `Año ${sig} creado con ${creados} áreas. Las metas se copiaron; ajústalas y llena el real.` : `El año ${sig} ya existe.`);
  });
});

/* Pegar desde Excel */
$('#btnAplicar').addEventListener('click', () => {
  const err = $('#errPegar');
  const filas = $('#pegar').value.split(/\r?\n/).filter((f) => f.trim());
  if (!filas.length) { err.textContent = 'Pega primero las filas de tu Excel.'; return; }

  const ind = actual();
  let siguiente = 0, aplicadas = 0;
  filas.forEach((fila) => {
    const celdas = fila.split(/\t|;/).map((c) => c.trim());
    const nums = celdas.filter((c) => !isNaN(num(c)));
    if (!nums.length) return; // encabezados u otras filas sin números

    const nombre = (celdas[0] || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let idx = MESES.findIndex((m) => nombre.startsWith(m.slice(0, 3).toLowerCase()));
    if (idx === -1) idx = siguiente;
    if (idx > 11) return;

    ind.meses[idx].meta = String(num(nums[0]));
    ind.meses[idx].real = nums.length > 1 ? String(num(nums[1])) : '';
    if (nums.length > 2) ind.meses[idx].ant = String(num(nums[2]));
    siguiente = idx + 1;
    aplicadas++;
  });

  if (!aplicadas) { err.textContent = 'No encontré números. Revisa que haya columnas de meta y real.'; return; }
  err.textContent = '';
  $('#pegar').value = '';
  guardar();
  renderCaptura();
  toast(`Listo: ${aplicadas} ${aplicadas === 1 ? 'mes cargado' : 'meses cargados'}`);
});
$('#pegar').addEventListener('input', () => { $('#errPegar').textContent = ''; });

$('#btnLimpiar').addEventListener('click', (ev) => confirmar(ev.currentTarget, '¿Borrar los 12 meses? Clic otra vez', () => {
  actual().meses = Array.from({ length: 12 }, () => ({ meta: '', real: '', ant: '' }));
  guardar();
  renderCaptura();
  toast('Meses borrados');
}));

/* Respaldo */
$('#btnExportar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo-tablero-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Respaldo descargado');
});

$('#btnCopiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(state));
    toast('Respaldo copiado. Pégalo en un bloc de notas y guárdalo.');
  } catch {
    $('#txtRespaldo').value = JSON.stringify(state);
    $('#txtRespaldo').select();
    toast('Copia el texto del recuadro y guárdalo.');
  }
});

function cargarRespaldo(texto) {
  try {
    const s = JSON.parse(texto);
    if (!valido(s)) throw new Error();
    if (!s.indicadores.some((i) => i.id === s.actual)) s.actual = s.indicadores[0].id;
    state = s;
    state.config = Object.assign({}, CONFIG_BASE, state.config || {});
    aplicarMarca();
    guardar();
    renderCaptura();
    $('#errImportar').textContent = '';
    toast('Respaldo cargado');
    return true;
  } catch {
    $('#errImportar').textContent = 'Eso no es un respaldo válido de este tablero.';
    return false;
  }
}

$('#btnCargarTexto').addEventListener('click', () => {
  const t = $('#txtRespaldo').value.trim();
  if (!t) { $('#errImportar').textContent = 'Pega primero el texto del respaldo.'; return; }
  if (cargarRespaldo(t)) $('#txtRespaldo').value = '';
});

$('#fileImportar').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { cargarRespaldo(reader.result); e.target.value = ''; };
  reader.readAsText(file);
});


/* =========================================================
   IMPORTAR EXCEL
   Busca en todas las hojas tablas con meses (ENE…DIC) y una
   columna "Meta". El real es la columna justo a la izquierda.
   ========================================================= */
const MES3 = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const mesIdx = (v) => typeof v === 'string' ? MES3.indexOf(v.trim().toUpperCase().slice(0, 3)) : -1;
const txt = (v) => (v == null ? '' : String(v)).trim();

function limpiarTitulo(t) {
  let s = txt(t).replace(/^hist[oó]rico\s+(de\s+)?/i, '');
  let unidad = '';
  const m = s.match(/\(([^)]*)\)/);
  if (m) { unidad = m[1].trim().toLowerCase(); s = s.replace(m[0], ''); }
  s = s.replace(/[\s\-–]+$/, '').replace(/\s*-\s*/g, ' – ').replace(/\s+/g, ' ').trim().toLowerCase();
  s = s.charAt(0).toUpperCase() + s.slice(1);
  s = s.replace(/\bcps\b/g, 'CPS').replace(/\bcafe\b/g, 'café').replace(/\bhumedo\b/g, 'húmedo')
       .replace(/\bproduccion\b/g, 'producción').replace(/^produccion/i, 'Producción').replace(/\bexportacion/g, 'exportación');
  unidad = unidad.replace(/(\d+)\s*kg/, 'de $1 kg');
  return { nombre: s, unidad };
}

function leerLibro(wb) {
  const encontrados = [];
  wb.SheetNames.forEach((hoja) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, raw: true, defval: null });
    rows.forEach((row, r) => {
      if (!row || mesIdx(rows[r + 1] && rows[r + 1][0]) !== 0) return;
      const cMeta = row.findIndex((v, c) => c > 1 && /^meta/i.test(txt(v)));
      if (cMeta < 0) return;
      const cReal = cMeta - 1;

      // Título: la fila de texto más cercana hacia arriba
      let titulo = '';
      for (let k = r - 1; k >= Math.max(0, r - 4); k--) {
        const a = txt(rows[k] && rows[k][0]);
        if (a && a.length > 8 && mesIdx(a) < 0 && !/^total/i.test(a)) { titulo = a; break; }
      }
      if (!titulo) titulo = `${hoja} fila ${r + 1}`;
      const { nombre, unidad: u1 } = limpiarTitulo(titulo);

      const hReal = txt(row[cReal]), hMeta = txt(row[cMeta]);
      let unidad = u1;
      if (!unidad) unidad = /kg/i.test(hReal + hMeta) ? 'kg' : /s\/s|saco/i.test(hReal) ? 'sacos' : /lb/i.test(hReal + hMeta) ? 'lb' : '';
      const anioM = (hReal.match(/(19|20)\d{2}/) || [])[0] || (typeof row[cReal] === 'number' ? row[cReal] : '');
      const anio = anioM ? Number(anioM) : new Date().getFullYear();

      // Columna del año anterior: la última antes del real cuyo encabezado sea ese año
      let cAnt = -1;
      for (let c = cReal - 1; c >= 1; c--) {
        const hv = txt(row[c]);
        if (hv === String(anio - 1) || new RegExp('\\b' + (anio - 1) + '\\b').test(hv)) { cAnt = c; break; }
      }

      const meses = Array.from({ length: 12 }, () => ({ meta: '', real: '', ant: '' }));
      for (let k = r + 1; k <= r + 14 && k < rows.length; k++) {
        const i = mesIdx(rows[k] && rows[k][0]);
        if (i < 0) continue;
        const m = Number(rows[k][cMeta]), v = Number(rows[k][cReal]);
        meses[i].meta = isFinite(m) && m > 1 ? String(+m.toFixed(2)) : '';
        meses[i].real = isFinite(v) && rows[k][cReal] !== null && rows[k][cReal] !== '' ? String(+v.toFixed(2)) : '';
        if (cAnt >= 0) { const an = Number(rows[k][cAnt]); meses[i].ant = isFinite(an) && rows[k][cAnt] !== null ? String(+an.toFixed(2)) : ''; }
      }
      // Los meses en cero al final del año se toman como pendientes
      let ultimo = -1;
      meses.forEach((x, i) => { if (Number(x.real) > 0) ultimo = i; });
      meses.forEach((x, i) => { if (i > ultimo) x.real = ''; });

      encontrados.push({ nombre, unidad, anio, meses });
    });
  });
  return encontrados;
}

function importarExcel(file) {
  const err = $('#errExcel');
  if (typeof XLSX === 'undefined') {
    err.textContent = 'No se pudo cargar el lector de Excel. Revisa tu conexión a internet y vuelve a intentar.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
      const tablas = leerLibro(wb);
      if (!tablas.length) {
        err.textContent = 'No encontré tablas con meses (ENE a DIC) y una columna "Meta". Revisa el archivo.';
        return;
      }
      state.indicadores = state.indicadores.filter((i) => !/\(ejemplo\)$/.test(i.nombre));
      let nuevos = 0, actualizados = 0;
      tablas.forEach((t) => {
        const ex = state.indicadores.find((i) => i.nombre === t.nombre && String(i.anio) === String(t.anio));
        if (ex) { ex.meses = t.meses; ex.unidad = ex.unidad || t.unidad; actualizados++; }
        else { const n = nuevoIndicador(t.nombre); Object.assign(n, t); state.indicadores.push(n); nuevos++; }
      });
      if (!state.indicadores.some((i) => i.id === state.actual)) state.actual = state.indicadores[0].id;
      err.textContent = '';
      guardar();
      renderCaptura();
      toast(`Excel cargado: ${actualizados} actualizados, ${nuevos} nuevos`);
    } catch (e) {
      err.textContent = 'No pude leer ese archivo. Asegúrate de que sea un Excel (.xlsx o .xls).';
    }
  };
  reader.readAsArrayBuffer(file);
}

$('#fileExcel').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) importarExcel(f);
  e.target.value = '';
});

/* =========================================================
   SECCIÓN 2: INFORME
   ========================================================= */

let vistaInforme = 'resumen';

/* ---------- Año seleccionado (informe y Por mes) ---------- */
let anioSel = null;
const listaAnios = () => [...new Set(state.indicadores.map((i) => String(i.anio)))].sort();
function anioActivo() {
  const a = listaAnios();
  if (!a.includes(String(anioSel))) anioSel = a[a.length - 1];
  return anioSel;
}
const delAnio = () => state.indicadores.filter((i) => String(i.anio) === String(anioActivo()));

function renderAnioSelect() {
  const s = $('#selAnio');
  s.innerHTML = listaAnios().map((a) => `<option value="${a}">${a}</option>`).join('');
  s.value = anioActivo();
  const lista = delAnio();
  if (!lista.some((i) => i.id === state.actual)) state.actual = lista[0].id;
}

$('#selAnio').addEventListener('change', (e) => {
  anioSel = e.target.value;
  mesSel = null;
  const lista = delAnio();
  if (!lista.some((i) => i.id === state.actual)) state.actual = lista[0].id;
  if ($('#porMes').classList.contains('active')) renderMes(); else renderInforme();
});

function calcular(ind) {
  const prev = state.indicadores.find((p) => p.nombre === ind.nombre && Number(p.anio) === Number(ind.anio) - 1);
  let tm = 0, tr = 0, enMeta = 0, conDato = 0, metaAnual = 0;
  const datos = ind.meses.map((x, i) => {
    const m = num(x.meta), r = num(x.real);
    let a = num(x.ant);
    if (isNaN(a) && prev) a = num(prev.meses[i].real);
    if (m > 0) metaAnual += m;
    const ok = m > 0 && r >= 0;
    if (ok) {
      tm += m; tr += r; conDato++;
      if (r / m >= ind.hi / 100) enMeta++;
    }
    return { m, r, a, ok, v: ok ? r / m : null };
  });
  return { datos, tm, tr, enMeta, conDato, metaAnual,
           total: tm > 0 ? tr / tm : null,
           avance: metaAnual > 0 ? tr / metaAnual : null,
           vari: variacion(datos) };
}

function renderChips() {
  const chips = [`<button class="chip ${vistaInforme === 'resumen' ? 'active' : ''}" data-chip="resumen">Resumen general</button>`]
    .concat(delAnio().map((i) =>
      `<button class="chip ${vistaInforme === 'detalle' && i.id === state.actual ? 'active' : ''}" data-chip="${i.id}">${esc(i.nombre)}</button>`));
  $('#chips').innerHTML = chips.join('');
}

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-chip]');
  if (!b) return;
  if (b.dataset.chip === 'resumen') vistaInforme = 'resumen';
  else { vistaInforme = 'detalle'; state.actual = b.dataset.chip; guardar(); }
  renderInforme();
});

function corteAuto() {
  let ultimo = -1, anio = '';
  delAnio().forEach((ind) => ind.meses.forEach((x, i) => {
    if (x.real !== '' && !isNaN(num(x.real)) && num(x.meta) > 0 && i > ultimo) { ultimo = i; anio = ind.anio; }
  }));
  return ultimo >= 0 ? `${MESES[ultimo]} ${anio}` : '';
}

function renderEncabezado() {
  const cfg = state.config;
  const corte = cfg.corte || corteAuto();
  $('#repLogo').innerHTML = cfg.logo ? `<img src="${cfg.logo}" alt="Logo">` : '';
  $('#repEmpresa').textContent = cfg.empresa || 'Informe de cumplimiento de metas';
  $('#repCorte').textContent = [cfg.empresa ? 'Informe de cumplimiento de metas' : '', corte ? `Corte: ${corte}` : ''].filter(Boolean).join(' · ');
}

function renderInforme() {
  renderAnioSelect();
  renderEncabezado();
  renderChips();
  $('#vistaResumen').style.display = vistaInforme === 'resumen' ? '' : 'none';
  $('#vistaDetalle').style.display = vistaInforme === 'detalle' ? '' : 'none';
  if (vistaInforme === 'resumen') renderResumen();
  else renderDetalle();
}

/** Mini-gráfica del año: una barra por mes, coloreada por estado; el mes elegido queda resaltado */
function spark(ds, ind, sel) {
  const W = 96, H = 28, bw = 5, gap = 3, cap = 1.2;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="spark" role="img" aria-label="Cumplimiento mes a mes">`;
  const y100 = H - (1 / cap) * (H - 2);
  s += `<line x1="0" x2="${W}" y1="${y100.toFixed(1)}" y2="${y100.toFixed(1)}" stroke="#c9ced6" stroke-dasharray="2 2"/>`;
  ds.forEach((d, i) => {
    const x = i * (bw + gap);
    if (i === sel) s += `<rect x="${x - 1.5}" y="0" width="${bw + 3}" height="${H}" rx="3" fill="#1d2129" opacity=".07"/>`;
    if (!d.ok) { s += `<rect x="${x}" y="${H - 2}" width="${bw}" height="2" rx="1" fill="#d5d9e0"/>`; return; }
    const hh = Math.max(2, Math.min(d.v, cap) / cap * (H - 2));
    s += `<rect x="${x}" y="${(H - hh).toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}" rx="1.5" fill="${COL[estado(d.v, ind).c]}" opacity="${i === sel ? 1 : .55}"><title>${MESES[i]} · ${fmt(d.v * 100, 1)} %</title></rect>`;
  });
  return s + '</svg>';
}

const ICONO = { green: '✓', amber: '!', red: '✕' };

/* ---------- Vista por mes: todas las áreas del mes elegido ---------- */
let mesSel = null;

function ultimoMesConDato() {
  let u = -1;
  delAnio().forEach((ind) => ind.meses.forEach((x, i) => {
    if (x.real !== '' && !isNaN(num(x.real)) && num(x.meta) > 0 && i > u) u = i;
  }));
  return u >= 0 ? u : 0;
}

function renderMes() {
  renderAnioSelect();
  if (mesSel == null) mesSel = ultimoMesConDato();
  $('#selMes').innerHTML = MESES.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  $('#selMes').value = mesSel;

  const anios = anioActivo();
  $('#mesSub').textContent = `${MESES[mesSel]} ${anios} · Meta vs. real de cada área`;
  const cfg = state.config;
  $('#pmLogo').innerHTML = cfg.logo ? `<img src="${cfg.logo}" alt="">` : '';
  $('#pmEmpresa').textContent = cfg.empresa || 'Informe de cumplimiento de metas';
  $('#pmTitulo').textContent = `Cumplimiento de ${MESES[mesSel]} ${anios} · todas las áreas`;
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  $('#pmFecha').textContent = `Generado el ${hoy}`;
  $('#pmPie').textContent = `${cfg.empresa ? cfg.empresa + ' · ' : ''}Tablero de cumplimiento · ${MESES[mesSel]} ${anios}`;

  let enMeta = 0, enRiesgo = 0, bajo = 0;
  const filas = delAnio().map((ind) => {
    const cc = calcular(ind);
    const d = cc.datos[mesSel];
    // Mes anterior: el mes de antes del mismo año; en enero, diciembre del año anterior
    let p = null;
    if (mesSel > 0) p = cc.datos[mesSel - 1];
    else {
      const pi = state.indicadores.find((x) => x.nombre === ind.nombre && Number(x.anio) === Number(ind.anio) - 1);
      if (pi) p = calcular(pi).datos[11];
    }
    const e = d.ok ? estado(d.v, ind) : null;
    if (e) { if (e.c === 'green') enMeta++; else if (e.c === 'amber') enRiesgo++; else bajo++; }
    return { ind, d, e, p, ds: cc.datos };
  });
  $('#mEnMeta').textContent = enMeta;
  $('#mRiesgo').textContent = enRiesgo;
  $('#mBajo').textContent = bajo;

  const orden = filas.slice().sort((a, b) => (b.d.ok ? b.d.v : -1) - (a.d.ok ? a.d.v : -1));
  const maxV = Math.max(1.2, ...orden.filter((f) => f.d.ok).map((f) => f.d.v));
  const tick = (100 / (maxV * 100) * 100).toFixed(2);
  $('#tablaMes').innerHTML = `<thead><tr><th>Área</th><th class="num">Meta</th><th class="num">Real</th><th class="num">Diferencia</th><th class="num">vs. ${MESES[(mesSel + 11) % 12].toLowerCase()}</th><th>Tendencia del año</th><th class="cum-th">Cumplimiento</th></tr></thead><tbody>` +
    orden.map(({ ind, d, e, p, ds }) => {
      const dif = d.ok ? d.r - d.m : null;
      let delta = '<span class="muted">—</span>';
      if (d.ok && p && p.ok) {
        const pts = (d.v - p.v) * 100;
        const igual = Math.abs(pts) < 0.05;
        const cls = igual ? 'flat' : pts > 0 ? 'up' : 'down';
        delta = `<span class="delta ${cls}">${igual ? '＝' : pts > 0 ? '▲' : '▼'} ${igual ? '0,0' : (pts > 0 ? '+' : '') + fmt(pts, 1)} pts</span><small class="unit-line">antes ${fmt(p.v * 100, 1)} %</small>`;
      }
      const cum = e
        ? `<div class="cum"><div class="cum-top"><strong>${fmt(d.v * 100, 1)} %</strong><span class="pill ${e.c}">${e.t}</span></div>
             <div class="cum-track"><span class="cum-fill" style="width:${(d.v / maxV * 100).toFixed(2)}%;background:${COL[e.c]}"></span><span class="cum-tick" style="left:${tick}%"></span></div></div>`
        : '<span class="pill gray">Sin real aún</span>';
      return `<tr class="${e ? '' : 'sin'}" style="--c:${e ? COL[e.c] : 'transparent'}">
        <td class="area"><div class="area-wrap"><span class="ico ${e ? e.c : 'gray'}">${e ? ICONO[e.c] : '…'}</span><div><button class="link-btn" data-abrir="${ind.id}">${esc(ind.nombre)}</button>${ind.unidad ? `<small class="unit-line">${esc(ind.unidad)}</small>` : ''}</div></div></td>
        <td class="num" data-l="Meta">${d.m > 0 ? fmt(d.m) : '—'}</td>
        <td class="num real" data-l="Real">${!isNaN(d.r) ? fmt(d.r) : '—'}</td>
        <td class="num ${dif == null ? '' : dif >= 0 ? 'txt-green' : 'txt-red'}" data-l="Diferencia">${dif == null ? '—' : (dif > 0 ? '+' : '') + fmt(dif)}</td>
        <td class="num" data-l="vs. mes anterior">${delta}</td>
        <td class="trend" data-l="Tendencia">${spark(ds, ind, mesSel)}</td>
        <td class="cum-td">${cum}</td>
      </tr>`;
    }).join('') + '</tbody>';

  $('#gridMes').innerHTML = filas.map(({ ind, d, e }) => `
    <button class="month res-card" data-abrir="${ind.id}">
      <div class="month-head"><strong>${esc(ind.nombre)}</strong></div>
      <div class="res-meta">${e ? `<span class="pill ${e.c}">${e.t}</span>` : '<span class="pill gray">Sin real aún</span>'}<span>${esc(ind.unidad)}</span></div>
      ${gauge(d.v, ind)}
      <div class="month-foot">
        <span>Meta: ${d.m > 0 ? fmt(d.m) : '—'}</span>
        <span>Real: ${!isNaN(d.r) ? fmt(d.r) : '—'}</span>
      </div>
    </button>`).join('');
}

$('#btnPdfMes').addEventListener('click', () => {
  const titulo = document.title;
  document.title = `Informe ${MESES[mesSel]} ${anioActivo()}${state.config.empresa ? ' - ' + state.config.empresa : ''}`; // nombre sugerido del PDF
  const restaurar = () => { document.title = titulo; window.removeEventListener('afterprint', restaurar); };
  window.addEventListener('afterprint', restaurar);
  try { window.print(); } catch (e) { restaurar(); }
  toast('En la ventana de impresión elige "Guardar como PDF" como destino.');
});

$('#selMes').addEventListener('change', (e) => { mesSel = +e.target.value; renderMes(); });

function renderResumen() {
  const anios = anioActivo();
  $('#resSub').textContent = `Año ${anios} · Cumplimiento acumulado a la fecha de cada sección`;
  let enMeta = 0, enRiesgo = 0, bajo = 0;
  const calc = delAnio().map((ind) => ({ ind, c: calcular(ind) }));
  renderRanking(calc);
  renderSemaforo(calc);
  $('#resGrid').innerHTML = calc.map(({ ind, c }) => {
    const e = c.total != null ? estado(c.total, ind) : null;
    if (e) { if (e.c === 'green') enMeta++; else if (e.c === 'amber') enRiesgo++; else bajo++; }
    const pill = e ? `<span class="pill ${e.c}">${e.t}</span>` : '<span class="pill gray">Sin datos</span>';
    return `
      <button class="month res-card" data-abrir="${ind.id}">
        <div class="month-head"><strong>${esc(ind.nombre)}</strong></div>
        <div class="res-meta">${pill}<span>${ind.unidad ? esc(ind.unidad) : ''}</span></div>
        ${gauge(c.total, ind)}
        <div class="month-foot">
          <span>Real: ${c.conDato ? fmt(c.tr) : '—'}</span>
          <span>Meta a la fecha: ${c.conDato ? fmt(c.tm) : '—'}</span>
        </div>
        <div class="month-foot" style="border-top:0;padding-top:2px">
          <span>Avance meta anual</span><strong style="color:var(--text)">${c.avance != null ? fmt(c.avance * 100, 1) + '%' : '—'}</strong>
        </div>
        <div class="month-foot" style="border-top:0;padding-top:0">
          <span>vs. ${ind.anio - 1} (mismos meses)</span><strong class="${clsVar(c.vari)}">${fmtVar(c.vari)}</strong>
        </div>
      </button>`;
  }).join('');
  $('#rEnMeta').textContent = enMeta;
  $('#rRiesgo').textContent = enRiesgo;
  $('#rBajo').textContent = bajo;
}

function renderRanking(calc) {
  const lista = calc.filter((x) => x.c.total != null).sort((a, b) => b.c.total - a.c.total);
  const sinDato = calc.filter((x) => x.c.total == null);
  const escala = Math.max(1, ...lista.map((x) => x.c.total)) * 1.02;
  const metaPos = (100 / escala).toFixed(2);
  $('#ranking').innerHTML = lista.map(({ ind, c }, k) => {
    const e = estado(c.total, ind);
    return `
      <button class="rank-row" data-abrir="${ind.id}">
        <span class="rank-pos">${k + 1}</span>
        <span class="rank-name">${esc(ind.nombre)}</span>
        <span class="rank-track">
          <span class="rank-bar" style="width:${(c.total / escala * 100).toFixed(2)}%;background:${COL[e.c]}"></span>
          <span class="rank-meta" style="left:${metaPos}%"></span>
        </span>
        <span class="rank-val">${fmt(c.total * 100, 1)}%</span>
        <span class="rank-var ${clsVar(c.vari)}">${fmtVar(c.vari)}</span>
      </button>`;
  }).join('') + sinDato.map(({ ind }) => `
      <button class="rank-row" data-abrir="${ind.id}">
        <span class="rank-pos">—</span><span class="rank-name">${esc(ind.nombre)}</span>
        <span class="rank-track"></span><span class="rank-val muted">Sin datos</span><span class="rank-var"></span>
      </button>`).join('');
  const anios = Number(anioActivo()) - 1;
  $('#rankHead').innerHTML = `<span></span><span>Sección</span>
    <span class="rank-track rank-axis"><span class="rank-meta-lbl" style="left:${metaPos}%">Meta 100%</span></span>
    <span class="rank-val">A la fecha</span><span class="rank-var">vs. ${anios}</span>`;
}

function renderSemaforo(calc) {
  const head = `<thead><tr><th class="h-name">Sección</th>${ABR.map((m) => `<th>${m}</th>`).join('')}<th class="h-tot">A la fecha</th></tr></thead>`;
  const body = calc.map(({ ind, c }) => {
    const celdas = c.datos.map((d, i) => {
      if (!d.ok) return `<td class="h-cell h-none" title="${MESES[i]}: pendiente">·</td>`;
      const e = estado(d.v, ind);
      return `<td class="h-cell h-${e.c}" title="${esc(ind.nombre)} · ${MESES[i]}: real ${fmt(d.r)} de meta ${fmt(d.m)}">${fmt(d.v * 100)}%</td>`;
    }).join('');
    const et = c.total != null ? estado(c.total, ind) : null;
    const tot = et ? `<td class="h-cell h-tot h-${et.c}">${fmt(c.total * 100, 1)}%</td>` : '<td class="h-cell h-tot h-none">—</td>';
    return `<tr><th class="h-name"><button data-abrir="${ind.id}">${esc(ind.nombre)}</button></th>${celdas}${tot}</tr>`;
  }).join('');
  $('#semaforo').innerHTML = head + `<tbody>${body}</tbody>`;
}

['#ranking', '#semaforo', '#tablaMes', '#gridMes'].forEach((sel) => $(sel).addEventListener('click', (e) => {
  const b = e.target.closest('[data-abrir]');
  if (!b) return;
  state.actual = b.dataset.abrir;
  vistaInforme = 'detalle';
  guardar();
  mostrar('informe');
}));


$('#resGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-abrir]');
  if (!b) return;
  state.actual = b.dataset.abrir;
  vistaInforme = 'detalle';
  guardar();
  renderInforme();
  window.scrollTo(0, 0);
});

function renderDetalle() {
  const ind = actual();
  $('#infTitulo').textContent = ind.nombre || 'Indicador';
  $('#infSub').textContent = `Año ${ind.anio}${ind.unidad ? ' · Cifras en ' + ind.unidad : ''}`;

  const c = calcular(ind);
  $('#gaugeTotal').innerHTML = gauge(c.total, ind);
  $('#kMeta').textContent = c.conDato ? fmt(c.tm) : '—';
  $('#kReal').textContent = c.conDato ? fmt(c.tr) : '—';
  const dif = c.tr - c.tm, kd = $('#kDif');
  kd.textContent = c.conDato ? (dif > 0 ? '+' : '') + fmt(dif) : '—';
  kd.className = c.conDato ? (dif >= 0 ? 'txt-green' : 'txt-red') : '';
  $('#kMeses').textContent = `${c.enMeta} de ${c.conDato}`;
  $('#kAnual').textContent = c.avance != null ? fmt(c.avance * 100, 1) + '%' : '—';
  $('#kMetaAnual').textContent = c.metaAnual ? 'Meta del año: ' + fmt(c.metaAnual) : '';

  $('#kVar').textContent = fmtVar(c.vari);
  $('#kVar').className = clsVar(c.vari);
  $('#kVarLbl').textContent = `vs. ${ind.anio - 1} (mismos meses)`;
  $('#lgAnt').textContent = `${ind.anio - 1}`;
  $('#lgAnt2').textContent = `${ind.anio - 1} acumulado`;
  $('#barras').innerHTML = barras(c.datos, ind);
  $('#acum').innerHTML = acumulado(c.datos, ind);

  $('#meses').innerHTML = c.datos.map((d, i) => {
    const e = d.ok ? estado(d.v, ind) : null;
    const pill = e ? `<span class="pill ${e.c}">${e.t}</span>` : '<span class="pill gray">Pendiente</span>';
    return `
      <div class="month">
        <div class="month-head"><strong>${MESES[i]}</strong>${pill}</div>
        ${gauge(d.v, ind)}
        <div class="month-foot">
          <span>Meta: ${d.m > 0 ? fmt(d.m) : '—'}</span>
          <span>Real: ${!isNaN(d.r) ? fmt(d.r) : '—'}</span>
        </div>
      </div>`;
  }).join('');

  $('#lg1').textContent = `Bajo la meta: menos de ${fmt(ind.lo)} %`;
  $('#lg2').textContent = `En riesgo: ${fmt(ind.lo)} a ${fmt(ind.hi)} %`;
  $('#lg3').textContent = `En meta: ${fmt(ind.hi)} % o más`;
}

function marcarModo() {
  document.querySelectorAll('#segDatos button').forEach((b) => b.classList.toggle('active', b.dataset.modo === modoDatos));
}
$('#segDatos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-modo]');
  if (!b) return;
  modoDatos = b.dataset.modo;
  try { localStorage.setItem('tablero-modo-datos', modoDatos); } catch (err) { /* sin almacenamiento */ }
  marcarModo();
  $('#barras').innerHTML = barras(calcular(actual()).datos, actual());
});
marcarModo();

$('#btnImprimir').addEventListener('click', () => {
  try { window.print(); } catch (e) { /* bloqueado */ }
  toast('Si no se abre la impresión, abre el archivo .html en tu navegador y usa Ctrl + P.');
});

/* =========================================================
   NAVEGACIÓN ENTRE SECCIONES
   ========================================================= */

function mostrar(vista) {
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === vista));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === vista));
  if (vista === 'informe') renderInforme();
  if (vista === 'porMes') renderMes();
  $('#anioBox').style.display = vista === 'captura' ? 'none' : '';
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.goto)));

/* =========================================================
   IDENTIDAD: empresa, logo, color y fecha de corte
   ========================================================= */
function aplicarMarca() {
  const cfg = state.config;
  document.documentElement.style.setProperty('--accent', cfg.color || '#1f5fbf');
  $('#topLogo').innerHTML = cfg.logo ? `<img src="${cfg.logo}" alt="">` : '';
  $('#topEmpresa').textContent = cfg.empresa ? cfg.empresa + ' · ' : '';
  $('#cfgPrev').innerHTML = cfg.logo ? `<img src="${cfg.logo}" alt="Logo cargado">` : '<span class="muted">Sin logo</span>';
}

function renderConfig() {
  const cfg = state.config;
  $('#cfgEmpresa').value = cfg.empresa;
  $('#cfgCorte').value = cfg.corte;
  $('#cfgCorte').placeholder = corteAuto() ? `Automático: ${corteAuto()}` : 'Octubre 2026';
  $('#cfgColor').value = cfg.color || '#1f5fbf';
  aplicarMarca();
}

[['cfgEmpresa', 'empresa'], ['cfgCorte', 'corte'], ['cfgColor', 'color']].forEach(([id, k]) => {
  $('#' + id).addEventListener('input', (e) => { state.config[k] = e.target.value; guardar(); aplicarMarca(); });
});

$('#cfgLogo').addEventListener('change', (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (!/^image\//.test(f.type)) { $('#errCfg').textContent = 'El logo debe ser una imagen (PNG, JPG o SVG).'; return; }
  const img = new Image();
  const url = URL.createObjectURL(f);
  img.onload = () => {
    const k = Math.min(1, 360 / img.width, 140 / img.height);
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * k) || 1;
    cv.height = Math.round(img.height * k) || 1;
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    state.config.logo = cv.toDataURL('image/png');
    URL.revokeObjectURL(url);
    $('#errCfg').textContent = '';
    guardar();
    aplicarMarca();
    toast('Logo cargado');
  };
  img.onerror = () => { $('#errCfg').textContent = 'No pude abrir esa imagen. Prueba con un PNG o JPG.'; };
  img.src = url;
});

$('#cfgQuitarLogo').addEventListener('click', () => { state.config.logo = ''; guardar(); aplicarMarca(); });

/* Inicio */
renderConfig();
renderCaptura();


/* =========================================================
   ANIMACIONES AL HACER SCROLL
   Cada gráfico queda en pausa hasta que entra en pantalla.
   ========================================================= */
(function () {
  const OBJETIVOS = 'svg.gauge, svg.bars, #ranking .rank-row, #semaforo tbody, #tablaMes tbody';
  if (!('IntersectionObserver' in window)) return; // sin soporte: se animan al dibujarse
  const io = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.remove('esperar');
      io.unobserve(en.target);
    });
  }, { threshold: 0.2 });

  function vigilar(raiz) {
    raiz.querySelectorAll(OBJETIVOS).forEach((el) => {
      if (el.dataset.vigilado) return;
      el.dataset.vigilado = '1';
      el.classList.add('esperar');
      io.observe(el);
    });
  }

  new MutationObserver(() => vigilar(document.body)).observe(document.querySelector('main'), { childList: true, subtree: true });
  vigilar(document.body);
})();
