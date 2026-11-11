/* =====================================================================
   CIELO: la parte animada del tema "Archivo de las Sombras".
   Va al final de index.html y no depende de nada más del sitio.

   Qué hace:
     1. Polvo de estrellas que flota muy lento en un lienzo encima de la
        página (no bloquea clics ni scroll).
     2. Luz de vela donde está el mouse: las estrellas cercanas se unen
        en una constelación.
     3. Cursor de estrellita con una estela corta de chispas.
     4. Portadas automáticas: a cada historia sin portada le dibuja una
        constelación a partir del título (siempre la misma).
     5. Marca si se está leyendo un capítulo, para velar más el fondo.
     6. Tres interruptores en el pie; la elección se guarda en el navegador.

   Respeta "reducir movimiento" del sistema (el cielo queda quieto) y el
   tema "Baja visión" (no dibuja nada). En celulares no hay vela ni cursor.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  var punteroFino = window.matchMedia('(pointer: fine)');
  function bajaVision() { return root.getAttribute('data-reader-theme') === 'lowvision'; }

  /* ---------- Preferencias guardadas ---------- */
  function leer(k, def) { try { var v = localStorage.getItem(k); return v === null ? def : v === '1'; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} }
  var pref = {
    estrellas: leer('cielo.estrellas', true),
    vela: leer('cielo.vela', true),
    cursor: leer('cielo.cursor', true)
  };

  /* ---------- Vista: portada o lectura de un capítulo ---------- */
  function marcarVista() {
    var lectura = /^#\/w\/[^/]+\/c\//.test(location.hash);
    root.setAttribute('data-vista', lectura ? 'lectura' : 'archivo');
  }
  window.addEventListener('hashchange', marcarVista);
  marcarVista();

  /* ---------- Cursor de estrellita ---------- */
  function aplicarCursor() { root.classList.toggle('cursor-estrella', pref.cursor && punteroFino.matches && !bajaVision()); }
  aplicarCursor();

  /* ---------- Portadas automáticas (constelaciones) ---------- */
  function semilla(txt) { var h = 2166136261; for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function azar(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function constelacion(titulo, caps, terminada) {
    var r = azar(semilla(titulo || 'sin título'));
    var n = Math.max(4, Math.min(8, caps || 4));
    var pts = [], i, s = '';
    for (i = 0; i < n; i++) pts.push([12 + r() * 76, 14 + r() * 122]);
    pts.sort(function (a, b) { return a[1] - b[1]; });
    for (i = 0; i < 26; i++) s += '<circle cx="' + (r() * 100).toFixed(1) + '" cy="' + (r() * 150).toFixed(1) + '" r="' + (0.3 + r() * 0.6).toFixed(2) + '" fill="var(--ink)" opacity="' + (0.15 + r() * 0.35).toFixed(2) + '"/>';
    var lit = terminada ? n : Math.max(1, Math.round(n * 0.6));
    for (i = 0; i < n - 1; i++) {
      var on = i < lit - 1;
      s += '<line x1="' + pts[i][0].toFixed(1) + '" y1="' + pts[i][1].toFixed(1) + '" x2="' + pts[i + 1][0].toFixed(1) + '" y2="' + pts[i + 1][1].toFixed(1) + '" stroke="' + (on ? 'var(--accent)' : 'var(--ink)') + '" stroke-width="' + (on ? 1 : 0.7) + '" opacity="' + (on ? 0.8 : 0.25) + '"' + (on ? '' : ' stroke-dasharray="2 3"') + '/>';
    }
    for (i = 0; i < n; i++) {
      var l = i < lit;
      if (l) s += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="6" fill="var(--accent)" opacity="0.13"/>';
      s += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="' + (l ? 2.3 : 1.6) + '" fill="' + (l ? 'var(--accent)' : 'var(--ink)') + '" opacity="' + (l ? 1 : 0.5) + '"/>';
    }
    return '<svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + s + '</svg>';
  }
  function portadas(scope) {
    var fichas = (scope || document).querySelectorAll('.blurb:not(.blurb-with-cover):not([data-cielo])');
    for (var i = 0; i < fichas.length; i++) {
      var f = fichas[i];
      f.setAttribute('data-cielo', '1');
      var enlace = f.querySelector('.blurb-title a');
      if (!enlace) continue;
      var caps = 0, dd = f.querySelectorAll('.wstats dd');
      for (var j = 0; j < dd.length; j++) { var m = /^(\d+)\s*\//.exec(dd[j].textContent.trim()); if (m) { caps = Number(m[1]); break; } }
      var terminada = !!f.querySelector('.st-done');
      var cuerpo = document.createElement('div');
      while (f.firstChild) cuerpo.appendChild(f.firstChild);
      var a = document.createElement('a');
      a.href = enlace.getAttribute('href');
      a.tabIndex = -1;
      a.setAttribute('aria-hidden', 'true');
      a.className = 'blurb-const';
      a.innerHTML = constelacion(enlace.textContent.trim(), caps, terminada);
      f.classList.add('blurb-with-cover');
      f.appendChild(a);
      f.appendChild(cuerpo);
    }
  }

  /* ---------- Interruptores en el pie ---------- */
  function interruptores() {
    var pie = document.querySelector('#site-footer .ftr-in');
    if (!pie || pie.querySelector('.ftr-cielo')) return;
    var en = (root.lang || 'es').indexOf('en') === 0;
    var p = document.createElement('p');
    p.className = 'ftr-cielo';
    p.setAttribute('role', 'group');
    p.setAttribute('aria-label', en ? 'Night sky animation' : 'Animación del cielo');
    p.innerHTML =
      '<label for="cielo-estrellas"><input type="checkbox" id="cielo-estrellas"' + (pref.estrellas ? ' checked' : '') + '> ' + (en ? 'Stardust' : 'Polvo de estrellas') + '</label>' +
      '<label for="cielo-vela"><input type="checkbox" id="cielo-vela"' + (pref.vela ? ' checked' : '') + '> ' + (en ? 'Candlelight on the mouse' : 'Luz de vela en el mouse') + '</label>' +
      '<label for="cielo-cursor"><input type="checkbox" id="cielo-cursor"' + (pref.cursor ? ' checked' : '') + '> ' + (en ? 'Star cursor' : 'Cursor de estrellita') + '</label>';
    pie.appendChild(p);
    p.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'cielo-estrellas') { pref.estrellas = e.target.checked; guardar('cielo.estrellas', pref.estrellas); arrancar(); }
      if (id === 'cielo-vela') { pref.vela = e.target.checked; guardar('cielo.vela', pref.vela); if (!anim) dibujar(0, false); }
      if (id === 'cielo-cursor') { pref.cursor = e.target.checked; guardar('cielo.cursor', pref.cursor); chispas = []; aplicarCursor(); }
    });
  }

  /* ---------- Lienzo ---------- */
  var canvas = document.createElement('canvas');
  canvas.id = 'cielo';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, motas = [], chispas = [], ultChispa = 0;
  var mouse = { x: -9999, y: -9999, activo: false };
  var col = { tinta: '234,227,210', vela: '232,169,81' };

  function rgb(v) {
    v = (v || '').trim();
    if (v[0] === '#') {
      if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      var n = parseInt(v.slice(1, 7), 16);
      return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
    var m = /rgba?\(([^)]+)\)/.exec(v);
    return m ? m[1].split(',').slice(0, 3).join(',') : '200,200,200';
  }
  function leerColores() {
    var cs = getComputedStyle(root);
    col.tinta = rgb(cs.getPropertyValue('--ink'));
    col.vela = rgb(cs.getPropertyValue('--accent'));
  }

  function medir() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round((W * H) / (punteroFino.matches ? 9000 : 20000));
    motas = [];
    for (var i = 0; i < n; i++) {
      motas.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.1, vx: (Math.random() - 0.5) * 0.08, vy: -0.02 - Math.random() * 0.07, f: Math.random() * 6.28 });
    }
  }

  function dibujar(t, mover) {
    ctx.clearRect(0, 0, W, H);
    if (!pref.estrellas || bajaVision()) return;
    var vela = pref.vela && mouse.activo && punteroFino.matches;
    if (vela) {
      var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 170);
      g.addColorStop(0, 'rgba(' + col.vela + ',0.10)');
      g.addColorStop(1, 'rgba(' + col.vela + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(mouse.x - 170, mouse.y - 170, 340, 340);
    }
    var cerca = [];
    for (var i = 0; i < motas.length; i++) {
      var m = motas[i];
      if (mover) {
        m.x += m.vx; m.y += m.vy;
        if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
        if (m.x < -4) m.x = W + 4; else if (m.x > W + 4) m.x = -4;
      }
      var brillo = 0.22 + 0.22 * Math.sin(t * 0.0012 + m.f);
      var d = vela ? Math.hypot(m.x - mouse.x, m.y - mouse.y) : 9999;
      if (d < 140) cerca.push(m);
      ctx.fillStyle = d < 140 ? 'rgba(' + col.vela + ',' + (0.55 + brillo * 0.6).toFixed(3) + ')' : 'rgba(' + col.tinta + ',' + brillo.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    }
    if (cerca.length > 1) {
      ctx.lineWidth = 0.6;
      for (var a = 0; a < cerca.length; a++) {
        for (var b = a + 1; b < cerca.length; b++) {
          var dd = Math.hypot(cerca[a].x - cerca[b].x, cerca[a].y - cerca[b].y);
          if (dd < 80) {
            ctx.strokeStyle = 'rgba(' + col.vela + ',' + (0.35 * (1 - dd / 80)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(cerca[a].x, cerca[a].y); ctx.lineTo(cerca[b].x, cerca[b].y); ctx.stroke();
          }
        }
      }
    }
  }

  function dibujarChispas() {
    var ahora = performance.now(), vida = 650;
    chispas = chispas.filter(function (c) { return ahora - c.t < vida; });
    for (var i = 0; i < chispas.length; i++) {
      var c = chispas[i], edad = ahora - c.t, k = 1 - edad / vida;
      ctx.fillStyle = 'rgba(' + col.vela + ',' + (0.7 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(c.x + c.vx * edad, c.y + c.vy * edad, 0.4 + 1.1 * k, 0, 6.2832); ctx.fill();
    }
  }

  var anim = null, ultimo = 0, lentos = 0;
  function bucle(t) {
    if (ultimo) { if (t - ultimo > 32) lentos++; else lentos = Math.max(0, lentos - 1); }
    ultimo = t;
    /* Si la compu va lenta, saca la mitad de las estrellas */
    if (lentos > 90 && motas.length > 40) { motas = motas.slice(0, Math.floor(motas.length / 2)); lentos = 0; }
    dibujar(t, true);
    if (pref.cursor && root.classList.contains('cursor-estrella')) dibujarChispas();
    anim = requestAnimationFrame(bucle);
  }
  function arrancar() {
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    ultimo = 0;
    if (!pref.estrellas || document.hidden || bajaVision() || quieto.matches) { dibujar(0, false); return; }
    anim = requestAnimationFrame(bucle);
  }

  /* ---------- Eventos ---------- */
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.activo = true;
    var ahora = performance.now();
    if (anim && pref.cursor && ahora - ultChispa > 45) {
      chispas.push({ x: e.clientX, y: e.clientY, t: ahora, vx: (Math.random() - 0.5) * 0.02, vy: 0.012 + Math.random() * 0.02 });
      ultChispa = ahora;
      if (chispas.length > 22) chispas.shift();
    }
    if (!anim) dibujar(0, false);
  }, { passive: true });
  document.addEventListener('pointerleave', function () { mouse.activo = false; });
  document.addEventListener('visibilitychange', arrancar);
  window.addEventListener('resize', function () { medir(); arrancar(); });
  if (quieto.addEventListener) quieto.addEventListener('change', arrancar);
  if (punteroFino.addEventListener) punteroFino.addEventListener('change', function () { aplicarCursor(); medir(); arrancar(); });

  /* Cuando el lector cambia de tema (Ajustes de lectura) */
  new MutationObserver(function () { leerColores(); aplicarCursor(); arrancar(); })
    .observe(root, { attributes: true, attributeFilter: ['data-reader-theme'] });

  /* ---------- Arranque ---------- */
  function iniciar() {
    document.body.insertBefore(canvas, document.body.firstChild);
    leerColores();
    medir();
    arrancar();
    interruptores();
    portadas();
    var main = document.getElementById('main');
    if (main) new MutationObserver(function () { portadas(main); }).observe(main, { childList: true, subtree: true });
    var pie = document.getElementById('site-footer');
    if (pie) new MutationObserver(interruptores).observe(pie, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
