/*
  CONFIGURACIÓN DEL SITIO
  -----------------------
  Mientras "firebase" esté en null, el sitio funciona en MODO DEMO:
  todo se guarda solo en el navegador de quien lo abre (sirve para probar).

  Para publicarlo de verdad, seguí la GUIA.md:
  1. Pegá acá el objeto de configuración que te da Firebase.
  2. Pegá tu UID de autora en adminUid (y también en firestore.rules).
*/
window.SITE_CONFIG = {
  firebase: null,
  /* Ejemplo de cómo queda:
  firebase: {
    apiKey: "AIza...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
  },
  */
  adminUid: "",
  firebaseVersion: "12.19.0"
};
