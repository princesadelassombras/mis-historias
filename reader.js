/* Lector: ficha de la obra con índice, capítulos, notas, playlist, comentarios por párrafo y reacciones */
(function () {
  const A = window.Arch;
  const L = (es, en) => A.L(es, en);
  const esc = A.esc;
  const $ = (s, r) => (r || document).querySelector(s);

  const R = (A.reader = { timers: [], tracking: false });

  /* Registra los intervalos que crean los scripts de cada historia para frenarlos al salir */
  const nativeSetInterval = window.setInterval.bind(window);
  window.setInterval = function (...args) {
    const id = nativeSetInterval(...args);
    if (R.tracking) R.timers.push(id);
    return id;
  };

  R.cleanup = () => {
    R.tracking = false;
    R.timers.forEach((id) => clearInterval(id));
    R.timers = [];
    document.querySelectorAll('#story-css, script[data-story-js]').forEach((e) => e.remove());
    document.body.classList.remove('drawer-open');
  };

  /* ---------- Aviso de clasificación / advertencias ---------- */
  const needsGate = (w) => {
    if (A.store.user()?.isAdmin) return false;
    const warns = (w.warnings || []).filter((x) => !A.warnNeutral(x));
    return w.rating === 'M' || w.rating === 'E' || warns.length > 0;
  };
  const gateOk = (w) => (A.ss.get('arch.gates', {}) || {})[w.id];
  const gate = (main, w, onPass) => {
    const warns = (w.warnings || []).filter((x) => !A.warnNeutral(x));
    const r = A.RATINGS[w.rating] || A.RATINGS.G;
    main.innerHTML = `<section class="gate page-narrow">
      <h1 class="page-title">${esc(A.pick(w.title))}</h1>
      <div class="gate-box">
        <p class="gate-rating">${A.ratingChip(w.rating)} <b>${esc(A.pick(r))}</b></p>
        ${w.rating === 'E' ? `<p>${L('Esta obra está clasificada como Explícita y es solo para personas mayores de 18 años.', 'This work is rated Explicit and is intended for readers 18 and over.')}</p>` : ''}
        ${w.rating === 'M' ? `<p>${L('Esta obra está clasificada como Madura: puede tener contenido para público adulto.', 'This work is rated Mature and may contain adult content.')}</p>` : ''}
        ${warns.length ? `<p><b>${L('Advertencias', 'Warnings')}:</b> ${warns.map((x) => esc(A.warnName(x))).join(', ')}</p>` : ''}
        <p>${L('¿Querés continuar?', 'Do you want to continue?')}</p>
        <div class="row-btns">
          <a class="btn btn-ghost" href="#/">${L('Volver', 'Go back')}</a>
          <button type="button" class="btn btn-primary" id="gate-ok">${w.rating === 'E' ? L('Tengo 18 años o más, continuar', "I'm 18 or older, continue") : L('Continuar', 'Continue')}</button>
        </div>
      </div></section>`;
    $('#gate-ok').onclick = () => {
      const g = A.ss.get('arch.gates', {}) || {};
      g[w.id] = true;
      A.ss.set('arch.gates', g);
      onPass();
    };
  };

  /* ---------- Bloque de metadatos estilo AO3 ---------- */
  const metaBox = (w, chapters) => {
    const inf = A.workInfo(w);
    const warns = (w.warnings || []);
    const row = (label, html) => (html ? `<div class="meta-row"><dt>${label}</dt><dd>${html}</dd></div>` : '');
    const tagList = (arr, cls) => (arr && arr.length ? `<ul class="taglist">${A.tagLinks(arr, cls)}</ul>` : '');
    return `<dl class="work-meta">
      ${row(L('Clasificación', 'Rating'), `${A.ratingChip(w.rating)} ${esc(A.pick(A.RATINGS[w.rating] || A.RATINGS.G))}`)}
      ${row(L('Advertencias', 'Warnings'), warns.map((x) => esc(A.warnName(x))).join(', '))}
      ${row(L('Sección', 'Section'), `${esc(A.secName(w.section))}${w.sub ? ' › ' + esc(A.subName(w.section, w.sub)) : ''}`)}
      ${row(L('Fandom', 'Fandom'), tagList(w.fandoms))}
      ${row(L('Relaciones', 'Relationships'), tagList(w.relationships, 'tag-rel'))}
      ${row(L('Personajes', 'Characters'), tagList(w.characters, 'tag-char'))}
      ${row(L('Etiquetas', 'Additional tags'), tagList(w.tags))}
      ${row(L('Idioma', 'Language'), inf.langs.map((l) => (l === 'es' ? 'Español' : 'English')).join(' · '))}
      <div class="meta-row meta-stats"><dt>${L('Estadísticas', 'Stats')}</dt><dd>
        <span>${L('Publicada', 'Published')}: ${A.fmtDate(w.pubAt)}</span>
        <span>${w.complete ? L('Terminada', 'Completed') : L('Actualizada', 'Updated')}: ${A.fmtDate(inf.updated)}</span>
        <span>${L('Palabras', 'Words')}: ${A.fmtNum(inf.words)}</span>
        <span>${L('Capítulos', 'Chapters')}: ${inf.chapters}/${w.complete ? inf.chapters : '?'}</span>
        <span>${L('Lecturas', 'Hits')}: ${A.fmtNum(w.views)}</span>
        <span>${L('Lectura aprox.', 'Reading time')}: ${A.readMinutes(inf.words)} min</span>
      </dd></div>
    </dl>`;
  };

  const tagClicks = (root) =>
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tag]');
      if (!t) return;
      A.filters = Object.assign({ q: '', inText: false, section: '', sub: '', ratings: [], complete: 'any', wMin: '', wMax: '', from: '', to: '', include: [], exclude: [], sort: 'updated' }, { include: [t.dataset.tag] });
      A.ss.set('arch.filters', A.filters);
      location.hash = '#/';
    });

  const followBtn = (w) =>
    `<button type="button" class="btn btn-ghost" id="btn-follow" aria-pressed="${A.isFollowing(w.id)}">${A.isFollowing(w.id) ? L('Siguiendo ✓', 'Following ✓') : L('Seguir', 'Follow')}</button>`;
  const wireFollow = (w) => {
    const b = $('#btn-follow');
    if (!b) return;
    b.onclick = () => {
      A.toggleFollow(w);
      b.setAttribute('aria-pressed', A.isFollowing(w.id));
      b.textContent = A.isFollowing(w.id) ? L('Siguiendo ✓', 'Following ✓') : L('Seguir', 'Follow');
      A.toast(A.isFollowing(w.id) ? L('Vas a ver un aviso cuando haya capítulos nuevos.', "You'll see a badge when new chapters come out.") : L('Dejaste de seguir esta obra.', 'Unfollowed.'));
    };
  };

  const loadWork = async (id) => {
    const admin = !!A.store.user()?.isAdmin;
    const w = await A.store.getWork(id, admin);
    if (!w) return null;
    const chapters = await A.store.listChapters(id, admin);
    return { w, chapters, admin };
  };

  const notFound = (main) => {
    main.innerHTML = `<div class="empty page-mid"><h1 class="page-title">${L('Esta obra no existe o todavía no se publicó', "This work doesn't exist or isn't published yet")}</h1><p><a href="#/">${L('Volver al inicio', 'Back home')}</a></p></div>`;
  };

  /* ---------- Ficha de la obra + índice ---------- */
  R.work = async (main, id) => {
    const data = await loadWork(id);
    if (!data) return notFound(main);
    const { w, chapters, admin } = data;
    if (needsGate(w) && !gateOk(w)) return gate(main, w, () => R.work(main, id));
    const titleMissing = !A.has(w.title, A.lang);
    main.innerHTML = `<article class="work page-mid">
      <header class="work-head">
        <p class="eyebrow">${esc(A.secName(w.section))}${w.sub ? ' › ' + esc(A.subName(w.section, w.sub)) : ''}</p>
        <h1 class="work-title">${esc(A.pick(w.title))}</h1>
        <p class="wbyline">${L('por', 'by')} ${esc(A.settings.authorName)}</p>
        ${titleMissing ? `<p class="lang-note">${L('Esta obra todavía no está traducida al español.', 'This work has not been translated to English yet.')}</p>` : ''}
        ${admin ? `<p class="admin-strip"><a class="btn btn-small" href="#/admin/w/${esc(w.id)}">${L('Editar obra', 'Edit work')}</a> <span class="pill pill-${A.pubState(w.pubAt)}">${({ draft: L('Borrador', 'Draft'), scheduled: L('Programada', 'Scheduled'), published: L('Publicada', 'Published') })[A.pubState(w.pubAt)]}</span></p>` : ''}
      </header>
      ${metaBox(w, chapters)}
      <section class="summary"><h2 class="sub-title">${L('Resumen', 'Summary')}</h2><p>${esc(A.pick(w.summary))}</p></section>
      <div class="row-btns">
        ${chapters.length ? `<a class="btn btn-primary" href="#/w/${esc(w.id)}/c/${esc(chapters[0].id)}">${L('Empezar a leer', 'Start reading')}</a>` : ''}
        ${followBtn(w)}
        ${chapters.length ? `<button type="button" class="btn btn-ghost" id="btn-pdf-all">${L('Descargar PDF', 'Download PDF')}</button>` : ''}
      </div>
      <section class="toc">
        <h2 class="sub-title">${L('Índice', 'Table of contents')}</h2>
        ${chapters.length ? `<ol class="toc-list">${chapters.map((c, i) => `<li>
            <a href="#/w/${esc(w.id)}/c/${esc(c.id)}"><span class="toc-n">${i + 1}.</span> <span class="toc-t">${esc(A.pick(c.title) || L('Capítulo', 'Chapter') + ' ' + (i + 1))}</span></a>
            <span class="toc-meta">${A.fmtDate(c.pubAt)} · ${A.fmtNum((c.words || {})[A.lang] || (c.words || {}).es || 0)} ${L('palabras', 'words')}
            ${A.pubState(c.pubAt) !== 'published' ? `<span class="pill pill-${A.pubState(c.pubAt)}">${A.pubState(c.pubAt) === 'draft' ? L('Borrador', 'Draft') : L('Programado', 'Scheduled') + ' ' + A.fmtDate(c.pubAt, true)}</span>` : ''}</span>
          </li>`).join('')}</ol>` : `<p class="hint">${L('Todavía no hay capítulos publicados.', 'No chapters published yet.')}</p>`}
      </section>
    </article>`;
    tagClicks(main.querySelector('.work-meta'));
    wireFollow(w);
    A.markSeen(w);
    if ($('#btn-pdf-all')) $('#btn-pdf-all').onclick = () => A.pdf.download(w, chapters.filter((c) => A.isVisible(c.pubAt) || admin), A.lang);
  };

  /* ---------- Capítulo ---------- */
  R.chapter = async (main, wid, cid) => {
    const data = await loadWork(wid);
    if (!data) return notFound(main);
    const { w, chapters, admin } = data;
    if (needsGate(w) && !gateOk(w)) return gate(main, w, () => R.chapter(main, wid, cid));
    const idx = chapters.findIndex((c) => c.id === cid);
    if (idx < 0) return notFound(main);
    const ch = chapters[idx];
    const prev = chapters[idx - 1];
    const next = chapters[idx + 1];
    const content = A.pick(ch.content);
    const fallback = !A.has(ch.content, A.lang);
    const embed = A.embedUrl(ch.playlist);
    const chTitle = A.pick(ch.title);

    const navBlock = (where) => `<nav class="ch-nav ch-nav-${where}" aria-label="${L('Navegación de capítulos', 'Chapter navigation')}">
      ${prev ? `<a class="btn btn-ghost" href="#/w/${esc(wid)}/c/${esc(prev.id)}">← ${L('Anterior', 'Previous')}</a>` : '<span></span>'}
      <a class="btn btn-ghost" href="#/w/${esc(wid)}">${L('Índice', 'Index')}</a>
      ${next ? `<a class="btn btn-primary" href="#/w/${esc(wid)}/c/${esc(next.id)}">${L('Siguiente', 'Next')} →</a>` : '<span></span>'}
    </nav>`;

    main.innerHTML = `<article class="chapter">
      <div class="ch-top page-read">
        <a class="ch-work" href="#/w/${esc(wid)}">${esc(A.pick(w.title))}</a>
        <label class="ch-select"><span class="sr">${L('Ir al capítulo', 'Go to chapter')}</span>
          <select id="ch-jump">${chapters.map((c, i) => `<option value="${esc(c.id)}" ${c.id === cid ? 'selected' : ''}>${i + 1}. ${esc(A.pick(c.title) || L('Capítulo', 'Chapter') + ' ' + (i + 1))}</option>`).join('')}</select>
        </label>
      </div>
      <header class="ch-head page-read">
        <p class="eyebrow">${L('Capítulo', 'Chapter')} ${idx + 1}${w.complete ? ' / ' + chapters.length : ''}</p>
        <h1 class="ch-title">${esc(chTitle || L('Capítulo', 'Chapter') + ' ' + (idx + 1))}</h1>
        <p class="ch-sub">${A.fmtDate(ch.pubAt)} · ${A.readMinutes((ch.words || {})[A.lang] || (ch.words || {}).es)} min ${L('de lectura', 'read')}
          ${admin ? ` · <a href="#/admin/w/${esc(wid)}/c/${esc(cid)}">${L('Editar capítulo', 'Edit chapter')}</a>` : ''}</p>
        ${fallback ? `<p class="lang-note">${L('Este capítulo todavía no está en español; se muestra en inglés.', "This chapter isn't available in English yet; showing the Spanish version.")}</p>` : ''}
      </header>
      ${A.has(ch.noteTop, A.lang) || A.has(ch.noteTop, 'es') || A.has(ch.noteTop, 'en') ? `<aside class="anote page-read"><h2 class="notes-h">${L('Notas de la autora', "Author's notes")}</h2><div class="prose">${A.pick(ch.noteTop)}</div></aside>` : ''}
      ${ch.playlist ? `<aside class="playlist page-read"><h2 class="notes-h">${L('Playlist del capítulo', 'Chapter playlist')}</h2>
        ${embed ? `<div class="embed embed-${embed.kind}"><iframe src="${esc(embed.src)}" title="${L('Playlist', 'Playlist')}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
        <p class="embed-link"><a href="${esc(ch.playlist)}" target="_blank" rel="noopener">${L('Abrir la playlist', 'Open the playlist')} ↗</a></p></aside>` : ''}
      <div class="story-wrap page-read">
        <div id="story-body" class="story-body${w.protect ? ' protected' : ''}"><div id="workskin">${content}</div></div>
      </div>
      ${A.has(ch.noteBottom, 'es') || A.has(ch.noteBottom, 'en') ? `<aside class="anote page-read"><h2 class="notes-h">${L('Notas finales', 'End notes')}</h2><div class="prose">${A.pick(ch.noteBottom)}</div></aside>` : ''}
      <div class="page-read">
        ${navBlock('bottom')}
        <section class="reactions" aria-label="${L('Reacciones', 'Reactions')}"><div id="react-bar" class="react-bar"></div></section>
        <div class="row-btns row-quiet">
          ${followBtn(w)}
          <button type="button" class="btn btn-ghost" id="btn-pdf">${L('Descargar capítulo en PDF', 'Download chapter as PDF')}</button>
        </div>
        <section class="comments" aria-labelledby="com-title">
          <h2 id="com-title" class="sub-title">${L('Comentarios', 'Comments')} <span id="com-count" class="muted"></span></h2>
          <div id="com-form-main"></div>
          <div id="com-list"></div>
        </section>
      </div>
    </article>
    <aside id="pc-drawer" class="drawer" aria-label="${L('Comentarios del párrafo', 'Paragraph comments')}" hidden></aside>`;

    /* Estilos propios de la obra y del capítulo */
    const css = (A.settings.globalCss || '') + '\n' + (w.css || '') + '\n' + (ch.css || '');
    if (css.trim()) {
      const st = document.createElement('style');
      st.id = 'story-css';
      st.textContent = css;
      document.head.appendChild(st);
    }
    const story = $('#story-body');
    /* Scripts propios: los que vienen dentro del HTML y el del capítulo */
    R.tracking = true;
    story.querySelectorAll('script').forEach((old) => {
      const s = document.createElement('script');
      [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
      s.setAttribute('data-story-js', '');
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
    if ((ch.js || '').trim()) {
      window.__storyEl = story;
      const s = document.createElement('script');
      s.setAttribute('data-story-js', '');
      s.textContent = `(function(story){try{\n${ch.js}\n}catch(e){console.error('Error en el script del capítulo:', e)}})(window.__storyEl);`;
      document.body.appendChild(s);
    }

    if (w.protect && !admin) protect(story);
    $('#ch-jump').onchange = (e) => (location.hash = `#/w/${wid}/c/${e.target.value}`);
    wireFollow(w);
    $('#btn-pdf').onclick = () => A.pdf.download(w, [ch], A.lang);
    A.markSeen(w);

    /* Una visita por capítulo por sesión */
    const seen = A.ss.get('arch.viewed', {}) || {};
    if (!seen[wid + '__' + cid] && !admin) {
      seen[wid + '__' + cid] = 1;
      A.ss.set('arch.viewed', seen);
      A.store.addView(wid, cid);
    }

    const key = wid + '__' + cid;
    renderReactions(key, wid);
    await renderComments(key, wid, story);
  };

  /* ---------- Protección contra copia (disuade, no es infalible) ---------- */
  function protect(el) {
    let warned = 0;
    const stop = (e) => {
      e.preventDefault();
      if (Date.now() - warned > 4000) {
        warned = Date.now();
        A.toast(L('La autora protegió este texto. Si querés compartirlo, pasá el link.', 'The author protected this text. Share the link instead.'));
      }
    };
    ['copy', 'cut', 'contextmenu', 'dragstart'].forEach((ev) => el.addEventListener(ev, stop));
  }

  /* ---------- Reacciones ---------- */
  async function renderReactions(key, wid) {
    const bar = $('#react-bar');
    if (!bar) return;
    const emojis = A.settings.emojis || [];
    let data;
    try { data = await A.store.getReactions(key, emojis); } catch (e) { data = { counts: {}, mine: new Set() }; }
    bar.innerHTML = emojis.map((e) => {
      const code = A.emojiCode(e);
      const on = data.mine.has(code);
      return `<button type="button" class="react ${on ? 'on' : ''}" data-emoji="${esc(e)}" aria-pressed="${on}" aria-label="${esc(e)} ${data.counts[code] || 0}">
        <span class="react-e" aria-hidden="true">${esc(e)}</span><span class="react-n">${data.counts[code] || 0}</span></button>`;
    }).join('');
    bar.onclick = async (ev) => {
      const b = ev.target.closest('[data-emoji]');
      if (!b) return;
      b.disabled = true;
      try {
        if (!A.store.user()) await A.store.signInReader();
        const on = b.getAttribute('aria-pressed') !== 'true';
        await A.store.toggleReaction(key, wid, b.dataset.emoji, on);
        await renderReactions(key, wid);
      } catch (e) {
        b.disabled = false;
        A.toast(e.message === 'blocked' ? L('No podés reaccionar en este sitio.', "You can't react on this site.") : L('No se pudo guardar la reacción. Probá de nuevo.', "Couldn't save your reaction. Try again."), 'err');
      }
    };
  }

  /* ---------- Comentarios ---------- */
  const commentText = (t) => esc(t).replace(/\n/g, '<br>');

  function commentItem(c, all, depth) {
    const admin = !!A.store.user()?.isAdmin;
    const kids = all.filter((k) => k.parentId === c.id);
    return `<li class="com" id="com-${esc(c.id)}">
      <div class="com-head"><b class="com-name">${esc(c.name)}</b>${c.isAuthor ? `<span class="pill pill-author">${L('Autora', 'Author')}</span>` : ''}
        <time class="muted">${A.timeAgo(c.createdAt)}</time></div>
      <p class="com-text">${commentText(c.text)}</p>
      <div class="com-actions">
        <button type="button" class="link-btn" data-reply="${esc(c.id)}">${L('Responder', 'Reply')}</button>
        ${admin ? `<button type="button" class="link-btn danger" data-del="${esc(c.id)}">${L('Borrar', 'Delete')}</button>
        ${!c.isAuthor ? `<button type="button" class="link-btn danger" data-block="${esc(c.uid)}" data-bname="${esc(c.name)}">${L('Bloquear', 'Block')}</button>` : ''}` : ''}
      </div>
      <div class="reply-slot" data-slot="${esc(c.id)}"></div>
      ${kids.length ? `<ol class="com-list ${depth >= 3 ? 'flat' : ''}">${kids.map((k) => commentItem(k, all, depth + 1)).join('')}</ol>` : ''}
    </li>`;
  }

  function formHtml(id) {
    const u = A.store.user();
    const needName = !u || (!u.isAdmin && !u.name);
    return `<form class="com-form" data-form="${id}">
      ${needName ? `<label class="field"><span>${L('Tu nombre o apodo', 'Your name or nickname')}</span><input name="name" maxlength="40" required autocomplete="nickname"></label>` : `<p class="muted com-as">${L('Comentás como', 'Commenting as')} <b>${esc(u.isAdmin ? A.settings.authorName : u.name)}</b></p>`}
      <label class="field"><span class="sr">${L('Comentario', 'Comment')}</span><textarea name="text" rows="3" maxlength="4000" required placeholder="${L('Escribí tu comentario…', 'Write a comment…')}"></textarea></label>
      <div class="row-btns"><button type="submit" class="btn btn-primary">${L('Publicar comentario', 'Post comment')}</button>
      ${needName && !A.store.demo ? `<button type="button" class="btn btn-ghost" data-google>${L('Comentar con Google', 'Comment with Google')}</button>` : ''}</div>
      <p class="hint">${L('Los comentarios se publican al instante. Solo la autora puede borrarlos.', 'Comments are published right away. Only the author can remove them.')}</p>
    </form>`;
  }

  async function submitForm(form, base) {
    const fd = new FormData(form);
    const text = String(fd.get('text') || '').trim();
    if (!text) return false;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      let u = A.store.user();
      const name = String(fd.get('name') || '').trim();
      if (!u || (!u.isAdmin && !u.name)) {
        if (!name) { btn.disabled = false; return false; }
        await A.store.signInReader(name);
        u = A.store.user();
      }
      await A.store.addComment(Object.assign({ text, name: u.isAdmin ? A.settings.authorName : u.name || name }, base));
      A.toast(L('Comentario publicado.', 'Comment posted.'));
      return true;
    } catch (e) {
      btn.disabled = false;
      A.toast(e.message === 'blocked' ? L('No podés comentar en este sitio.', "You can't comment on this site.") : L('No se pudo publicar. Revisá tu conexión y probá de nuevo.', "Couldn't post. Check your connection and try again."), 'err');
      return false;
    }
  }

  async function renderComments(key, wid, story) {
    let all = [];
    try { all = await A.store.listComments(key); } catch (e) { console.error(e); }
    const byPid = {};
    all.forEach((c) => { if (c.pid) (byPid[c.pid] = byPid[c.pid] || []).push(c); });
    const chapterLevel = all.filter((c) => !c.pid);
    const roots = chapterLevel.filter((c) => !c.parentId || !chapterLevel.some((p) => p.id === c.parentId));

    $('#com-count').textContent = all.length ? `(${all.length})` : '';
    $('#com-form-main').innerHTML = formHtml('main');
    $('#com-list').innerHTML = roots.length
      ? `<ol class="com-list">${roots.map((c) => commentItem(c, chapterLevel, 1)).join('')}</ol>`
      : `<p class="hint">${L('Todavía no hay comentarios. ¡Dejá el primero!', 'No comments yet. Be the first!')}</p>`;

    /* Burbujas de comentario en cada párrafo */
    story.querySelectorAll('.pc-btn, .pc-after').forEach((b) => b.remove());
    story.querySelectorAll('#workskin > [data-pid]').forEach((el) => {
      const n = (byPid[el.getAttribute('data-pid')] || []).length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pc-btn' + (n ? ' has' : '');
      b.setAttribute('contenteditable', 'false');
      b.dataset.pc = el.getAttribute('data-pid');
      b.setAttribute('aria-label', n ? L(`Ver ${n} comentarios de este párrafo`, `See ${n} comments on this paragraph`) : L('Comentar este párrafo', 'Comment on this paragraph'));
      b.innerHTML = `<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v8a1.5 1.5 0 0 1-1.5 1.5H8l-4 3v-3h.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>${n ? `<span>${n}</span>` : ''}`;
      /* En párrafos el botón va al final del texto; en chats, cartas y otros bloques va debajo, por fuera */
      if (/^(P|H[1-6]|BLOCKQUOTE|PRE)$/.test(el.nodeName)) {
        el.appendChild(document.createTextNode(' '));
        el.appendChild(b);
      } else {
        const after = document.createElement('div');
        after.className = 'pc-after';
        after.appendChild(b);
        el.after(after);
      }
    });

    const art = document.querySelector('.chapter');
    const refresh = () => renderComments(key, wid, story);

    /* Delegación: responder, borrar, bloquear, enviar */
    const onClick = async (e) => {
      const g = e.target.closest('[data-google]');
      if (g) { try { await A.store.signInGoogle(); refresh(); } catch (err) { A.toast(L('No se pudo iniciar sesión.', "Couldn't sign in."), 'err'); } return; }
      const rp = e.target.closest('[data-reply]');
      if (rp) {
        const slot = art.parentElement.querySelector(`[data-slot="${CSS.escape(rp.dataset.reply)}"]`);
        if (slot) { slot.innerHTML = slot.innerHTML ? '' : formHtml('reply:' + rp.dataset.reply); const t = slot.querySelector('textarea'); if (t) t.focus(); }
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        if (!(await A.confirmDlg(L('¿Borrar este comentario y sus respuestas?', 'Delete this comment and its replies?'), L('Borrar', 'Delete'), true))) return;
        await A.store.deleteComment(del.dataset.del);
        A.toast(L('Comentario borrado.', 'Comment deleted.'));
        refresh();
        return;
      }
      const bl = e.target.closest('[data-block]');
      if (bl) {
        if (!(await A.confirmDlg(L(`¿Bloquear a ${bl.dataset.bname}? No va a poder comentar ni reaccionar.`, `Block ${bl.dataset.bname}? They won't be able to comment or react.`), L('Bloquear', 'Block'), true))) return;
        await A.store.blockUser(bl.dataset.block, bl.dataset.bname);
        A.toast(L('Usuario bloqueado.', 'User blocked.'));
        return;
      }
      const pc = e.target.closest('[data-pc]');
      if (pc) { e.preventDefault(); openDrawer(pc.dataset.pc); }
    };
    const onSubmit = async (e) => {
      const form = e.target.closest('[data-form]');
      if (!form) return;
      e.preventDefault();
      const id = form.dataset.form;
      let base = { chapter: key, workId: wid, pid: null, parentId: null };
      if (id.startsWith('reply:')) {
        const parent = all.find((c) => c.id === id.slice(6));
        base.parentId = parent.id;
        base.pid = parent.pid || null;
      } else if (id.startsWith('pid:')) base.pid = id.slice(4);
      const ok = await submitForm(form, base);
      if (ok) {
        const reopen = base.pid ? base.pid : null;
        await refresh();
        if (reopen && R.openDrawer) R.openDrawer(reopen);
      }
    };
    R.openDrawer = openDrawer;
    art.parentElement.onclick = onClick;
    art.parentElement.onsubmit = onSubmit;

    function openDrawer(pid) {
      const dr = $('#pc-drawer');
      const el = story.querySelector(`[data-pid="${CSS.escape(pid)}"]`);
      const quote = el ? A.plainText(el.innerHTML) : '';
      const list = (byPid[pid] || []);
      const roots = list.filter((c) => !c.parentId || !list.some((p) => p.id === c.parentId));
      dr.innerHTML = `<div class="drawer-head"><h2 class="notes-h">${L('Comentarios del párrafo', 'Paragraph comments')}</h2>
          <button type="button" class="tool" id="dr-close" aria-label="${L('Cerrar', 'Close')}">×</button></div>
        <blockquote class="drawer-quote">${esc(quote.length > 220 ? quote.slice(0, 220) + '…' : quote)}</blockquote>
        ${roots.length ? `<ol class="com-list">${roots.map((c) => commentItem(c, list, 1)).join('')}</ol>` : `<p class="hint">${L('Nadie comentó este párrafo todavía.', 'No one has commented on this paragraph yet.')}</p>`}
        ${formHtml('pid:' + pid)}`;
      dr.hidden = false;
      document.body.classList.add('drawer-open');
      story.querySelectorAll('.pc-active').forEach((x) => x.classList.remove('pc-active'));
      if (el) el.classList.add('pc-active');
      $('#dr-close').onclick = closeDrawer;
      const t = dr.querySelector('textarea');
      if (t) t.focus({ preventScroll: true });
    }
    function closeDrawer() {
      const dr = $('#pc-drawer');
      if (dr) dr.hidden = true;
      document.body.classList.remove('drawer-open');
      story.querySelectorAll('.pc-active').forEach((x) => x.classList.remove('pc-active'));
    }
  }
})();
