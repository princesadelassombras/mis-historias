/* =====================================================================
   OBSERVATORIO: la sala de recepción del Archivo de las Sombras.
   Es la portada del sitio (#/). La lista con filtros pasó a #/archivo.

   El mapa:
     - Cielo exterior: cada fandom es una constelación y cada estrella
       es un fic de ese fandom (un crossover aparece en las dos).
     - Centro: el sistema solar. El Sol es la autora (abre «Sobre mí»);
       los planetas son las demás secciones (Originales, Crónicas,
       Investigación, Guiones…) y sus lunas, las subsecciones. Los
       planetas sin obras se ven apagados, con «Próximamente».
     - Alrededor: los instrumentos de la sección Facultad, uno por
       materia (subsección).

   Todo sale de los datos del sitio: si se agrega un fandom, una sección
   o una materia desde el Panel de autora, aparece sola en el mapa.
   Va en index.html después de app.js.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.Arch;
  if (!A || !A.views) return;
  var L = function (es, en) { return A.L(es, en); };
  var esc = A.esc;

  /* ---------- Ayudantes ---------- */
  function semilla(txt) { var h = 2166136261; for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function azar(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rad(g) { return g * Math.PI / 180; }
  function punto(cx, cy, r, g) { return [cx + r * Math.cos(rad(g)), cy + r * Math.sin(rad(g))]; }
  function f1(n) { return n.toFixed(1); }
  function cuenta(n) { return n === 1 ? L('1 obra', '1 work') : L(n + ' obras', n + ' works'); }
  function cuentaTP(n) { return n === 0 ? L('Sin trabajos todavía', 'No work yet') : n === 1 ? L('1 trabajo', '1 piece') : L(n + ' trabajos', n + ' pieces'); }
  function nombreCorto(f) { var p = f.split('|'); return (p.length > 1 ? p[p.length - 1] : f).trim(); }
  /* Parte un texto en renglones de hasta «max» letras */
  function renglones(txt, max) {
    var pal = txt.split(/\s+/), out = [], cur = '';
    pal.forEach(function (p) { if ((cur + ' ' + p).trim().length > max && cur) { out.push(cur); cur = p; } else cur = (cur + ' ' + p).trim(); });
    if (cur) out.push(cur);
    return out.slice(0, 3);
  }

  /* Ir a la lista del archivo con un filtro puesto */
  function irArchivo(filtro) {
    A.filters = Object.assign({ q: '', inText: false, section: '', sub: '', ratings: [], complete: 'any', wMin: '', wMax: '', from: '', to: '', include: [], exclude: [], sort: 'updated' }, filtro || {});
    A.ss.set('arch.filters', A.filters);
    location.hash = '#/archivo';
  }

  /* ---------- Instrumentos (dibujos de línea, uno por materia) ---------- */
  var INSTRUMENTOS = [
    { n: ['Telescopio', 'Telescope'], d: '<path d="M8 30 L38 14 L41 20 L11 36 Z"/><path d="M38 14 L44 11 L46 16 L41 20"/><path d="M24 27 L18 46 M24 27 L30 46 M24 27 L24 46"/><circle cx="24" cy="27" r="1.6"/>' },
    { n: ['Astrolabio', 'Astrolabe'], d: '<circle cx="24" cy="27" r="16"/><circle cx="24" cy="27" r="10"/><path d="M24 11 V43 M8 27 H40"/><path d="M24 27 L34 19"/><path d="M21 8 a3 3 0 1 1 6 0 a3 3 0 1 1 -6 0 M24 11 V10"/>' },
    { n: ['Sextante', 'Sextant'], d: '<path d="M8 38 A26 26 0 0 1 40 38"/><path d="M24 10 L8 38 M24 10 L40 38 M24 10 L30 38"/><path d="M10 34 l3 2 M38 34 l-3 2 M24 12 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0"/>' },
    { n: ['Globo celeste', 'Celestial globe'], d: '<circle cx="24" cy="22" r="14"/><ellipse cx="24" cy="22" rx="6" ry="14"/><path d="M10 22 H38"/><path d="M14 36 A14 14 0 0 0 34 36"/><path d="M24 36 V44 M16 44 H32"/>' },
    { n: ['Reloj de arena', 'Hourglass'], d: '<path d="M12 6 H36 M12 42 H36"/><path d="M15 6 C15 18 33 18 33 24 C33 30 15 30 15 42"/><path d="M33 6 C33 18 15 18 15 24 C15 30 33 30 33 42"/><path d="M19 38 Q24 33 29 38"/>' },
    { n: ['Compás de puntas', 'Dividers'], d: '<circle cx="24" cy="8" r="3"/><path d="M22 11 L12 42 M26 11 L36 42"/><path d="M15 30 Q24 26 33 30"/>' },
    { n: ['Esfera armilar', 'Armillary sphere'], d: '<circle cx="24" cy="21" r="14"/><ellipse cx="24" cy="21" rx="14" ry="5"/><ellipse cx="24" cy="21" rx="14" ry="5" transform="rotate(-35 24 21)"/><path d="M24 7 V35 M24 35 V42 M16 44 H32"/>' },
    { n: ['Cuadrante', 'Quadrant'], d: '<path d="M10 40 V10 A30 30 0 0 1 40 40 Z"/><path d="M10 40 L30 18"/><path d="M10 40 L28 33"/><circle cx="28" cy="33" r="1.6"/><path d="M14 16 h4 M14 22 h3"/>' }
  ];
  function icono(i) {
    var ins = INSTRUMENTOS[i % INSTRUMENTOS.length];
    return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ins.d + '</svg>';
  }

  /* ---------- La vista ---------- */
  A.views.observatorio = async function (main) {
    var s = A.settings;
    var admin = A.store.user() && A.store.user().isAdmin;
    var obras = (await A.getWorks()).filter(function (w) { return A.isVisible(w.pubAt) || admin; });
    var secciones = s.sections || [];
    var fic = secciones.find(function (x) { return x.id === 'fanfics'; }) || secciones.find(function (x) { return /fan/i.test(x.name.es || ''); });
    var facu = secciones.find(function (x) { return x.id === 'facultad' || /facultad|universi/i.test((x.name.es || '') + ' ' + (x.name.en || '')); });
    var estu = secciones.find(function (x) { return x.id === 'estudios' || /estudio|studies/i.test((x.name.es || '') + ' ' + (x.name.en || '')); });
    var planetas = secciones.filter(function (x) { return x !== fic && x !== facu && x !== estu; });
    var cuantas = function (sec, sub) { return obras.filter(function (w) { return w.section === sec && (sub === undefined || w.sub === sub); }).length; };
    /* Modelo para la sala en 3D (sala.js) */
    var modelo = { autora: s.authorName || '', constelaciones: [], planetas: [], materias: [], libros: [] };

    /* Constelaciones: fandoms de las obras de la sección de fics */
    var mapa = {}, orden = [];
    obras.filter(function (w) { return !fic || w.section === fic.id; }).forEach(function (w) {
      var lista = [];
      (w.fandoms || []).forEach(function (raw) { raw.split(/\s*;\s*/).forEach(function (f) { f = f.trim(); if (f) lista.push({ f: f, raw: raw }); }); });
      if (!lista.length) lista.push({ f: '', raw: '' });
      lista.forEach(function (x) {
        var k = x.f.toLowerCase();
        if (!mapa[k]) { mapa[k] = { nombre: x.f || L('Estrellas sueltas', 'Loose stars'), raw: x.raw, obras: [] }; orden.push(k); }
        if (mapa[k].obras.indexOf(w) === -1) mapa[k].obras.push(w);
      });
    });
    orden.sort(function (a, b) { return a === '' ? 1 : b === '' ? -1 : mapa[b].obras.length - mapa[a].obras.length || a.localeCompare(b); });

    var C = 500, svg = '';
    /* Esfera: anillos, horas en números romanos y marcas */
    svg += '<circle cx="500" cy="500" r="486" class="obs-disco"/>';
    svg += '<circle cx="500" cy="500" r="472" class="obs-anillo"/><circle cx="500" cy="500" r="466" class="obs-anillo fino"/>';
    for (var g = 0; g < 360; g += 5) {
      var p1 = punto(C, C, 466, g), p2 = punto(C, C, g % 30 === 0 ? 452 : 459, g);
      svg += '<line x1="' + f1(p1[0]) + '" y1="' + f1(p1[1]) + '" x2="' + f1(p2[0]) + '" y2="' + f1(p2[1]) + '" class="obs-marca"/>';
    }
    var romanos = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (var h = 0; h < 12; h++) {
      var pr = punto(C, C, 479.5, -90 + h * 30);
      svg += '<text x="' + f1(pr[0]) + '" y="' + f1(pr[1] + 4) + '" class="obs-hora" text-anchor="middle" transform="rotate(' + (h * 30) + ' ' + f1(pr[0]) + ' ' + f1(pr[1]) + ')">' + romanos[h] + '</text>';
    }
    for (var gr = 0; gr < 360; gr += 30) { var a1 = punto(C, C, 296, gr), a2 = punto(C, C, 450, gr); svg += '<line x1="' + f1(a1[0]) + '" y1="' + f1(a1[1]) + '" x2="' + f1(a2[0]) + '" y2="' + f1(a2[1]) + '" class="obs-meridiano"/>'; }
    svg += '<circle cx="500" cy="500" r="296" class="obs-ecuador"/><circle cx="500" cy="500" r="374" class="obs-meridiano"/>';

    /* Polvo de estrellas fijo del mapa */
    var r0 = azar(semilla('cielo del archivo'));
    for (var k0 = 0; k0 < 140; k0++) {
      var ang = r0() * 360, rr = 300 + r0() * 150, pp = punto(C, C, rr, ang);
      svg += '<circle cx="' + f1(pp[0]) + '" cy="' + f1(pp[1]) + '" r="' + (0.6 + r0() * 1.1).toFixed(2) + '" class="obs-polvo" style="--d:' + (r0() * 6).toFixed(1) + 's"/>';
    }

    /* Constelaciones */
    var N = Math.max(orden.length, 1), ancho = 360 / N;
    orden.forEach(function (k, i) {
      var c = mapa[k], centro = -90 + i * ancho + ancho / 2;
      var r = azar(semilla(k || 'sueltas'));
      var pts = c.obras.slice(0, 12).map(function (w) {
        var gg = centro + (r() - 0.5) * ancho * 0.62, ra = 318 + r() * 118;
        return { w: w, g: gg, ra: ra, p: punto(C, C, ra, gg) };
      }).sort(function (a, b) { return a.g - b.g; });
      modelo.constelaciones.push({ nombre: nombreCorto(c.nombre), raw: c.raw, centro: centro, estrellas: pts.map(function (q) { return { id: q.w.id, titulo: A.pick(q.w.title) || L('(sin título)', '(untitled)'), completa: !!q.w.complete, g: q.g, ra: q.ra }; }) });
      var lineas = '';
      for (var j = 0; j < pts.length - 1; j++) lineas += '<line x1="' + f1(pts[j].p[0]) + '" y1="' + f1(pts[j].p[1]) + '" x2="' + f1(pts[j + 1].p[0]) + '" y2="' + f1(pts[j + 1].p[1]) + '" class="obs-trazo"/>';
      var estrellas = pts.map(function (q) {
        var t = A.pick(q.w.title) || L('(sin título)', '(untitled)');
        return '<a href="#/w/' + esc(q.w.id) + '" class="obs-estrella" aria-label="' + esc(t + ' · ' + c.nombre) + '"><title>' + esc(t) + '</title>' +
          '<circle cx="' + f1(q.p[0]) + '" cy="' + f1(q.p[1]) + '" r="13" class="obs-halo"/>' +
          '<circle cx="' + f1(q.p[0]) + '" cy="' + f1(q.p[1]) + '" r="' + (q.w.complete ? 6 : 4.8) + '" class="obs-punto"/></a>';
      }).join('');
      var et = punto(C, C, 268, centro);
      var ren = renglones(nombreCorto(c.nombre), 16);
      var y0 = et[1] - (ren.length - 1) * 9;
      var etiqueta = '<a href="#/archivo" class="obs-fandom" data-fandom="' + esc(c.raw) + '" aria-label="' + esc(c.nombre + ': ' + cuenta(c.obras.length)) + '">' +
        '<text x="' + f1(et[0]) + '" y="' + f1(y0) + '" text-anchor="middle">' + ren.map(function (x, n) { return '<tspan x="' + f1(et[0]) + '" dy="' + (n ? 18 : 0) + '">' + esc(x) + '</tspan>'; }).join('') + '</text></a>';
      svg += '<g class="obs-constelacion">' + lineas + estrellas + '</g>' + (orden.length > 1 || k ? etiqueta : '');
    });

    /* Sistema solar: órbitas, planetas (secciones) y lunas (subsecciones) */
    var P = planetas.length;
    planetas.forEach(function (sec, i) {
      var ro = P === 1 ? 170 : 92 + i * (150 / Math.max(P - 1, 1));
      svg += '<circle cx="500" cy="500" r="' + f1(ro) + '" class="obs-orbita"/>';
    });
    var nombreAutora = s.authorName || '';
    svg += '<a href="#/about" class="obs-sol" aria-label="' + esc(L('El Sol: ', 'The Sun: ') + nombreAutora + ' · ' + L('Sobre mí', 'About me')) + '"><title>' + esc(L('Sobre mí', 'About me')) + '</title>' +
      '<circle cx="500" cy="500" r="62" class="obs-corona"/><circle cx="500" cy="500" r="36" class="obs-sol-disco"/>' +
      '<text x="500" y="506" text-anchor="middle" class="obs-sol-texto">' + esc(L('Sobre mí', 'About me')) + '</text></a>';
    planetas.forEach(function (sec, i) {
      var ro = P === 1 ? 170 : 92 + i * (150 / Math.max(P - 1, 1));
      var gp = -50 + i * 137.5;
      var pp2 = punto(C, C, ro, gp);
      var n = obras.filter(function (w) { return w.section === sec.id; }).length;
      var rp = n ? 11 + Math.min(n, 8) * 1.3 : 11;
      var nombre = A.pick(sec.name);
      modelo.planetas.push({ sec: sec.id, nombre: nombre, n: n, lunas: (sec.subs || []).map(function (sub) { return { sub: sub.id, nombre: A.pick(sub.name), n: cuantas(sec.id, sub.id) }; }) });
      var lunas = (sec.subs || []).map(function (sub, m) {
        var nm = obras.filter(function (w) { return w.section === sec.id && w.sub === sub.id; }).length;
        var pl = punto(pp2[0], pp2[1], rp + 17, -90 + m * (360 / Math.max(sec.subs.length, 1)));
        return '<a href="#/archivo" class="obs-luna' + (nm ? '' : ' apagada') + '" data-sec="' + esc(sec.id) + '" data-sub="' + esc(sub.id) + '" aria-label="' + esc(nombre + ' › ' + A.pick(sub.name) + ': ' + cuenta(nm)) + '"><title>' + esc(A.pick(sub.name)) + '</title><circle cx="' + f1(pl[0]) + '" cy="' + f1(pl[1]) + '" r="6" class="obs-blanco"/><circle cx="' + f1(pl[0]) + '" cy="' + f1(pl[1]) + '" r="2.6"/></a>';
      }).join('');
      var debajo = pp2[1] + rp + 32;
      svg += '<g class="obs-planeta' + (n ? '' : ' apagado') + '">' +
        '<a href="#/archivo" data-sec="' + esc(sec.id) + '" aria-label="' + esc(nombre + ': ' + (n ? cuenta(n) : L('próximamente', 'coming soon'))) + '"><title>' + esc(nombre) + '</title>' +
        '<circle cx="' + f1(pp2[0]) + '" cy="' + f1(pp2[1]) + '" r="' + f1(rp + 6) + '" class="obs-blanco"/>' +
        '<circle cx="' + f1(pp2[0]) + '" cy="' + f1(pp2[1]) + '" r="' + f1(rp) + '" class="obs-planeta-disco"/>' +
        '<text x="' + f1(pp2[0]) + '" y="' + f1(debajo) + '" text-anchor="middle" class="obs-planeta-nombre">' + esc(nombre) + '</text>' +
        '<text x="' + f1(pp2[0]) + '" y="' + f1(debajo + 17) + '" text-anchor="middle" class="obs-planeta-dato">' + esc(n ? cuenta(n) : L('Próximamente', 'Coming soon')) + '</text></a>' +
        lunas + '</g>';
    });

    /* Instrumentos de la Facultad. Cada materia «larga» (Gráfico I, II y III, por ejemplo)
       es UN instrumento con sus niveles; en el plano se ven todas, ordenadas por año.
       El año sale de sub.anio (lo carga el Panel); si falta, del número romano del nombre. */
    var materias = facu ? (facu.subs || []) : [];
    var ROMANO = { I: 1, II: 2, III: 3 };
    function familia(nombre) { return nombre.replace(/\s+(I{1,3})$/, '').trim(); }
    function nivel(nombre) { var m = nombre.match(/\s(I{1,3})$/); return m ? ROMANO[m[1]] : 0; }
    var familias = [], porFamilia = {};
    materias.forEach(function (sub) {
      var nom = A.pick(sub.name) || sub.id, fam = familia(nom), k = fam.toLowerCase();
      if (!porFamilia[k]) { porFamilia[k] = { nombre: fam, niveles: [] }; familias.push(porFamilia[k]); }
      porFamilia[k].niveles.push({ sec: facu.id, sub: sub.id, nombre: nom, nivel: nivel(nom), anio: +sub.anio || nivel(nom) || 0, n: cuantas(facu.id, sub.id) });
    });
    familias.forEach(function (f, i) {
      f.instrumento = i; f.n = f.niveles.reduce(function (t, x) { return t + x.n; }, 0);
      var ins = INSTRUMENTOS[i % INSTRUMENTOS.length];
      f.instrumentoNombre = L(ins.n[0], ins.n[1]);
      modelo.materias.push({ nombre: f.nombre, n: f.n, instrumento: i, instrumentoNombre: f.instrumentoNombre, niveles: f.niveles });
    });
    function iconoDe(sub) { var k = familia(A.pick(sub.name) || sub.id).toLowerCase(); return icono(porFamilia[k] ? porFamilia[k].instrumento : 0); }
    var NOMBRE_ANIO = { 1: L('Primer año', 'First year'), 2: L('Segundo año', 'Second year'), 3: L('Tercer año', 'Third year'), 0: L('Otras materias', 'Other subjects') };
    var anios = {};
    materias.forEach(function (sub) { var nom = A.pick(sub.name) || sub.id, a = +sub.anio || nivel(nom) || 0; (anios[a] = anios[a] || []).push(sub); });
    var instrHTML = [1, 2, 3, 0].filter(function (a) { return anios[a]; }).map(function (a) {
      return '<section class="obs-anio"><h3>' + esc(NOMBRE_ANIO[a]) + '</h3><ul class="obs-instrumentos">' + anios[a].map(function (sub) {
        var n = cuantas(facu.id, sub.id);
        return '<li><a href="#/archivo" class="instrumento' + (n ? '' : ' apagado') + '" data-sec="' + esc(facu.id) + '" data-sub="' + esc(sub.id) + '">' + iconoDe(sub) +
          '<span class="instrumento-materia">' + esc(A.pick(sub.name)) + '</span>' +
          '<span class="instrumento-dato">' + esc(cuentaTP(n)) + '</span></a></li>';
      }).join('') + '</ul></section>';
    }).join('');
    if (estu && (estu.subs || []).length) estu.subs.forEach(function (sub) { modelo.libros.push({ sec: estu.id, sub: sub.id, nombre: A.pick(sub.name), n: cuantas(estu.id, sub.id) }); });
    else [[L('Árabe', 'Arabic'), 'arabe'], [L('Sánscrito', 'Sanskrit'), 'sanscrito']].forEach(function (b) { modelo.libros.push({ sec: estu ? estu.id : '', sub: b[1], nombre: b[0], n: 0 }); });
    var sinMateria = facu ? obras.filter(function (w) { return w.section === facu.id && !w.sub; }).length : 0;

    /* Índice en texto: lo mismo que el mapa, para leer de corrido */
    var indice = orden.map(function (k) {
      var c = mapa[k];
      return '<li><button type="button" class="link-btn obs-ir" data-fandom="' + esc(c.raw) + '">' + esc(c.nombre) + '</button> <span class="muted">· ' + esc(cuenta(c.obras.length)) + '</span><ul>' +
        c.obras.map(function (w) { return '<li><a href="#/w/' + esc(w.id) + '">' + esc(A.pick(w.title) || L('(sin título)', '(untitled)')) + '</a></li>'; }).join('') + '</ul></li>';
    }).join('');

    main.innerHTML =
      '<section class="obs page-wide" aria-labelledby="obs-titulo">' +
        '<div class="obs-escena">' +
        '<div class="obs-vistas" role="tablist" aria-label="' + L('Cómo ver el observatorio', 'How to view the observatory') + '">' +
          '<button type="button" role="tab" class="sec-tab on" id="tab-sala" aria-selected="true" aria-controls="obs-sala">' + L('Recorrer la sala', 'Walk the hall') + '</button>' +
          '<button type="button" role="tab" class="sec-tab" id="tab-plano" aria-selected="false" aria-controls="obs-plano">' + L('Ver el plano', 'See the map') + '</button>' +
          '<a class="obs-vistas-archivo" href="#/archivo">' + L('Entrar al archivo →', 'Enter the archive →') + '</a>' +
        '</div>' +
        '<div class="obs-sala" id="obs-sala" role="tabpanel" aria-labelledby="tab-sala"><p class="obs-cargando">' + L('Encendiendo las velas…', 'Lighting the candles…') + '</p></div>' +
        '<div class="obs-plano" id="obs-plano" role="tabpanel" aria-labelledby="tab-plano" hidden>' +
          '<figure class="obs-mapa" tabindex="0" aria-label="' + L('Mapa estelar. Tocalo para agrandarlo.', 'Star map. Tap it to enlarge.') + '">' +
            '<div class="obs-mapa-barra">' +
              '<span class="obs-mapa-titulo">' + L('Mapa estelar', 'Star map') + '</span>' +
              '<button type="button" class="tool obs-zoom" data-zoom="-1" aria-label="' + L('Alejar', 'Zoom out') + '">−</button>' +
              '<button type="button" class="tool obs-zoom" data-zoom="1" aria-label="' + L('Acercar', 'Zoom in') + '">+</button>' +
              '<button type="button" class="btn btn-ghost obs-cerrar-mapa">' + L('Cerrar', 'Close') + '</button>' +
            '</div>' +
            '<div class="obs-mapa-marco">' +
            '<svg viewBox="0 0 1000 1000" role="group" aria-label="' + L('Mapa estelar del archivo', 'Star map of the archive') + '">' + svg + '</svg>' +
            '</div>' +
            '<p class="obs-mapa-pista">' + L('Tocá el mapa para verlo en grande', 'Tap the map to see it full size') + '</p>' +
            '<figcaption class="obs-leyenda">' +
              '<span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="5" fill="var(--accent)"/></svg>' + L('Estrella grande: terminada', 'Large star: complete') + '</span>' +
              '<span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6" fill="var(--accent)"/></svg>' + L('Estrella chica: en curso', 'Small star: in progress') + '</span>' +
              '<span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="var(--muted)" stroke-dasharray="2 2"/></svg>' + L('Planeta apagado: próximamente', 'Dim planet: coming soon') + '</span>' +
            '</figcaption>' +
          '</figure>' +
          (instrHTML ? '<div class="obs-facultad" aria-label="' + L('Facultad: materias por año', 'University: subjects by year') + '"><h2 class="obs-facultad-titulo">' + L('Instrumentos de la Facultad', 'University instruments') + '</h2><div class="obs-anios">' + instrHTML + '</div></div>' : '') +
        '</div>' +
        '</div>' +
        '<div class="obs-intro">' +
          '<p class="eyebrow">' + L('Sala de recepción · Observatorio', 'Reception hall · Observatory') + '</p>' +
          '<h1 class="intro-title" id="obs-titulo">' + esc(s.siteName) + '</h1>' +
          '<p class="intro-sub">' + esc(A.pick(s.tagline)) + '</p>' +
          '<p class="obs-guia">' + L('Las constelaciones son los fandoms y cada estrella es una historia. En el centro gira lo propio: el Sol soy yo y los planetas son mis secciones. Alrededor están los instrumentos de la facultad.', 'Constellations are fandoms and every star is a story. At the center, my own worlds: I am the Sun and the planets are my sections. Around them, the instruments from university.') + '</p>' +
          '<div class="row-btns"><a class="btn btn-primary" href="#/archivo">' + L('Entrar al archivo', 'Enter the archive') + '</a>' +
          '<a class="btn btn-ghost" href="#/about">' + L('Sobre mí', 'About me') + '</a></div>' +
        '</div>' +
        (facu && sinMateria ? '<p class="hint obs-nota">' + L('Hay ' + sinMateria + ' trabajo(s) de Facultad sin materia asignada.', sinMateria + ' university piece(s) have no subject yet.') + ' <a href="#/archivo" data-sec="' + esc(facu.id) + '">' + L('Verlos', 'See them') + '</a></p>' : '') +
        (indice ? '<details class="obs-indice"><summary>' + L('Índice del cielo: todas las constelaciones en lista', 'Sky index: every constellation as a list') + '</summary><ul>' + indice + '</ul></details>' : '') +
      '</section>';

    /* Clics que llevan al archivo filtrado */
    main.querySelector('.obs').addEventListener('click', function (e) {
      var a = e.target.closest('[data-fandom], [data-sec]');
      if (!a) return;
      e.preventDefault();
      if (a.hasAttribute('data-fandom')) irArchivo({ include: a.getAttribute('data-fandom') ? [a.getAttribute('data-fandom')] : [] });
      else irArchivo({ section: a.getAttribute('data-sec'), sub: a.getAttribute('data-sub') || '' });
    });

    /* Pestañas: sala en 3D o plano */
    var sala = main.querySelector('#obs-sala'), plano = main.querySelector('#obs-plano');
    var tabSala = main.querySelector('#tab-sala'), tabPlano = main.querySelector('#tab-plano');
    function mostrar(cual) {
      var enSala = cual === 'sala';
      sala.hidden = !enSala; plano.hidden = enSala;
      tabSala.classList.toggle('on', enSala); tabPlano.classList.toggle('on', !enSala);
      tabSala.setAttribute('aria-selected', String(enSala)); tabPlano.setAttribute('aria-selected', String(!enSala));
      try { sessionStorage.setItem('obs.vista', cual); } catch (e) {}
    }
    tabSala.addEventListener('click', function () { mostrar('sala'); });
    tabPlano.addEventListener('click', function () { mostrar('plano'); });
    /* La sala ocupa la pantalla: se descuenta el alto de la cabecera */
    var cab = document.getElementById('site-header');
    if (cab) document.documentElement.style.setProperty('--alto-cabecera', cab.offsetHeight + 'px');

    /* Mapa: al tocarlo se agranda a pantalla completa (y ahí sí se pueden tocar estrellas y planetas) */
    var fig = main.querySelector('.obs-mapa'), svgMapa = fig.querySelector('.obs-mapa-marco > svg'), zoom = 1;
    var marco = fig.querySelector('.obs-mapa-marco'), lugarMapa = document.createComment('mapa');
    /* tamaño base: el lado más corto de la pantalla; el zoom lo multiplica y se recorre con scroll */
    function ponerZoom(z) {
      var centroX = (marco.scrollLeft + marco.clientWidth / 2) / (marco.scrollWidth || 1), centroY = (marco.scrollTop + marco.clientHeight / 2) / (marco.scrollHeight || 1);
      zoom = Math.max(1, Math.min(4, z));
      var lado = Math.max(280, Math.min(marco.clientWidth, marco.clientHeight) - 32) * zoom;
      svgMapa.style.width = svgMapa.style.height = lado + 'px';
      marco.scrollLeft = centroX * marco.scrollWidth - marco.clientWidth / 2;
      marco.scrollTop = centroY * marco.scrollHeight - marco.clientHeight / 2;
    }
    window.addEventListener('resize', function () { if (fig.classList.contains('ampliado')) ponerZoom(zoom); });
    function teclaMapa(e) { if (e.key === 'Escape') cerrarMapa(); }
    function abrirMapa() {
      if (fig.classList.contains('ampliado')) return;
      /* se muda al final de la página para quedar por encima de la cabecera */
      fig.parentNode.insertBefore(lugarMapa, fig); document.body.appendChild(fig);
      fig.classList.add('ampliado'); fig.setAttribute('role', 'dialog'); fig.setAttribute('aria-modal', 'true');
      document.documentElement.classList.add('obs-sin-scroll');
      document.addEventListener('keydown', teclaMapa);
      ponerZoom(1);
      fig.querySelector('.obs-cerrar-mapa').focus({ preventScroll: true });
    }
    function cerrarMapa() {
      if (!fig.classList.contains('ampliado')) return;
      fig.classList.remove('ampliado'); fig.removeAttribute('role'); fig.removeAttribute('aria-modal');
      if (lugarMapa.parentNode) { lugarMapa.parentNode.insertBefore(fig, lugarMapa); lugarMapa.remove(); } else fig.remove();
      document.documentElement.classList.remove('obs-sin-scroll');
      document.removeEventListener('keydown', teclaMapa);
      svgMapa.style.width = svgMapa.style.height = '';
    }
    fig.addEventListener('click', function (e) {
      if (e.target.closest('.obs-cerrar-mapa')) { e.preventDefault(); cerrarMapa(); return; }
      var z = e.target.closest('.obs-zoom');
      if (z) { e.preventDefault(); ponerZoom(zoom + (+z.getAttribute('data-zoom')) * 0.5); return; }
      if (!fig.classList.contains('ampliado')) { e.preventDefault(); e.stopPropagation(); abrirMapa(); return; }
      /* ya agrandado: fandoms, planetas y lunas llevan al archivo filtrado */
      var a = e.target.closest('[data-fandom], [data-sec]');
      if (a) {
        e.preventDefault(); e.stopPropagation();
        if (a.hasAttribute('data-fandom')) irArchivo({ include: a.getAttribute('data-fandom') ? [a.getAttribute('data-fandom')] : [] });
        else irArchivo({ section: a.getAttribute('data-sec'), sub: a.getAttribute('data-sub') || '' });
      }
    }, true);
    fig.addEventListener('keydown', function (e) { if (e.target === fig && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirMapa(); } });
    /* Al salir de la portada, que no quede la página trabada */
    window.addEventListener('hashchange', function salir() { cerrarMapa(); window.removeEventListener('hashchange', salir); });

    var guardada = 'sala';
    try { guardada = sessionStorage.getItem('obs.vista') || 'sala'; } catch (e) {}
    var acciones = {
      obra: function (id) { location.hash = '#/w/' + encodeURIComponent(id); },
      seccion: function (sec, sub) { irArchivo({ section: sec, sub: sub || '' }); },
      fandom: function (raw) { irArchivo({ include: raw ? [raw] : [] }); },
      sobreMi: function () { location.hash = '#/about'; },
      archivo: function () { irArchivo({}); },
      L: L
    };
    if (A.sala && A.sala.soportado()) {
      mostrar(guardada);
      A.sala.montar(sala, modelo, acciones).catch(function (e) { console.error(e); sala.innerHTML = '<p class="hint">' + L('No se pudo cargar la sala en 3D. Abajo tenés el plano.', "The 3D hall couldn't load. Here's the map instead.") + '</p>'; mostrar('plano'); });
    } else {
      main.querySelector('.obs-vistas').hidden = true;
      mostrar('plano');
    }
  };
})();
