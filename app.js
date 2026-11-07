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
}

let state = cargar();
const actual = () => state.indicadores.find((i) => i.id === state.actual) || state.indicadores[0];

/* =========================================================
   GRÁFICOS (SVG)
   ========================================================= */

/** Velocímetro: v = cumplimiento (0.85 = 85 %), null = sin dato */
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

  const g = 0.006;
  const bandas = [[0, L1 - g, COL.red], [L1 + g, L2 - g, COL.amber]];
  if (L2 < 1) bandas.push([L2 + g, 1, COL.green]);

  let s = `<svg viewBox="0 0 200 186" class="gauge" role="img" aria-label="Cumplimiento ${v == null ? 'sin dato' : fmt(v * 100, 1) + ' %'}">`;
  bandas.forEach(([a, b, c]) => { if (b > a) s += `<path d="${arc(a, b)}" fill="none" stroke="${c}" stroke-width="12"/>`; });

  for (let i = 0; i <= 20; i++) {
    const [x1, y1] = p(i / 20, R - 15), [x2, y2] = p(i / 20, R - 10);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#c9ced6" stroke-width="1"/>`;
  }

  const [m1x, m1y] = p(1, R - 9), [m2x, m2y] = p(1, R + 9);
  s += `<line x1="${f(m1x)}" y1="${f(m1y)}" x2="${f(m2x)}" y2="${f(m2y)}" stroke="#1d2129" stroke-width="2.5"/>`;
  const [ax, ay] = p(0, R + 14), [bx, by] = p(1, R + 14);
  s += `<text x="${f(ax + 6)}" y="${f(ay + 8)}" text-anchor="middle" font-size="11" fill="#6b7280">0%</text>`;
  s += `<text x="${f(bx - 8)}" y="${f(by + 8)}" text-anchor="middle" font-size="11" font-weight="600" fill="#1d2129">Meta</text>`;

  if (v == null) {
    s += `<circle cx="${cx}" cy="${cy}" r="6" fill="#c9ced6"/>`;
    s += `<text x="${cx}" y="178" text-anchor="middle" font-size="15" fill="#9aa1ab">Sin dato</text>`;
    return s + '</svg>';
  }

  const a = ang(v), L = 54, W = 4, T = 11;
  const tip = [cx + L * Math.cos(a), cy - L * Math.sin(a)];
  const tail = [cx - T * Math.cos(a), cy + T * Math.sin(a)];
  const px = Math.sin(a) * W, py = Math.cos(a) * W;
  s += `<polygon points="${f(tip[0])},${f(tip[1])} ${f(cx + px)},${f(cy + py)} ${f(tail[0])},${f(tail[1])} ${f(cx - px)},${f(cy - py)}" fill="#1d2129"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="6" fill="#1d2129"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="#fff"/>`;
  s += `<text x="${cx}" y="180" text-anchor="middle" font-size="26" font-weight="600" fill="#1d2129">${fmt(v * 100, 1)}%</text>`;
  return s + '</svg>';
}

function pasoBonito(x) {
  if (!(x > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const r = x / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p;
}

/** Barras agrupadas: meta (gris) y real (color según estado) */
function barras(datos, ind) {
  const W = 960, H = 320, pl = 84, pr = 16, pt = 16, pb = 40;
  const vals = datos.flatMap((d) => [d.m, d.r]).filter((v) => v > 0);
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
  datos.forEach((d, i) => {
    const x0 = pl + cw * i + cw / 2;
    if (d.m > 0) {
      s += `<rect x="${x0 - bw - 2}" y="${H - pb - h(d.m)}" width="${bw}" height="${h(d.m)}" rx="3" fill="#c9ced6"><title>${MESES[i]} · Meta ${fmt(d.m)}</title></rect>`;
    }
    if (d.ok) {
      const e = estado(d.v, ind);
      s += `<rect x="${x0 + 2}" y="${H - pb - h(d.r)}" width="${bw}" height="${h(d.r)}" rx="3" fill="${COL[e.c]}"><title>${MESES[i]} · Real ${fmt(d.r)} (${fmt(d.v * 100, 1)} %)</title></rect>`;
    }
    s += `<text x="${x0}" y="${H - pb + 20}" text-anchor="middle" font-size="12" fill="#6b7280">${ABR[i]}</text>`;
  });
  s += `<line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="#c9ced6"/>`;
  return s + '</svg>';
}

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

  $('#tablaMeses').innerHTML = MESES.map((m, i) => `
    <tr>
      <td>${m}</td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-k="meta" value="${esc(ind.meses[i].meta)}" aria-label="Meta ${m}"></td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-k="real" value="${esc(ind.meses[i].real)}" aria-label="Real ${m}"></td>
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
  actual().meses = Array.from({ length: 12 }, () => ({ meta: '', real: '' }));
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

      const meses = Array.from({ length: 12 }, () => ({ meta: '', real: '' }));
      for (let k = r + 1; k <= r + 14 && k < rows.length; k++) {
        const i = mesIdx(rows[k] && rows[k][0]);
        if (i < 0) continue;
        const m = Number(rows[k][cMeta]), v = Number(rows[k][cReal]);
        meses[i].meta = isFinite(m) && m > 1 ? String(+m.toFixed(2)) : '';
        meses[i].real = isFinite(v) && rows[k][cReal] !== null && rows[k][cReal] !== '' ? String(+v.toFixed(2)) : '';
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

function calcular(ind) {
  let tm = 0, tr = 0, enMeta = 0, conDato = 0, metaAnual = 0;
  const datos = ind.meses.map((x) => {
    const m = num(x.meta), r = num(x.real);
    if (m > 0) metaAnual += m;
    const ok = m > 0 && r >= 0;
    if (ok) {
      tm += m; tr += r; conDato++;
      if (r / m >= ind.hi / 100) enMeta++;
    }
    return { m, r, ok, v: ok ? r / m : null };
  });
  return { datos, tm, tr, enMeta, conDato, metaAnual,
           total: tm > 0 ? tr / tm : null,
           avance: metaAnual > 0 ? tr / metaAnual : null };
}

function renderChips() {
  const chips = [`<button class="chip ${vistaInforme === 'resumen' ? 'active' : ''}" data-chip="resumen">Resumen general</button>`]
    .concat(state.indicadores.map((i) =>
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

function renderInforme() {
  renderChips();
  $('#vistaResumen').style.display = vistaInforme === 'resumen' ? '' : 'none';
  $('#vistaDetalle').style.display = vistaInforme === 'detalle' ? '' : 'none';
  if (vistaInforme === 'resumen') renderResumen(); else renderDetalle();
}

function renderResumen() {
  const anios = [...new Set(state.indicadores.map((i) => i.anio))].join(', ');
  $('#resSub').textContent = `Año ${anios} · Cumplimiento acumulado a la fecha de cada sección`;
  let enMeta = 0, enRiesgo = 0, bajo = 0;
  $('#resGrid').innerHTML = state.indicadores.map((ind) => {
    const c = calcular(ind);
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
      </button>`;
  }).join('');
  $('#rEnMeta').textContent = enMeta;
  $('#rRiesgo').textContent = enRiesgo;
  $('#rBajo').textContent = bajo;
}

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

  $('#barras').innerHTML = barras(c.datos, ind);

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
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.goto)));

/* Inicio */
renderCaptura();
