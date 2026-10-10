/* Utilidades compartidas: idioma, escape, fechas, conteo de palabras, diálogos y avisos */
(function () {
  const A = (window.Arch = window.Arch || {});

  /* ---------- Almacenamiento local seguro ---------- */
  A.ls = {
    get(k, def) {
      try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  A.ss = {
    get(k, def) {
      try { const v = sessionStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- Idioma ---------- */
  A.lang = A.ls.get('arch.lang', (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es');
  A.L = (es, en) => (A.lang === 'en' ? en : es);
  /* Elige el texto en el idioma actual; si falta, usa el otro */
  A.pick = (obj, lang) => {
    lang = lang || A.lang;
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    const other = lang === 'es' ? 'en' : 'es';
    return obj[lang] && String(obj[lang]).trim() ? obj[lang] : obj[other] || '';
  };
  A.has = (obj, lang) => !!(obj && obj[lang] && String(obj[lang]).trim());

  /* ---------- Texto y HTML ---------- */
  A.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  A.uid = (n = 10) => {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const r = crypto.getRandomValues(new Uint8Array(n));
    let s = '';
    for (const x of r) s += abc[x % 36];
    return s;
  };

  /* DOMParser no ejecuta scripts ni carga imágenes: seguro para analizar */
  A.parse = (html) => new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html').body;

  A.plainText = (html) => {
    const b = A.parse(html);
    b.querySelectorAll('script,style,noscript').forEach((e) => e.remove());
    b.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,br,blockquote').forEach((e) => e.append(' '));
    return (b.textContent || '').replace(/\s+/g, ' ').trim();
  };

  A.countWords = (html) => {
    const t = A.plainText(html);
    if (!t) return 0;
    return t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  };

  /* Bloques que pueden recibir comentarios por párrafo */
  A.PSEL = 'p,li,blockquote,h1,h2,h3,h4,h5,h6,figure,pre';
  /* Le pone un identificador estable a cada párrafo (data-pid) para los comentarios */
  A.ensurePids = (html) => {
    const b = A.parse(html);
    /* Texto suelto en el primer nivel se envuelve en <p> para que tenga su propio botón de comentario */
    const INLINE = /^(#text|A|B|STRONG|I|EM|U|S|SPAN|FONT|MARK|SMALL|SUB|SUP|CODE|BR|IMG)$/;
    let run = [];
    const flush = () => {
      if (run.some((n) => (n.nodeType === 3 ? n.textContent.trim() : n.nodeName !== 'BR'))) {
        const p = b.ownerDocument.createElement('p');
        run[0].before(p);
        run.forEach((n) => p.appendChild(n));
        while (p.lastChild && p.lastChild.nodeName === 'BR') p.lastChild.remove();
      }
      run = [];
    };
    [...b.childNodes].forEach((n) => {
      if (INLINE.test(n.nodeName)) run.push(n);
      else flush();
    });
    flush();
    /* Cada bloque de primer nivel (párrafo, chat, carta, tabla…) es una unidad comentable */
    [...b.children].forEach((el) => {
      if (/^(SCRIPT|STYLE|BR|HR|LINK|META)$/.test(el.nodeName)) return;
      if (!el.getAttribute('data-pid')) el.setAttribute('data-pid', A.uid(6));
    });
    return b.innerHTML;
  };

  A.fmtNum = (n) => new Intl.NumberFormat(A.lang === 'en' ? 'en-US' : 'es-AR').format(n || 0);
  A.fmtDate = (ms, withTime) => {
    if (!ms) return '—';
    const o = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
    return new Intl.DateTimeFormat(A.lang === 'en' ? 'en-US' : 'es-AR', o).format(new Date(ms));
  };
  A.timeAgo = (ms) => {
    if (!ms) return '';
    const s = Math.round((Date.now() - ms) / 1000);
    const rtf = new Intl.RelativeTimeFormat(A.lang === 'en' ? 'en' : 'es', { numeric: 'auto' });
    if (s < 60) return rtf.format(-s, 'second');
    if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
    if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
    if (s < 86400 * 30) return rtf.format(-Math.round(s / 86400), 'day');
    return A.fmtDate(ms);
  };
  /* Para inputs datetime-local */
  A.toLocalInput = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  A.readMinutes = (words) => Math.max(1, Math.round((words || 0) / 220));

  /* Estado de publicación */
  A.isVisible = (pubAt) => pubAt != null && pubAt <= Date.now();
  A.pubState = (pubAt) => (pubAt == null ? 'draft' : pubAt > Date.now() ? 'scheduled' : 'published');

  A.splitList = (s) =>
    String(s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x, i, arr) => arr.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);

  A.norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---------- Clasificaciones (como AO3) ---------- */
  A.RATINGS = {
    G: { es: 'Público general', en: 'General Audiences', short: 'G' },
    T: { es: 'Mayores de 13 años', en: 'Teen and Up (13+)', short: 'T' },
    M: { es: 'Maduro', en: 'Mature', short: 'M' },
    E: { es: 'Explícito', en: 'Explicit', short: 'E' },
  };

  /* ---------- Avisos y diálogos (sin alert/confirm del navegador) ---------- */
  A.toast = (msg, kind) => {
    let box = document.getElementById('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast-' + kind : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  };

  /* modal({title, html, actions:[{label, value, kind}]}) -> Promise(value) */
  A.modal = ({ title, html, actions, wide, onOpen }) =>
    new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `<div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title" class="modal-title">${A.esc(title || '')}</h2>
        <div class="modal-body">${html || ''}</div>
        <div class="modal-actions"></div></div>`;
      const act = wrap.querySelector('.modal-actions');
      const close = (v) => {
        wrap.remove();
        document.removeEventListener('keydown', onKey);
        resolve(v);
      };
      (actions || [{ label: A.L('Cerrar', 'Close'), value: null }]).forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost');
        b.textContent = a.label;
        b.onclick = () => close(typeof a.value === 'function' ? a.value(wrap) : a.value);
        act.appendChild(b);
      });
      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(null); });
      document.body.appendChild(wrap);
      if (onOpen) onOpen(wrap);
      const f = wrap.querySelector('input,textarea,select,.btn-primary');
      if (f) f.focus();
    });

  A.confirmDlg = (msg, okLabel, danger) =>
    A.modal({
      title: A.L('Confirmar', 'Confirm'),
      html: `<p>${A.esc(msg)}</p>`,
      actions: [
        { label: A.L('Cancelar', 'Cancel'), value: false },
        { label: okLabel || A.L('Aceptar', 'OK'), value: true, kind: danger ? 'danger' : 'primary' },
      ],
    });

  /* ask(title, [{id,label,value,type,placeholder}]) -> objeto con valores o null */
  A.ask = (title, fields, okLabel) =>
    A.modal({
      title,
      html: fields
        .map(
          (f) => `<label class="field"><span>${A.esc(f.label)}</span>
          ${
            f.type === 'textarea'
              ? `<textarea id="ask-${f.id}" rows="4" placeholder="${A.esc(f.placeholder || '')}">${A.esc(f.value || '')}</textarea>`
              : `<input id="ask-${f.id}" type="${f.type || 'text'}" value="${A.esc(f.value || '')}" placeholder="${A.esc(f.placeholder || '')}">`
          }</label>`
        )
        .join(''),
      actions: [
        { label: A.L('Cancelar', 'Cancel'), value: null },
        {
          label: okLabel || A.L('Aceptar', 'OK'),
          kind: 'primary',
          value: (w) => {
            const o = {};
            fields.forEach((f) => (o[f.id] = w.querySelector('#ask-' + f.id).value));
            return o;
          },
        },
      ],
    });

  /* Carga un script externo una sola vez */
  const loaded = {};
  A.loadScript = (src) =>
    loaded[src] ||
    (loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    }));

  /* Convierte links de YouTube o Spotify en reproductores incrustados */
  A.embedUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url.trim());
      const host = u.hostname.replace(/^www\.|^m\./, '');
      if (host === 'youtube.com' || host === 'music.youtube.com') {
        const list = u.searchParams.get('list');
        const v = u.searchParams.get('v');
        if (v) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}${list ? '?list=' + encodeURIComponent(list) : ''}` };
        if (list) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}` };
      }
      if (host === 'youtu.be') return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}` };
      if (host === 'open.spotify.com') {
        const parts = u.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'));
        if (parts.length >= 2) return { kind: 'spotify', src: `https://open.spotify.com/embed/${parts[0]}/${parts[1]}` };
      }
    } catch (e) {}
    return null;
  };
})();
