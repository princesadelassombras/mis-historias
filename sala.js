/* =====================================================================
   SALA: el observatorio en 3D que se recorre.
   Lo usa observatorio.js en la portada. Carga three.js recién cuando
   hace falta, así el resto del sitio no se pone más pesado.

   Cómo se mueve:
     - Arrastrar (mouse o dedo): girar la vista, 360°.
     - Flechas o W A S D: caminar.  Clic o toque en el piso: ir ahí.
     - Clic o toque en un objeto: se abre su cartel con las opciones.

   Qué hay en la sala (todo sale de los datos del sitio):
     - Cúpula: el cielo con los fandoms como constelaciones.
     - Centro: el sistema solar. El Sol sos vos; los planetas, tus secciones.
     - Alrededor: un instrumento por cada materia de Facultad.
     - Mesa de estudio con los libros de Estudios (Árabe, Sánscrito…).
     - Estantería y una puerta cerrada: lugar para lo que venga.
     - La puerta grande lleva al archivo.

   PARA AGREGAR COSAS DESPUÉS: la lista OBJETOS_EXTRA (más abajo) dice
   qué muebles hay y dónde. Se pueden sumar puertas, estanterías, etc.
   Ángulos en grados: 0 = la puerta de entrada, 180 = el fondo de la sala.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.Arch || (window.Arch = {});
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  /* Muebles y puertas que no dependen de los datos. Para agrandar la sala, sumá acá. */
  var OBJETOS_EXTRA = [
    { tipo: 'puerta', angulo: 0, titulo: ['Entrar al archivo', 'Enter the archive'], texto: ['La lista completa, con buscador y filtros.', 'The full list, with search and filters.'], accion: 'archivo' },
    { tipo: 'puerta', angulo: 270, cerrada: true, titulo: ['Puerta cerrada', 'Closed door'], texto: ['Por acá se va a abrir una sala nueva.', 'A new room will open here.'] },
    { tipo: 'estanteria', angulo: 180, titulo: ['Estantería', 'Bookcase'], texto: ['Todavía tiene lugar. Pronto se llena.', 'Still room here. It will fill up soon.'] }
  ];

  var R = 10;          /* radio de la sala */
  var ALTO = 5.5;      /* altura de las paredes */
  var OJOS = 1.6;      /* altura de la mirada */

  function soportado() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }

  var cargando = null;
  function cargarThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (cargando) return cargando;
    cargando = new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = THREE_URL; s.async = true;
      s.onload = function () { window.THREE ? ok(window.THREE) : mal(new Error('three.js no cargó')); };
      s.onerror = function () { cargando = null; mal(new Error('No se pudo descargar three.js')); };
      document.head.appendChild(s);
    });
    return cargando;
  }

  /* Colores del tema activo */
  function colores() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, d) { var x = cs.getPropertyValue(n).trim(); return x || d; }
    return { fondo: v('--bg', '#0E1020'), panel: v('--surface', '#151831'), hundido: v('--sunken', '#0A0C18'), tinta: v('--ink', '#EAE3D2'), tenue: v('--muted', '#ABA698'), linea: v('--line', '#2C3050'), vela: v('--accent', '#E8A951') };
  }
  function fuente() {
    var f = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
    return f || 'Georgia, serif';
  }

  function montar(cont, modelo, acc) {
    var L = acc.L;
    return cargarThree().then(function (THREE) {
      if (!cont.isConnected) return;
      var col = colores();
      var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var tactil = window.matchMedia('(pointer: coarse)').matches;

      cont.innerHTML =
        '<div class="sala-lienzo"></div>' +
        '<p class="sala-ayuda">' + (tactil
          ? L('Arrastrá para mirar alrededor · Tocá el piso para caminar · Tocá un objeto para abrirlo', 'Drag to look around · Tap the floor to walk · Tap an object to open it')
          : L('Arrastrá para mirar alrededor · Flechas o W A S D para caminar · Clic en el piso para ir ahí · Clic en un objeto para abrirlo', 'Drag to look around · Arrow keys or W A S D to walk · Click the floor to go there · Click an object to open it')) + '</p>' +
        '<div class="sala-etiqueta" hidden></div>' +
        '<div class="sala-cartel" role="dialog" aria-live="polite" hidden></div>' +
        '<div class="sala-botones"><button type="button" class="tool sala-centro">' + L('Volver a la entrada', 'Back to the entrance') + '</button>' +
        (cont.requestFullscreen ? '<button type="button" class="tool sala-completa" aria-pressed="false">' + L('Pantalla completa', 'Full screen') + '</button>' : '') + '</div>';
      var lienzo = cont.querySelector('.sala-lienzo');
      var etiqueta = cont.querySelector('.sala-etiqueta');
      var cartel = cont.querySelector('.sala-cartel');

      /* ---------- Escena ---------- */
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(new THREE.Color(col.hundido));
      renderer.domElement.setAttribute('aria-hidden', 'true');
      lienzo.appendChild(renderer.domElement);
      var escena = new THREE.Scene();
      escena.fog = new THREE.Fog(new THREE.Color(col.hundido), 14, 30);
      var camara = new THREE.PerspectiveCamera(68, 1, 0.05, 80);

      var cTinta = new THREE.Color(col.tinta), cVela = new THREE.Color(col.vela), cPanel = new THREE.Color(col.panel), cFondo = new THREE.Color(col.fondo), cTenue = new THREE.Color(col.tenue);
      escena.add(new THREE.HemisphereLight(0xb8c2ff, 0x3a2810, 0.95));
      escena.add(new THREE.AmbientLight(0xffffff, 0.18));
      /* apliques con velas en las paredes */
      [45, 135, 225, 315].forEach(function (a) {
        var r = (a * Math.PI) / 180, lz = new THREE.PointLight(cVela, 0.9, 9, 1.6);
        lz.position.set(Math.sin(r) * (R - 0.6), 3.2, Math.cos(r) * (R - 0.6)); escena.add(lz);
      });
      var luzSol = new THREE.PointLight(cVela, 1.6, 14, 1.6); luzSol.position.set(0, 1.5, 0); escena.add(luzSol);

      var interactivos = [];   /* objetos que se pueden tocar */
      var obstaculos = [];     /* círculos que no se pueden atravesar: {x, z, r} */
      var animados = [];       /* funciones que se llaman en cada cuadro */
      var aDescartar = [];

      function mat(color, extra) { var m = new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.8, metalness: 0.1 }, extra || {})); aDescartar.push(m); return m; }
      function geo(g) { aDescartar.push(g); return g; }
      function polar(r, gradosDesdeEntrada) { var a = gradosDesdeEntrada * Math.PI / 180; return { x: Math.sin(a) * r, z: Math.cos(a) * r, rot: a }; }

      /* Cartelito de texto que siempre mira a la cámara */
      function texto(lineas, opt) {
        opt = opt || {};
        var tam = opt.tam || 44, pad = 18;
        var c = document.createElement('canvas'), x = c.getContext('2d');
        var f = (opt.italica ? 'italic ' : '') + tam + 'px ' + fuente();
        x.font = f;
        var ancho = Math.max.apply(null, lineas.map(function (l) { return x.measureText(l).width; })) + pad * 2;
        var alto = lineas.length * tam * 1.2 + pad * 2;
        c.width = Math.ceil(ancho); c.height = Math.ceil(alto);
        x.font = f; x.textAlign = 'center'; x.textBaseline = 'middle';
        if (opt.fondo) { x.fillStyle = opt.fondo; x.globalAlpha = 0.78; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1; }
        lineas.forEach(function (l, i) { x.fillStyle = i === 0 ? (opt.color || col.tinta) : (opt.color2 || col.tenue); x.font = (i === 0 ? f : (tam * 0.72) + 'px ' + fuente()); x.fillText(l, c.width / 2, pad + tam * 0.6 + i * tam * 1.2); });
        var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; aDescartar.push(tex);
        var m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }); aDescartar.push(m);
        var s = new THREE.Sprite(m);
        var esc = (opt.escala || 0.0045);
        s.scale.set(c.width * esc, c.height * esc, 1);
        return s;
      }

      function tocable(obj, datos) { obj.traverse(function (o) { if (o.isMesh) { o.userData.datos = datos; interactivos.push(o); } }); obj.userData.datos = datos; return obj; }

      /* ---------- Piso, paredes y cúpula ---------- */
      (function () {
        var c = document.createElement('canvas'); c.width = c.height = 1024; var x = c.getContext('2d');
        x.fillStyle = col.panel; x.fillRect(0, 0, 1024, 1024);
        x.strokeStyle = col.vela; x.globalAlpha = 0.5; x.lineWidth = 3;
        [500, 470, 300, 160].forEach(function (r) { x.beginPath(); x.arc(512, 512, r, 0, Math.PI * 2); x.stroke(); });
        x.globalAlpha = 0.25; x.lineWidth = 2;
        for (var i = 0; i < 24; i++) { var a = i * Math.PI / 12; x.beginPath(); x.moveTo(512 + Math.cos(a) * 160, 512 + Math.sin(a) * 160); x.lineTo(512 + Math.cos(a) * 470, 512 + Math.sin(a) * 470); x.stroke(); }
        /* rosa de los vientos */
        x.globalAlpha = 0.6; x.fillStyle = col.vela;
        for (var k = 0; k < 4; k++) { x.save(); x.translate(512, 512); x.rotate(k * Math.PI / 2); x.beginPath(); x.moveTo(0, -150); x.lineTo(14, 0); x.lineTo(-14, 0); x.closePath(); x.fill(); x.restore(); }
        var t = new THREE.CanvasTexture(c); aDescartar.push(t);
        var piso = new THREE.Mesh(geo(new THREE.CircleGeometry(R, 72)), mat(0xffffff, { map: t, roughness: 0.95 }));
        piso.rotation.x = -Math.PI / 2; piso.userData.piso = true; escena.add(piso); interactivos.push(piso);
      })();
      var pared = new THREE.Mesh(geo(new THREE.CylinderGeometry(R, R, ALTO, 72, 1, true)), mat(cPanel, { side: THREE.BackSide, roughness: 0.9 }));
      pared.position.y = ALTO / 2; escena.add(pared);
      /* zócalo y moldura en color vela */
      [0.15, ALTO - 0.05].forEach(function (y) { var m = new THREE.Mesh(geo(new THREE.TorusGeometry(R - 0.02, 0.05, 6, 96)), mat(cVela, { emissive: cVela, emissiveIntensity: 0.25 })); m.rotation.x = Math.PI / 2; m.position.y = y; escena.add(m); });
      var cupula = new THREE.Mesh(geo(new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2)), mat(new THREE.Color(col.hundido), { side: THREE.BackSide, roughness: 1 }));
      cupula.position.y = ALTO; escena.add(cupula);

      /* ---------- El cielo en la cúpula: constelaciones de fandoms ---------- */
      function enCupula(gradosMapa, radioMapa, achicar) {
        /* el mapa plano (0–500) pasa a la cúpula: más cerca del borde = más bajo */
        var elev = (18 + (1 - Math.min(Math.max((radioMapa - 300) / 150, 0), 1)) * 40) * Math.PI / 180;
        var az = (gradosMapa + 90) * Math.PI / 180;
        var r = R * (achicar || 0.97);
        return new THREE.Vector3(Math.sin(az) * Math.cos(elev) * r, ALTO + Math.sin(elev) * r, Math.cos(az) * Math.cos(elev) * r);
      }
      /* polvo de estrellas fijo */
      (function () {
        var n = 500, pos = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
          var az = Math.random() * Math.PI * 2, el = Math.asin(Math.random() * 0.98), r = R * 0.985;
          pos[i * 3] = Math.sin(az) * Math.cos(el) * r; pos[i * 3 + 1] = ALTO + Math.sin(el) * r; pos[i * 3 + 2] = Math.cos(az) * Math.cos(el) * r;
        }
        var g = geo(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        var m = new THREE.PointsMaterial({ color: cTinta, size: 0.05, transparent: true, opacity: 0.7, fog: false }); aDescartar.push(m);
        escena.add(new THREE.Points(g, m));
      })();
      var matEstrella = mat(cVela, { emissive: cVela, emissiveIntensity: 1.2, fog: false });
      var matHit = new THREE.MeshBasicMaterial({ visible: false }); aDescartar.push(matHit);
      var geoEstrella = geo(new THREE.SphereGeometry(0.07, 10, 8)), geoHit = geo(new THREE.SphereGeometry(0.32, 8, 6));
      modelo.constelaciones.forEach(function (c) {
        var puntos = c.estrellas.map(function (e) { return enCupula(e.g, e.ra); });
        if (puntos.length > 1) {
          var g = geo(new THREE.BufferGeometry().setFromPoints(puntos));
          var m = new THREE.LineBasicMaterial({ color: cVela, transparent: true, opacity: 0.55, fog: false }); aDescartar.push(m);
          escena.add(new THREE.Line(g, m));
        }
        c.estrellas.forEach(function (e, i) {
          var gr = new THREE.Group(); gr.position.copy(puntos[i]);
          var punto = new THREE.Mesh(geoEstrella, matEstrella); punto.scale.setScalar(e.completa ? 1.35 : 1); gr.add(punto);
          var hit = new THREE.Mesh(geoHit, matHit); gr.add(hit);
          tocable(gr, { titulo: e.titulo, texto: c.nombre + ' · ' + (e.completa ? L('Terminada', 'Complete') : L('En curso', 'In progress')), botones: [[L('Leer', 'Read'), function () { acc.obra(e.id); }]] });
          escena.add(gr);
          if (!quieto) { var fase = Math.random() * 6; animados.push(function (t) { punto.scale.setScalar((e.completa ? 1.35 : 1) * (1 + 0.15 * Math.sin(t * 1.5 + fase))); }); }
        });
        var cen = enCupula(c.centro, 270, 0.9);
        var et = texto([c.nombre, c.estrellas.length === 1 ? L('1 historia', '1 story') : L(c.estrellas.length + ' historias', c.estrellas.length + ' stories')], { tam: 46, escala: 0.008 });
        et.position.copy(cen); escena.add(et);
        var hitE = new THREE.Mesh(geo(new THREE.SphereGeometry(0.9, 8, 6)), matHit); hitE.position.copy(cen); escena.add(hitE);
        tocable(hitE, { titulo: c.nombre, texto: L('Constelación con ', 'Constellation with ') + c.estrellas.length + L(' historias.', ' stories.'), botones: [[L('Ver todas', 'See all'), function () { acc.fandom(c.raw); }]] });
      });

      /* ---------- Sistema solar en el centro ---------- */
      var pedestal = new THREE.Mesh(geo(new THREE.CylinderGeometry(2.3, 2.5, 0.7, 48)), mat(cPanel, { roughness: 0.6, metalness: 0.3 }));
      pedestal.position.y = 0.35; escena.add(pedestal); obstaculos.push({ x: 0, z: 0, r: 2.9 });
      var aro = new THREE.Mesh(geo(new THREE.TorusGeometry(2.4, 0.04, 6, 64)), mat(cVela, { metalness: 0.8, roughness: 0.3 })); aro.rotation.x = Math.PI / 2; aro.position.y = 0.71; escena.add(aro);
      var sol = new THREE.Mesh(geo(new THREE.SphereGeometry(0.42, 32, 24)), new THREE.MeshBasicMaterial({ color: cVela }));
      aDescartar.push(sol.material); sol.position.y = 1.5; escena.add(sol);
      var coronaM = new THREE.MeshBasicMaterial({ color: cVela, transparent: true, opacity: 0.15, depthWrite: false }); aDescartar.push(coronaM);
      var corona = new THREE.Mesh(geo(new THREE.SphereGeometry(0.62, 24, 16)), coronaM); corona.position.y = 1.5; escena.add(corona);
      tocable(sol, { titulo: L('El Sol', 'The Sun') + (modelo.autora ? ': ' + modelo.autora : ''), texto: L('Todo gira alrededor de quien escribe.', 'Everything orbits the writer.'), botones: [[L('Sobre mí', 'About me'), acc.sobreMi]] });
      var etSol = texto([L('Sobre mí', 'About me')], { tam: 40, escala: 0.005, fondo: col.hundido }); etSol.position.set(0, 2.2, 0); escena.add(etSol);
      var nP = modelo.planetas.length;
      modelo.planetas.forEach(function (p, i) {
        var radio = nP === 1 ? 1.4 : 0.85 + i * (1.25 / Math.max(nP - 1, 1));
        var orb = new THREE.Mesh(geo(new THREE.TorusGeometry(radio, 0.008, 4, 96)), mat(cTenue, { transparent: true, opacity: 0.6 })); orb.rotation.x = Math.PI / 2; orb.position.y = 1.5; escena.add(orb);
        var piv = new THREE.Group(); piv.position.y = 1.5; piv.rotation.y = i * 2.4; escena.add(piv);
        var tam = p.n ? 0.11 + Math.min(p.n, 8) * 0.012 : 0.1;
        var planeta = new THREE.Mesh(geo(new THREE.SphereGeometry(tam, 20, 14)), p.n ? mat(cPanel, { emissive: cVela, emissiveIntensity: 0.35 }) : mat(cTenue, { transparent: true, opacity: 0.35, wireframe: true }));
        planeta.position.x = radio; piv.add(planeta);
        p.lunas.forEach(function (l, j) {
          var luna = new THREE.Mesh(geo(new THREE.SphereGeometry(0.03, 8, 6)), l.n ? matEstrella : mat(cTenue));
          var a = j * Math.PI * 2 / Math.max(p.lunas.length, 1);
          luna.position.set(radio + Math.cos(a) * (tam + 0.08), Math.sin(a) * (tam + 0.08), 0); piv.add(luna);
        });
        var et = texto([p.nombre, p.n ? (p.n === 1 ? L('1 obra', '1 work') : L(p.n + ' obras', p.n + ' works')) : L('Próximamente', 'Coming soon')], { tam: 40, escala: 0.0045, fondo: col.hundido });
        et.position.set(radio, 0.42 + (i % 3) * 0.14, 0); piv.add(et);
        var hit = new THREE.Mesh(geo(new THREE.SphereGeometry(0.28, 8, 6)), matHit); hit.position.x = radio; piv.add(hit);
        tocable(hit, { titulo: p.nombre, texto: p.n ? (p.n === 1 ? L('1 obra publicada.', '1 published work.') : L(p.n + ' obras publicadas.', p.n + ' published works.')) + (p.lunas.length ? ' ' + L('Lunas: ', 'Moons: ') + p.lunas.map(function (l) { return l.nombre; }).join(', ') + '.' : '') : L('Este planeta todavía está apagado: pronto llegan las primeras obras.', 'This planet is still dim: the first works are coming soon.'),
          botones: p.n ? [[L('Ver obras', 'See works'), function () { acc.seccion(p.sec); }]] : [] });
        if (!quieto) { var vel = 0.05 / (1 + i * 0.6); animados.push(function (t, dt) { piv.rotation.y += vel * dt; }); }
      });

      /* ---------- Instrumentos de Facultad ---------- */
      var matMetal = mat(cVela, { metalness: 0.85, roughness: 0.35 });
      var matMadera = mat(new THREE.Color('#4a2f1c'), { roughness: 0.7 });
      var matOscuro = mat(cPanel, { metalness: 0.4, roughness: 0.5 });
      function instrumento(tipo) {
        var g = new THREE.Group(), m;
        switch (tipo % 8) {
          case 0: /* telescopio */
            m = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.09, 0.13, 1.3, 16)), matMetal); m.rotation.z = Math.PI / 3.2; m.position.y = 1.45; g.add(m);
            [0, 2.1, 4.2].forEach(function (a) { var p = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.02, 0.02, 1.35, 6)), matMadera); p.position.set(Math.cos(a) * 0.25, 0.65, Math.sin(a) * 0.25); p.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(p); });
            break;
          case 1: /* astrolabio */
            m = new THREE.Mesh(geo(new THREE.TorusGeometry(0.42, 0.04, 8, 40)), matMetal); m.position.y = 1.4; g.add(m);
            m = new THREE.Mesh(geo(new THREE.CircleGeometry(0.4, 32)), matOscuro); m.position.y = 1.4; g.add(m);
            m = new THREE.Mesh(geo(new THREE.TorusGeometry(0.25, 0.015, 6, 30)), matMetal); m.position.set(0, 1.4, 0.01); g.add(m);
            m = new THREE.Mesh(geo(new THREE.BoxGeometry(0.75, 0.025, 0.02)), matMetal); m.position.set(0, 1.4, 0.02); m.rotation.z = 0.6; g.add(m);
            break;
          case 2: /* sextante */
            m = new THREE.Mesh(geo(new THREE.TorusGeometry(0.5, 0.03, 6, 30, Math.PI / 3)), matMetal); m.rotation.z = Math.PI + Math.PI / 3; m.position.y = 1.75; g.add(m);
            [-0.25, 0.25].forEach(function (x) { var b = new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.55, 0.03)), matMetal); b.position.set(x * 0.9, 1.55, 0); b.rotation.z = x > 0 ? -0.5 : 0.5; g.add(b); });
            break;
          case 3: /* globo celeste */
            m = new THREE.Mesh(geo(new THREE.SphereGeometry(0.38, 24, 16)), mat(cPanel, { emissive: cVela, emissiveIntensity: 0.12, wireframe: false })); m.position.y = 1.4; g.add(m);
            m = new THREE.Mesh(geo(new THREE.TorusGeometry(0.44, 0.02, 6, 40)), matMetal); m.position.y = 1.4; m.rotation.y = Math.PI / 2; g.add(m);
            break;
          case 4: /* reloj de arena */
            [1.25, 1.55].forEach(function (y, k) { var c = new THREE.Mesh(geo(new THREE.ConeGeometry(0.2, 0.3, 16)), mat(cTinta, { transparent: true, opacity: 0.45 })); c.position.y = y; if (k) c.rotation.x = Math.PI; g.add(c); });
            [1.08, 1.72].forEach(function (y) { var t = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16)), matMadera); t.position.y = y; g.add(t); });
            break;
          case 5: /* compás de puntas */
            [-1, 1].forEach(function (s) { var p = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.006, 0.8, 6)), matMetal); p.position.set(s * 0.12, 1.4, 0); p.rotation.z = s * 0.3; g.add(p); });
            m = new THREE.Mesh(geo(new THREE.SphereGeometry(0.05, 10, 8)), matMetal); m.position.y = 1.8; g.add(m);
            break;
          case 6: /* esfera armilar */
            [0, Math.PI / 2, Math.PI / 4].forEach(function (r, k) { var t = new THREE.Mesh(geo(new THREE.TorusGeometry(0.38, 0.015, 6, 40)), matMetal); t.position.y = 1.45; t.rotation.set(k === 2 ? 1.1 : 0, r, k === 1 ? 0 : 0.3); g.add(t); });
            m = new THREE.Mesh(geo(new THREE.SphereGeometry(0.06, 10, 8)), mat(cVela, { emissive: cVela, emissiveIntensity: 0.6 })); m.position.y = 1.45; g.add(m);
            break;
          default: /* cuadrante */
            m = new THREE.Mesh(geo(new THREE.CircleGeometry(0.5, 20, 0, Math.PI / 2)), matOscuro); m.position.set(-0.2, 1.1, 0); g.add(m);
            m = new THREE.Mesh(geo(new THREE.TorusGeometry(0.5, 0.02, 6, 20, Math.PI / 2)), matMetal); m.position.set(-0.2, 1.1, 0.01); g.add(m);
        }
        /* pie de columna */
        m = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.28, 0.34, 1, 20)), matOscuro); m.position.y = 0.5; g.add(m);
        return g;
      }
      var mats = modelo.materias, nM = mats.length;
      var angulosLibres = [];
      /* Tramos libres de la pared (en grados) para poner instrumentos: se saltean
         la puerta de entrada (0), la puerta cerrada (270) y la mesa con la estantería (180). */
      var TRAMOS = [[28, 148], [212, 257], [283, 332]];
      if (nM) {
        var largo = TRAMOS.reduce(function (s, t) { return s + t[1] - t[0]; }, 0), paso = largo / nM;
        for (var i = 0; i < nM; i++) {
          var d = paso * (i + 0.5), k = 0;
          while (d > TRAMOS[k][1] - TRAMOS[k][0]) { d -= TRAMOS[k][1] - TRAMOS[k][0]; k++; }
          angulosLibres.push(TRAMOS[k][0] + d);
        }
      }
      var muchas = nM > 8;
      mats.forEach(function (m, i) {
        var ang = angulosLibres[i];
        /* con muchas materias se alternan dos filas para que no se pisen */
        var fila = muchas ? i % 2 : 0;
        var p = polar(fila ? 6.1 : 7.5, ang);
        var obj = instrumento(m.instrumento); obj.position.set(p.x, 0, p.z); obj.rotation.y = p.rot + Math.PI; escena.add(obj);
        obstaculos.push({ x: p.x, z: p.z, r: 0.7 });
        var et = texto([m.nombre, m.instrumentoNombre + ' · ' + (m.n ? (m.n === 1 ? L('1 trabajo', '1 piece') : L(m.n + ' trabajos', m.n + ' pieces')) : L('sin trabajos aún', 'no work yet'))], { tam: 44, escala: muchas ? 0.0034 : 0.0042, fondo: col.hundido });
        et.position.set(p.x, fila ? 2.25 : 2.75, p.z); escena.add(et);
        /* una materia puede tener varios niveles (I, II, III): un botón por cada nivel con trabajos */
        var niveles = m.niveles || [{ sec: m.sec, sub: m.sub, nombre: m.nombre, n: m.n }];
        var detalle = niveles.length > 1 ? ' ' + niveles.map(function (nv) { return nv.nombre + ': ' + (nv.n ? (nv.n === 1 ? L('1 trabajo', '1 piece') : L(nv.n + ' trabajos', nv.n + ' pieces')) : L('sin trabajos', 'none yet')); }).join(' · ') + '.' : '';
        tocable(obj, { titulo: m.nombre, texto: m.instrumentoNombre + '. ' + (m.n ? (m.n === 1 ? L('1 trabajo de esta materia.', '1 piece for this subject.') : L(m.n + ' trabajos de esta materia.', m.n + ' pieces for this subject.')) : L('Todavía no hay trabajos de esta materia.', 'No work for this subject yet.')) + detalle,
          botones: niveles.filter(function (nv) { return nv.n; }).map(function (nv) { return [niveles.length > 1 ? L('Ver ', 'See ') + nv.nombre : L('Ver trabajos', 'See work'), function () { acc.seccion(nv.sec, nv.sub); }]; }) });
      });

      /* ---------- Mesa de estudio con libros ---------- */
      (function () {
        var p = polar(6.6, 180), g = new THREE.Group();
        var tabla = new THREE.Mesh(geo(new THREE.BoxGeometry(2.4, 0.08, 1.1)), matMadera); tabla.position.y = 0.85; g.add(tabla);
        [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]].forEach(function (q) { var pata = new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.85, 0.08)), matMadera); pata.position.set(q[0], 0.42, q[1]); g.add(pata); });
        /* vela de verdad */
        var vela = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 12)), mat(cTinta)); vela.position.set(0.9, 1.02, -0.25); g.add(vela);
        var llamaM = new THREE.MeshBasicMaterial({ color: cVela }); aDescartar.push(llamaM);
        var llama = new THREE.Mesh(geo(new THREE.ConeGeometry(0.035, 0.1, 10)), llamaM); llama.position.set(0.9, 1.2, -0.25); g.add(llama);
        var luz = new THREE.PointLight(cVela, 1.1, 5, 1.8); luz.position.set(0.9, 1.35, -0.25); g.add(luz);
        if (!quieto) animados.push(function (t) { var f = 1 + 0.12 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23); luz.intensity = 1.1 * f; llama.scale.y = f; });
        var tonos = ['#7b2d26', '#2d4a6b', '#3f5a33', '#6b4a2d', '#4b3566'];
        modelo.libros.forEach(function (b, i) {
          var libro = new THREE.Mesh(geo(new THREE.BoxGeometry(0.32, 0.07 + (i % 2) * 0.02, 0.45)), mat(new THREE.Color(tonos[i % tonos.length]), { roughness: 0.6 }));
          libro.position.set(-0.85 + i * 0.42, 0.93 + (i % 2) * 0.01, 0.05); libro.rotation.y = (i % 2 ? 0.15 : -0.1); g.add(libro);
          var et = texto([b.nombre], { tam: 40, escala: 0.0035 }); et.position.set(-0.85 + i * 0.42, 1.2, 0.05); g.add(et);
          tocable(libro, { titulo: b.nombre, texto: b.n ? (b.n === 1 ? L('1 apunte.', '1 note.') : L(b.n + ' apuntes.', b.n + ' notes.')) : L('En preparación. Acá van los apuntes de estudio.', 'In preparation. Study notes will go here.'), portada: b.nombre,
            botones: b.sec ? [[L('Abrir sección', 'Open section'), function () { acc.seccion(b.sec, b.sub); }]] : [] });
        });
        g.position.set(p.x, 0, p.z); g.rotation.y = p.rot; escena.add(g);
        obstaculos.push({ x: p.x, z: p.z, r: 1.45 });
        var et = texto([L('Mesa de estudio', 'Study desk')], { tam: 44, escala: 0.0045, fondo: col.hundido }); et.position.set(p.x, 1.9, p.z); escena.add(et);
      })();

      /* ---------- Muebles y puertas de OBJETOS_EXTRA ---------- */
      OBJETOS_EXTRA.forEach(function (o) {
        var p = polar(R - 0.05, o.angulo), g = new THREE.Group(), datos;
        var titulo = L(o.titulo[0], o.titulo[1]), txt = L(o.texto[0], o.texto[1]);
        if (o.tipo === 'puerta') {
          var marco = new THREE.Mesh(geo(new THREE.BoxGeometry(2.2, 3.4, 0.2)), matMetal); marco.position.y = 1.7; g.add(marco);
          var hoja = new THREE.Mesh(geo(new THREE.BoxGeometry(1.9, 3.15, 0.22)), o.cerrada ? matMadera : mat(cVela, { emissive: cVela, emissiveIntensity: 0.5 })); hoja.position.y = 1.6; g.add(hoja);
          var arco = new THREE.Mesh(geo(new THREE.CylinderGeometry(1.1, 1.1, 0.24, 24, 1, false, 0, Math.PI)), matMetal); arco.rotation.set(Math.PI / 2, 0, Math.PI / 2); arco.position.y = 3.4; g.add(arco);
          datos = { titulo: titulo, texto: txt, botones: o.accion === 'archivo' ? [[L('Entrar', 'Enter'), acc.archivo]] : [] };
        } else if (o.tipo === 'estanteria') {
          var cuerpo = new THREE.Mesh(geo(new THREE.BoxGeometry(2.6, 3, 0.45)), matMadera); cuerpo.position.set(0, 1.5, 0.25); g.add(cuerpo);
          var hueco = new THREE.Mesh(geo(new THREE.BoxGeometry(2.4, 2.8, 0.3)), matOscuro); hueco.position.set(0, 1.5, 0.42); g.add(hueco);
          for (var e = 0; e < 4; e++) { var est = new THREE.Mesh(geo(new THREE.BoxGeometry(2.4, 0.05, 0.4)), matMadera); est.position.set(0, 0.35 + e * 0.75, 0.3); g.add(est); }
          var tonos = ['#7b2d26', '#2d4a6b', '#3f5a33', '#6b4a2d', '#4b3566', '#8a6a2a'];
          for (var b = 0; b < 9; b++) { var lomo = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.5 + (b % 3) * 0.08, 0.3)), mat(new THREE.Color(tonos[b % tonos.length]))); lomo.position.set(-1.05 + b * 0.12, 0.65 + (b % 3) * 0.04, 0.35); g.add(lomo); }
          datos = { titulo: titulo, texto: txt, botones: [] };
        }
        g.position.set(p.x, 0, p.z); g.rotation.y = p.rot + Math.PI; escena.add(g);
        tocable(g, datos);
        var et = texto([titulo], { tam: 44, escala: 0.0045, fondo: col.hundido });
        var pe = polar(R - 0.6, o.angulo); et.position.set(pe.x, o.tipo === 'puerta' ? 4.2 : 3.4, pe.z); escena.add(et);
      });

      /* ---------- Cámara y movimiento ---------- */
      var pos = new THREE.Vector3(0, OJOS, 5.9), yaw = 0, pitch = 0.04, destino = null;
      var teclas = {};
      function libre(x, z) {
        if (Math.hypot(x, z) > R - 0.7) return false;
        for (var i = 0; i < obstaculos.length; i++) { var o = obstaculos[i]; if (Math.hypot(x - o.x, z - o.z) < o.r) return false; }
        return true;
      }
      function mover(dx, dz) {
        if (libre(pos.x + dx, pos.z + dz)) { pos.x += dx; pos.z += dz; return true; }
        if (libre(pos.x + dx, pos.z)) { pos.x += dx; return true; }
        if (libre(pos.x, pos.z + dz)) { pos.z += dz; return true; }
        return false;
      }
      function volverEntrada() { pos.set(0, OJOS, 5.9); yaw = 0; pitch = 0.04; destino = null; }
      cont.querySelector('.sala-centro').addEventListener('click', function () { volverEntrada(); cerrarCartel(); });
      var botonCompleta = cont.querySelector('.sala-completa');
      if (botonCompleta) {
        botonCompleta.addEventListener('click', function () {
          if (document.fullscreenElement === cont) document.exitFullscreen().catch(function () {});
          else cont.requestFullscreen().catch(function () {});
        });
        document.addEventListener('fullscreenchange', function () {
          var dentro = document.fullscreenElement === cont;
          botonCompleta.textContent = dentro ? L('Salir de pantalla completa', 'Exit full screen') : L('Pantalla completa', 'Full screen');
          botonCompleta.setAttribute('aria-pressed', String(dentro));
          setTimeout(medir, 60);
        });
      }

      var raton = new THREE.Vector2(), rayo = new THREE.Raycaster();
      var arrastre = null, resaltado = null;
      function aNDC(ev) { var r = renderer.domElement.getBoundingClientRect(); raton.x = ((ev.clientX - r.left) / r.width) * 2 - 1; raton.y = -((ev.clientY - r.top) / r.height) * 2 + 1; }
      function tocar(ev) {
        aNDC(ev); rayo.setFromCamera(raton, camara);
        var hits = rayo.intersectObjects(interactivos, false);
        return hits.length ? hits[0] : null;
      }
      function abrirCartel(d) {
        cartel.innerHTML = (d.portada ? '<div class="sala-portada"><span>' + A.esc(d.portada) + '</span></div>' : '') +
          '<h3>' + A.esc(d.titulo) + '</h3><p>' + A.esc(d.texto || '') + '</p><div class="sala-acciones"></div>';
        var cajaBotones = cartel.querySelector('.sala-acciones');
        (d.botones || []).forEach(function (b, i) { var el = document.createElement('button'); el.type = 'button'; el.className = 'btn ' + (i ? 'btn-ghost' : 'btn-primary'); el.textContent = b[0]; el.addEventListener('click', b[1]); cajaBotones.appendChild(el); });
        var cerrar = document.createElement('button'); cerrar.type = 'button'; cerrar.className = 'btn btn-ghost'; cerrar.textContent = L('Cerrar', 'Close'); cerrar.addEventListener('click', cerrarCartel); cajaBotones.appendChild(cerrar);
        cartel.hidden = false;
        var primero = cajaBotones.querySelector('button'); if (primero) primero.focus({ preventScroll: true });
      }
      function cerrarCartel() { cartel.hidden = true; }

      var lienzoEl = renderer.domElement;
      lienzoEl.style.touchAction = 'none';
      lienzoEl.addEventListener('pointerdown', function (ev) { etiqueta.hidden = true; arrastre = { x: ev.clientX, y: ev.clientY, yaw: yaw, pitch: pitch, movido: false }; lienzoEl.setPointerCapture(ev.pointerId); });
      lienzoEl.addEventListener('pointermove', function (ev) {
        if (arrastre) {
          var dx = ev.clientX - arrastre.x, dy = ev.clientY - arrastre.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) arrastre.movido = true;
          yaw = arrastre.yaw + dx * 0.005; pitch = Math.max(-0.6, Math.min(1.2, arrastre.pitch + dy * 0.004));
          return;
        }
        if (ev.pointerType !== 'mouse') return;
        var h = tocar(ev), d = h && h.object.userData.datos;
        lienzoEl.style.cursor = d ? 'pointer' : (h && h.object.userData.piso ? 'crosshair' : 'grab');
        if (d) { etiqueta.textContent = d.titulo; etiqueta.style.left = (ev.offsetX + 14) + 'px'; etiqueta.style.top = (ev.offsetY + 10) + 'px'; etiqueta.hidden = false; }
        else etiqueta.hidden = true;
        resaltar(d ? h.object : null);
      });
      lienzoEl.addEventListener('pointerup', function (ev) {
        var era = arrastre; arrastre = null;
        if (!era || era.movido) return;
        var h = tocar(ev); if (!h) return;
        var d = h.object.userData.datos;
        if (d) { abrirCartel(d); return; }
        if (h.object.userData.piso) { destino = new THREE.Vector3(h.point.x, OJOS, h.point.z); cerrarCartel(); }
      });
      lienzoEl.addEventListener('pointerleave', function () { etiqueta.hidden = true; resaltar(null); });
      function resaltar(obj) {
        if (resaltado === obj) return;
        if (resaltado && resaltado.material && resaltado.material.emissive && resaltado.userData.emisivoOriginal !== undefined) resaltado.material.emissiveIntensity = resaltado.userData.emisivoOriginal;
        resaltado = obj;
        if (obj && obj.material && obj.material.emissive) { if (obj.userData.emisivoOriginal === undefined) obj.userData.emisivoOriginal = obj.material.emissiveIntensity; obj.material.emissiveIntensity = obj.userData.emisivoOriginal + 0.6; }
      }
      /* Teclado: solo cuando la sala tiene el foco o el mouse encima */
      cont.tabIndex = 0;
      cont.setAttribute('aria-label', L('Sala del observatorio. Usá las flechas para caminar.', 'Observatory hall. Use the arrow keys to walk.'));
      function tecla(ev, abajo) {
        var k = ev.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].indexOf(k) === -1) { if (abajo && k === 'escape') cerrarCartel(); return; }
        if (ev.target.closest && ev.target.closest('button, input, textarea')) return;
        teclas[k] = abajo; ev.preventDefault();
      }
      cont.addEventListener('keydown', function (ev) { tecla(ev, true); });
      cont.addEventListener('keyup', function (ev) { tecla(ev, false); });
      cont.addEventListener('blur', function () { teclas = {}; }, true);

      /* ---------- Tamaño y bucle ---------- */
      function medir() {
        var w = lienzo.clientWidth || 800, h = lienzo.clientHeight || 500;
        renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
      }
      medir();
      var ro = new ResizeObserver(medir); ro.observe(lienzo);
      var reloj = new THREE.Clock(), vivo = true;
      function cuadro() {
        if (!vivo) return;
        if (!cont.isConnected) { limpiar(); return; }
        requestAnimationFrame(cuadro);
        if (document.hidden) return;
        var dt = Math.min(reloj.getDelta(), 0.1), t = reloj.elapsedTime;
        var adelante = (teclas.arrowup || teclas.w ? 1 : 0) - (teclas.arrowdown || teclas.s ? 1 : 0);
        var costado = (teclas.d ? 1 : 0) - (teclas.a ? 1 : 0);
        var girar = (teclas.arrowleft ? 1 : 0) - (teclas.arrowright ? 1 : 0);
        yaw += girar * dt * 1.6;
        var vel = 3 * dt;
        if (adelante || costado) { destino = null; mover((-Math.sin(yaw) * adelante + Math.cos(yaw) * costado) * vel, (-Math.cos(yaw) * adelante - Math.sin(yaw) * costado) * vel); }
        if (destino) {
          var dx = destino.x - pos.x, dz = destino.z - pos.z, dist = Math.hypot(dx, dz);
          if (dist < 0.08 || !mover(dx / dist * Math.min(vel, dist), dz / dist * Math.min(vel, dist))) destino = null;
        }
        camara.position.copy(pos);
        var mira = new THREE.Vector3(pos.x - Math.sin(yaw) * Math.cos(pitch), pos.y + Math.sin(pitch), pos.z - Math.cos(yaw) * Math.cos(pitch));
        camara.lookAt(mira);
        for (var i = 0; i < animados.length; i++) animados[i](t, dt);
        renderer.render(escena, camara);
      }
      function limpiar() {
        vivo = false; ro.disconnect();
        aDescartar.forEach(function (x) { try { x.dispose(); } catch (e) {} });
        renderer.dispose();
      }
      requestAnimationFrame(cuadro);
    });
  }

  A.sala = { montar: montar, soportado: soportado, OBJETOS_EXTRA: OBJETOS_EXTRA };
})();
