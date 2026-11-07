/* =========================================================
   Guardado en Firebase (sin usuarios)
   - La página entra sola como usuario anónimo (no pide nada).
   - El tablero completo vive en Firestore: tableros/{FIREBASE_DOC}
   - Si firebase-config.js no está lleno, funciona solo en este
     navegador (modo local).
   ========================================================= */

const nube = { activa: false, ref: null, unsub: null, timer: null, pendiente: null, primeraCarga: true };

function configLista() {
  return typeof FIREBASE_CONFIG === 'object' && FIREBASE_CONFIG &&
         FIREBASE_CONFIG.apiKey && !/PEGA|TU_/i.test(FIREBASE_CONFIG.apiKey) && FIREBASE_CONFIG.projectId;
}

function estadoNube(texto, tipo) {
  const el = $('#nubeEstado');
  el.textContent = texto;
  el.className = 'nube-estado ' + (tipo || '');
}

/** JSON con llaves ordenadas, para comparar sin importar el orden */
function estable(v) {
  if (Array.isArray(v)) return '[' + v.map(estable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + estable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

const escribiendo = () => {
  const a = document.activeElement;
  return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#captura');
};

function refrescarVista() {
  renderConfig();
  if ($('#informe').classList.contains('active')) renderInforme();
  else renderCaptura();
}

function aplicarRemoto(d) {
  if (!valido(d)) return;
  const remoto = { indicadores: d.indicadores, config: Object.assign({}, CONFIG_BASE, d.config || {}) };
  if (estable(remoto) === estable({ indicadores: state.indicadores, config: state.config })) return;
  const actualId = state.actual;
  state = { indicadores: remoto.indicadores, config: remoto.config, actual: actualId };
  if (!state.indicadores.some((i) => i.id === state.actual)) state.actual = state.indicadores[0].id;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ }
  refrescarVista();
}

/* Si llega un cambio mientras escribes, se aplica cuando sales del campo */
document.addEventListener('focusout', () => setTimeout(() => {
  if (nube.pendiente && !escribiendo()) { const d = nube.pendiente; nube.pendiente = null; aplicarRemoto(d); }
}, 0));

function subir() {
  if (!nube.activa || !nube.ref) return;
  if (!navigator.onLine) estadoNube('Sin conexión: se guardará al reconectar', 'saving');
  const datos = JSON.parse(JSON.stringify({ indicadores: state.indicadores, config: state.config }));
  datos.actualizado = firebase.firestore.FieldValue.serverTimestamp();
  nube.ref.set(datos)
    .then(() => estadoNube('Guardado en la nube', 'ok'))
    .catch((e) => estadoNube(e.code === 'permission-denied' ? 'Sin permiso para guardar: revisa las reglas de Firestore' : 'Error al guardar', 'err'));
}

window.alGuardar = function () {
  if (!nube.activa) return;
  estadoNube('Guardando…', 'saving');
  clearTimeout(nube.timer);
  nube.timer = setTimeout(subir, 700);
};

function escucharDatos() {
  nube.primeraCarga = true;
  estadoNube('Conectando…', 'saving');
  nube.unsub = nube.ref.onSnapshot((snap) => {
    if (!snap.exists) {
      // Primera vez: se suben los datos que tiene la página (tus 9 secciones)
      if (nube.primeraCarga) { nube.primeraCarga = false; nube.activa = true; subir(); }
      return;
    }
    if (snap.metadata.hasPendingWrites) return; // cambio propio que aún no llega al servidor
    const d = snap.data();
    nube.activa = true;
    if (nube.primeraCarga) {
      nube.primeraCarga = false;
      aplicarRemoto(d);
      estadoNube('Guardado en la nube', 'ok');
      return;
    }
    if (escribiendo()) nube.pendiente = d; else aplicarRemoto(d);
  }, (e) => {
    nube.activa = false;
    estadoNube(e.code === 'permission-denied'
      ? 'Sin permiso: revisa las reglas de Firestore y que el acceso anónimo esté activo'
      : 'No se pudo conectar con Firebase', 'err');
  });
}

function iniciarNube() {
  if (!configLista()) { estadoNube('Modo local', ''); return; }
  if (typeof firebase === 'undefined') { estadoNube('No se pudo cargar Firebase (revisa la conexión)', 'err'); return; }

  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true }).catch(() => { /* otra pestaña o navegador sin soporte */ });
  const docId = (typeof FIREBASE_DOC === 'string' && FIREBASE_DOC.trim()) || 'principal';
  nube.ref = db.collection('tableros').doc(docId);
  $('#hintGuardado').textContent = 'Los cambios se guardan solos en la nube.';
  estadoNube('Conectando…', 'saving');

  let escuchando = false;
  const empezar = () => { if (!escuchando) { escuchando = true; escucharDatos(); } };

  firebase.auth().onAuthStateChanged((user) => {
    if (user) { empezar(); return; }
    firebase.auth().signInAnonymously().catch((e) => {
      if (/operation-not-allowed|admin-restricted/.test(e.code || '')) {
        estadoNube('Activa el acceso "Anónimo" en Firebase Authentication', 'err');
      } else if (/network/.test(e.code || '')) {
        estadoNube('Sin conexión: trabajando con los datos de este navegador', 'saving');
      }
      empezar(); // por si las reglas de Firestore permiten el acceso sin ingreso
    });
  });
}

iniciarNube();
