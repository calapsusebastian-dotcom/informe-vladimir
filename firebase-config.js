/* =========================================================
   CONFIGURACIÓN DE FIREBASE – proyecto datos-vladimir
   (Consola de Firebase → ⚙ Configuración del proyecto → Tus apps)

   Si apiKey dice PEGA_AQUI, el tablero funciona en modo local
   (los datos quedan solo en ese navegador).
   ========================================================= */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAwg4Rh06ceMK_n0T5HJlZtpLoDBiK7toY",
  authDomain: "datos-vladimir.firebaseapp.com",
  projectId: "datos-vladimir",
  storageBucket: "datos-vladimir.firebasestorage.app",
  messagingSenderId: "870419028290",
  appId: "1:870419028290:web:5d13c5ca907cfe680ad0db"
};

/* Documento de Firestore donde se guarda el tablero.
   Todos los usuarios que ingresen ven y editan este mismo tablero. */
const FIREBASE_DOC = "principal";
