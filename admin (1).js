/* Panel de la autora: obras, capítulos con editor, ajustes del sitio, moderación y estadísticas */
(function () {
  const A = window.Arch;
  const L = (es, en) => A.L(es, en);
  const esc = A.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const AD = (A.admin = {});

  let dirty = false;
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Acceso ---------- */
  AD.route = async (main, parts) => {
    dirty = false;
    const u = A.store.user();
    if (!u || !u.isAdmin) return login(main, u);
    const sub = `<nav class="admin-nav" aria-label="${L('Panel', 'Dashboard')}">
      <a href="#/admin" class="${!parts.length ? 'on' : ''}">${L('Obras', 'Works')}</a>
      <a href="#/admin/comments" class="${parts[0] === 'comments' ? 'on' : ''}">${L('Comentarios', 'Comments')}</a>
      <a href="#/admin/stats" class="${parts[0] === 'stats' ? 'on' : ''}">${L('Estadísticas', 'Stats')}</a>
      <a href="#/admin/settings" class="${parts[0] === 'settings' ? 'on' : ''}">${L('Ajustes del sitio', 'Site settings')}</a>
    </nav>`;
    main.innerHTML = `<section class="admin page-wide">${sub}<div id="admin-body"></div></section>`;
    const body = $('#admin-body');
    if (!parts.length) return dashboard(body);
    if (parts[0] === 'w' && parts[2] === 'c') return chapterEditor(body, parts[1], parts[3]);
    if (parts[0] === 'w') return workEditor(body, parts[1]);
    if (parts[0] === 'settings') return settingsPage(body);
    if (parts[0] === 'comments') return moderation(body);
    if (parts[0] === 'stats') return stats(body);
    body.innerHTML = `<p>${L('Página no encontrada.', 'Page not found.')}</p>`;
  };

  function login(main, u) {
    main.innerHTML = `<section class="page-narrow login">
      <h1 class="page-title">${L('Acceso de la autora', 'Author access')}</h1>
      ${u && !u.anon
        ? `<p>${L('Iniciaste sesión, pero esta cuenta no figura como autora del sitio.', "You're signed in, but this account isn't set as the site's author.")}</p>
           <p>${L('Si sos la autora y estás configurando el sitio, este es tu UID. Pegalo en', "If you're the author setting up the site, this is your UID. Paste it into")} <code>js/config.js</code> ${L('y en', 'and')} <code>firestore.rules</code>:</p>
           <p class="uid-box"><code id="my-uid">${esc(u.uid)}</code> <button type="button" class="btn btn-small" id="copy-uid">${L('Copiar', 'Copy')}</button></p>
           <button type="button" class="btn btn-ghost" id="btn-signout">${L('Cerrar sesión', 'Sign out')}</button>`
        : `<p>${L('Entrá con tu cuenta de Google para editar el sitio.', 'Sign in with your Google account to edit the site.')}</p>
           <button type="button" class="btn btn-primary" id="btn-login">${A.store.demo ? L('Entrar como autora (demo)', 'Sign in as author (demo)') : L('Entrar con Google', 'Sign in with Google')}</button>`}
    </section>`;
    if ($('#btn-login')) $('#btn-login').onclick = async () => {
      try { await A.store.signInAdmin(); } catch (e) { A.toast(L('No se pudo iniciar sesión: ', "Couldn't sign in: ") + e.message, 'err'); }
    };
    if ($('#btn-signout')) $('#btn-signout').onclick = () => A.store.signOut();
    if ($('#copy-uid')) $('#copy-uid').onclick = async () => {
      try { await navigator.clipboard.writeText(u.uid); A.toast(L('UID copiado.', 'UID copied.')); }
      catch (e) { const r = document.createRange(); r.selectNodeContents($('#my-uid')); getSelection().removeAllRanges(); getSelection().addRange(r); }
    };
  }

  const stateLabel = (p) => ({ draft: L('Borrador', 'Draft'), scheduled: L('Programada', 'Scheduled'), published: L('Publicada', 'Published') })[A.pubState(p)];
  const statePill = (p) => `<span class="pill pill-${A.pubState(p)}">${stateLabel(p)}${A.pubState(p) === 'scheduled' ? ' · ' + A.fmtDate(p, true) : ''}</span>`;

  /* ---------- Listado de obras ---------- */
  async function dashboard(body) {
    const works = (await A.getWorks(true)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const counts = { draft: 0, scheduled: 0, published: 0 };
    works.forEach((w) => counts[A.pubState(w.pubAt)]++);
    body.innerHTML = `<div class="admin-head">
        <h1 class="page-title">${L('Tus obras', 'Your works')}</h1>
        <a class="btn btn-primary" href="#/admin/w/new">+ ${L('Nueva obra', 'New work')}</a>
      </div>
      <p class="summary-line">${A.fmtNum(counts.published)} ${L('publicadas', 'published')} · ${A.fmtNum(counts.scheduled)} ${L('programadas', 'scheduled')} · ${A.fmtNum(counts.draft)} ${L('borradores', 'drafts')}</p>
      ${works.length ? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>${L('Obra', 'Work')}</th><th>${L('Estado', 'Status')}</th><th class="num">${L('Caps.', 'Ch.')}</th><th class="num">${L('Palabras', 'Words')}</th><th class="num">${L('Lecturas', 'Hits')}</th><th>${L('Actualizada', 'Updated')}</th><th></th></tr></thead>
        <tbody>${works.map((w) => {
          const inf = A.workInfo(w);
          return `<tr>
            <td><a href="#/admin/w/${esc(w.id)}" class="strong">${esc(A.pick(w.title) || L('(sin título)', '(untitled)'))}</a><br><span class="muted sm">${esc(A.secName(w.section))}${w.sub ? ' › ' + esc(A.subName(w.section, w.sub)) : ''}</span></td>
            <td>${statePill(w.pubAt)}</td>
            <td class="num">${inf.chapters}/${A.chapterTotal(w, inf.chapters)}</td>
            <td class="num">${A.fmtNum(inf.words)}</td>
            <td class="num">${A.fmtNum(w.views)}</td>
            <td>${A.fmtDate(w.updatedAt)}</td>
            <td class="actions"><a href="#/admin/w/${esc(w.id)}">${L('Editar', 'Edit')}</a> · <a href="#/w/${esc(w.id)}">${L('Ver', 'View')}</a></td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        : `<div class="empty"><p>${L('Todavía no cargaste ninguna obra.', "You haven't added any works yet.")}</p><a class="btn btn-primary" href="#/admin/w/new">${L('Crear la primera', 'Create the first one')}</a></div>`}`;
  }

  /* ---------- Control de publicación: borrador / ahora / programar ---------- */
  function pubControl(prefix, pubAt) {
    const st = A.pubState(pubAt);
    return `<fieldset class="pub-control"><legend>${L('Publicación', 'Publishing')}</legend>
      <label class="chk"><input type="radio" name="${prefix}-pub" value="draft" ${st === 'draft' ? 'checked' : ''}> ${L('Borrador (solo vos lo ves)', 'Draft (only you can see it)')}</label>
      <label class="chk"><input type="radio" name="${prefix}-pub" value="now" ${st === 'published' ? 'checked' : ''}> ${st === 'published' ? L('Publicado', 'Published') + ' (' + A.fmtDate(pubAt) + ')' : L('Publicar ahora', 'Publish now')}</label>
      <label class="chk"><input type="radio" name="${prefix}-pub" value="schedule" ${st === 'scheduled' ? 'checked' : ''}> ${L('Programar para', 'Schedule for')}</label>
      <input type="datetime-local" id="${prefix}-pubat" value="${A.toLocalInput(st === 'scheduled' ? pubAt : Date.now() + 86400000)}" aria-label="${L('Fecha y hora de publicación', 'Publication date and time')}">
    </fieldset>`;
  }
  function readPub(root, prefix, prev) {
    const v = (root.querySelector(`[name=${prefix}-pub]:checked`) || {}).value;
    if (v === 'draft') return null;
    if (v === 'schedule') {
      const t = new Date(root.querySelector('#' + prefix + '-pubat').value).getTime();
      return isNaN(t) ? Date.now() : t;
    }
    return A.isVisible(prev) ? prev : Date.now();
  }

  /* Recalcula los datos de capítulos guardados en la obra y el índice de búsqueda */
  async function refreshAggregates(workId) {
    const chs = await A.store.listChapters(workId, true);
    const w = await A.store.getWork(workId, true);
    await A.store.updateWorkMeta(workId, { chapterMeta: A.buildChapterMeta(chs), updatedAt: Date.now() });
    await A.store.saveSearchText(workId, w ? w.pubAt : null, A.buildSearchText(chs));
    A.invalidate();
    return chs;
  }

  const bi = (id, label, obj, type) => `<div class="bi">
      <label class="field"><span>${label} · ES</span>${type === 'textarea' ? `<textarea id="${id}-es" rows="4">${esc((obj || {}).es || '')}</textarea>` : `<input id="${id}-es" value="${esc((obj || {}).es || '')}">`}</label>
      <label class="field"><span>${label} · EN</span>${type === 'textarea' ? `<textarea id="${id}-en" rows="4">${esc((obj || {}).en || '')}</textarea>` : `<input id="${id}-en" value="${esc((obj || {}).en || '')}">`}</label>
    </div>`;
  const readBi = (root, id) => ({ es: root.querySelector('#' + id + '-es').value.trim(), en: root.querySelector('#' + id + '-en').value.trim() });

  /* ---------- Editor de obra ---------- */
  async function workEditor(body, id) {
    const isNew = id === 'new';
    const s = A.settings;
    const w = isNew
      ? { title: { es: '', en: '' }, summary: { es: '', en: '' }, section: (s.sections[0] || {}).id || '', sub: '', rating: 'G', warnings: ['none'], fandoms: [], relationships: [], characters: [], tags: [], complete: false, protect: s.protectDefault !== false, cover: '', css: '', pubAt: null }
      : await A.store.getWork(id, true);
    if (!w) { body.innerHTML = `<p>${L('No se encontró la obra.', 'Work not found.')}</p>`; return; }
    const chapters = isNew ? [] : await A.store.listChapters(id, true);
    const works = await A.getWorks();
    const pool = (k) => [...new Set(works.flatMap((x) => x[k] || []))];
    const dl = (k) => `<datalist id="dl-${k}">${pool(k).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>`;
    const secOpts = (s.sections || []).map((x) => `<option value="${esc(x.id)}" ${w.section === x.id ? 'selected' : ''}>${esc(A.pick(x.name))}</option>`).join('');
    const subOpts = (sid) => {
      const sec = (s.sections || []).find((x) => x.id === sid);
      return `<option value="">${L('(ninguna)', '(none)')}</option>` + ((sec && sec.subs) || []).map((b) => `<option value="${esc(b.id)}" ${w.sub === b.id ? 'selected' : ''}>${esc(A.pick(b.name))}</option>`).join('');
    };

    body.innerHTML = `<div class="admin-head">
        <h1 class="page-title">${isNew ? L('Nueva obra', 'New work') : esc(A.pick(w.title) || L('(sin título)', '(untitled)'))}</h1>
        ${isNew ? '' : `<div class="row-btns"><a class="btn btn-ghost" href="#/w/${esc(w.id)}">${L('Ver como lectora', 'View as reader')}</a>
          <button type="button" class="btn btn-ghost" id="w-book">${L('Libro A5 para imprimir', 'Printable A5 book')}</button></div>`}
      </div>
      <form id="work-form" class="form-grid">
        <section class="form-sec"><h2 class="sub-title">${L('Datos principales', 'Main details')}</h2>
          ${bi('w-title', L('Título', 'Title'), w.title)}
          ${bi('w-sum', L('Resumen', 'Summary'), w.summary, 'textarea')}
          <div class="cols-3">
            <label class="field"><span>${L('Sección', 'Section')}</span><select id="w-sec">${secOpts}</select></label>
            <label class="field"><span>${L('Subsección', 'Subsection')}</span><select id="w-sub">${subOpts(w.section)}</select></label>
            <label class="field"><span>${L('Clasificación', 'Rating')}</span><select id="w-rating">${Object.entries(A.RATINGS).map(([k, r]) => `<option value="${k}" ${w.rating === k ? 'selected' : ''}>${esc(A.pick(r))}</option>`).join('')}</select></label>
          </div>
          <fieldset><legend>${L('Advertencias', 'Warnings')}</legend><div class="check-grid">
            ${(s.warnings || []).map((x) => `<label class="chk"><input type="checkbox" name="w-warn" value="${esc(x.id)}" ${(w.warnings || []).includes(x.id) ? 'checked' : ''}> ${esc(A.pick(x.name))}</label>`).join('')}
          </div></fieldset>
        </section>
        <section class="form-sec"><h2 class="sub-title">${L('Portada', 'Cover')}</h2>
          <div class="cover-row">
            <div>
              <label class="field"><span>${L('Imagen de portada', 'Cover image')}</span>
                <input id="w-cover" value="${esc(w.cover || '')}" placeholder="portada-legado.jpg  o  https://…"></label>
              <p class="hint">${L('Subí la imagen a tu repositorio de GitHub y escribí acá su nombre (por ejemplo portada-legado.jpg). Para el libro A5 conviene que sea vertical, proporción 2:3 o A5 (por ejemplo 1480 × 2100 píxeles).', 'Upload the image to your GitHub repository and type its file name here. For the A5 book, use a portrait image (2:3 or A5 ratio, e.g. 1480 × 2100 px).')}</p>
            </div>
            <img id="w-cover-prev" class="cover-preview" alt="" ${w.cover ? `src="${esc(w.cover)}"` : 'hidden'}>
          </div>
        </section>
        <section class="form-sec"><h2 class="sub-title">${L('Etiquetas', 'Tags')}</h2>
          <p class="hint">${L('Separalas con comas. Te sugiere las que ya usaste.', "Separate with commas. You'll get suggestions from tags you've used.")}</p>
          ${['fandoms', 'relationships', 'characters', 'tags'].map((k) => dl(k)).join('')}
          <label class="field"><span>${L('Fandoms', 'Fandoms')}</span><input id="w-fandoms" list="dl-fandoms" value="${esc((w.fandoms || []).join(', '))}"></label>
          <label class="field"><span>${L('Relaciones (ej.: Personaje A/Personaje B)', 'Relationships (e.g. Character A/Character B)')}</span><input id="w-relationships" list="dl-relationships" value="${esc((w.relationships || []).join(', '))}"></label>
          <label class="field"><span>${L('Personajes', 'Characters')}</span><input id="w-characters" list="dl-characters" value="${esc((w.characters || []).join(', '))}"></label>
          <label class="field"><span>${L('Etiquetas libres', 'Additional tags')}</span><input id="w-tags" list="dl-tags" value="${esc((w.tags || []).join(', '))}"></label>
        </section>
        <section class="form-sec"><h2 class="sub-title">${L('Opciones', 'Options')}</h2>
          <datalist id="dl-series">${[...new Set(works.map((x) => x.series).filter(Boolean))].map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
          <div class="cols-2">
            <label class="field"><span>${L('Serie (opcional)', 'Series (optional)')}</span><input id="w-series" list="dl-series" value="${esc(w.series || '')}" placeholder="${L('Nombre de la serie', 'Series name')}"></label>
            <label class="field"><span>${L('Número de parte', 'Part number')}</span><input id="w-part" type="number" min="1" inputmode="numeric" value="${esc(w.seriesPart || '')}" placeholder="1"></label>
          </div>
          <p class="hint">${L('Para sumar varias obras a la misma serie, escribí exactamente el mismo nombre en cada una.', 'To group works in a series, type the exact same name in each one.')}</p>
          <label class="field"><span>${L('Capítulos previstos (opcional)', 'Planned chapters (optional)')}</span>
            <input id="w-planned" type="number" min="1" inputmode="numeric" value="${esc(w.plannedChapters || '')}" placeholder="?" style="max-width:8rem"></label>
          <p class="hint">${L('Se muestra como 5/30. Si lo dejás vacío, aparece 5/?. Cuando marcás la obra como terminada, se usa la cantidad real de capítulos.', 'Shown as 5/30. Leave empty to show 5/?. Once the work is complete, the real chapter count is used.')}</p>
          <label class="chk"><input type="checkbox" id="w-complete" ${w.complete ? 'checked' : ''}> ${L('Obra terminada', 'Work is complete')}</label>
          <label class="chk"><input type="checkbox" id="w-protect" ${w.protect ? 'checked' : ''}> ${L('Proteger contra copia (bloquea copiar, cortar y clic derecho)', 'Copy protection (blocks copy, cut and right-click)')}</label>
          <label class="field"><span>${L('CSS para toda la obra (se aplica a todos los capítulos)', 'CSS for the whole work (applies to every chapter)')}</span>
            <textarea id="w-css" class="code" rows="6" spellcheck="false" placeholder=".story-body p { … }">${esc(w.css || '')}</textarea></label>
          ${pubControl('w', w.pubAt)}
        </section>
        <div class="row-btns sticky-actions">
          <button type="submit" class="btn btn-primary">${isNew ? L('Crear obra', 'Create work') : L('Guardar cambios', 'Save changes')}</button>
          ${isNew ? '' : `<button type="button" class="btn btn-danger" id="w-delete">${L('Borrar obra', 'Delete work')}</button>`}
        </div>
      </form>
      ${isNew ? '' : `<section class="form-sec chapters-admin">
        <div class="admin-head"><h2 class="sub-title">${L('Capítulos', 'Chapters')}</h2>
          <div class="row-btns" style="margin:0">
            <button type="button" class="btn btn-ghost" id="w-import">${L('Importar desde Word', 'Import from Word')}</button>
            <a class="btn btn-primary" href="#/admin/w/${esc(w.id)}/c/new">+ ${L('Nuevo capítulo', 'New chapter')}</a>
          </div>
          <input type="file" id="w-import-file" accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden></div>
        <p class="hint">${L('Podés subir un archivo de Word (.docx) o de texto (.txt). Si escribís en Google Docs, descargalo desde Archivo → Descargar → Microsoft Word (.docx).', 'You can upload a Word (.docx) or text (.txt) file. From Google Docs, use File → Download → Microsoft Word (.docx).')}</p>
        ${chapters.length ? `<ol class="ch-admin-list">${chapters.map((c, i) => `<li>
          <span class="ch-ord">${i + 1}</span>
          <div class="ch-info"><a href="#/admin/w/${esc(w.id)}/c/${esc(c.id)}" class="strong">${esc(A.pick(c.title) || L('Capítulo', 'Chapter') + ' ' + (i + 1))}</a>
            <span class="muted sm">${statePill(c.pubAt)} · ${A.fmtNum((c.words || {}).es)} ${L('pal. ES', 'words ES')} · ${A.fmtNum((c.words || {}).en)} ${L('pal. EN', 'words EN')} · ${A.fmtNum(c.views)} ${L('lecturas', 'hits')}</span></div>
          <div class="ch-btns">
            <button type="button" class="tool" data-move="${esc(c.id)}" data-dir="-1" aria-label="${L('Subir', 'Move up')}" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="tool" data-move="${esc(c.id)}" data-dir="1" aria-label="${L('Bajar', 'Move down')}" ${i === chapters.length - 1 ? 'disabled' : ''}>↓</button>
            <a class="tool" href="#/w/${esc(w.id)}/c/${esc(c.id)}" aria-label="${L('Ver', 'View')}">👁</a>
          </div></li>`).join('')}</ol>` : `<p class="hint">${L('Esta obra todavía no tiene capítulos.', 'This work has no chapters yet.')}</p>`}
      </section>`}`;

    const form = $('#work-form');
    form.addEventListener('input', () => (dirty = true));
    $('#w-cover').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      const img = $('#w-cover-prev');
      if (v) { img.src = v; img.hidden = false; } else img.hidden = true;
    });
    if ($('#w-book')) $('#w-book').onclick = () => A.pdf.printBook(w, chapters, A.lang);
    $('#w-sec').onchange = (e) => { w.sub = ''; $('#w-sub').innerHTML = subOpts(e.target.value); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        id: isNew ? undefined : w.id,
        title: readBi(form, 'w-title'),
        summary: readBi(form, 'w-sum'),
        section: $('#w-sec').value,
        sub: $('#w-sub').value,
        rating: $('#w-rating').value,
        warnings: [...form.querySelectorAll('[name=w-warn]:checked')].map((x) => x.value),
        fandoms: A.splitList($('#w-fandoms').value),
        relationships: A.splitList($('#w-relationships').value),
        characters: A.splitList($('#w-characters').value),
        tags: A.splitList($('#w-tags').value),
        complete: $('#w-complete').checked,
        cover: $('#w-cover').value.trim(),
        plannedChapters: Math.max(0, parseInt($('#w-planned').value, 10) || 0) || null,
        series: $('#w-series').value.trim(),
        seriesPart: $('#w-series').value.trim() ? Math.max(1, Number($('#w-part').value) || 1) : null,
        protect: $('#w-protect').checked,
        css: $('#w-css').value,
        pubAt: readPub(form, 'w', w.pubAt),
      };
      if (!data.title.es && !data.title.en) { A.toast(L('Poné un título, aunque sea en un idioma.', 'Add a title in at least one language.'), 'err'); return; }
      if (!data.id) delete data.id;
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const newId = await A.store.saveWork(data);
        await refreshAggregates(newId);
        dirty = false;
        A.toast(L('Obra guardada.', 'Work saved.'));
        if (isNew) location.hash = `#/admin/w/${newId}`;
        else workEditor(body, newId);
      } catch (err) {
        btn.disabled = false;
        A.toast(L('No se pudo guardar: ', "Couldn't save: ") + err.message, 'err');
      }
    };
    if ($('#w-delete')) $('#w-delete').onclick = async () => {
      if (!(await A.confirmDlg(L('¿Borrar esta obra con todos sus capítulos, comentarios y reacciones? No se puede deshacer.', 'Delete this work with all its chapters, comments and reactions? This cannot be undone.'), L('Borrar para siempre', 'Delete forever'), true))) return;
      await A.store.deleteWork(w.id);
      A.invalidate();
      dirty = false;
      A.toast(L('Obra borrada.', 'Work deleted.'));
      location.hash = '#/admin';
    };
    if ($('#w-import')) {
      $('#w-import').onclick = () => $('#w-import-file').click();
      $('#w-import-file').onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const done = await importChapters(w, chapters, file);
        if (done) workEditor(body, w.id);
      };
    }
    body.querySelectorAll('[data-move]').forEach((b) =>
      (b.onclick = async () => {
        const i = chapters.findIndex((c) => c.id === b.dataset.move);
        const j = i + Number(b.dataset.dir);
        if (j < 0 || j >= chapters.length) return;
        [chapters[i], chapters[j]] = [chapters[j], chapters[i]];
        for (let k = 0; k < chapters.length; k++) {
          if (chapters[k].order !== k + 1) await A.store.saveChapter(w.id, { id: chapters[k].id, order: k + 1 });
        }
        await refreshAggregates(w.id);
        workEditor(body, w.id);
      })
    );
  }

  /* ---------- Importar capítulos desde Word (.docx) o texto (.txt) ---------- */
  const MAMMOTH = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
  /* Palabras que marcan el comienzo de un capítulo */
  const CH_RE = /^\s*(cap[ií]tulo|chapter|cap\.|pr[oó]logo|prologue|ep[ií]logo|epilogue|interludio|interlude|parte|part|extra|especial)\b/i;
  const MAX_CHARS = 850000; /* Firestore guarda hasta ~1 MB por capítulo */

  /* Convierte el archivo en HTML */
  async function fileToHtml(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) {
      await A.loadScript(MAMMOTH);
      let images = 0;
      const res = await window.mammoth.convertToHtml(
        { arrayBuffer: await file.arrayBuffer() },
        {
          styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh", "p[style-name='Título'] => h1:fresh", "p[style-name='Subtítulo'] => h2:fresh"],
          convertImage: window.mammoth.images.imgElement(() => { images++; return Promise.resolve({ src: '' }); }),
        }
      );
      return { html: res.value, images };
    }
    if (name.endsWith('.txt') || name.endsWith('.md')) {
      const text = await file.text();
      const html = text
        .replace(/\r\n?/g, '\n')
        .split(/\n{2,}|\n(?=\s*(?:cap[ií]tulo|chapter|pr[oó]logo|ep[ií]logo)\b)/i)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
      return { html, images: 0 };
    }
    throw new Error(L('Solo se pueden importar archivos .docx o .txt.', 'Only .docx or .txt files can be imported.'));
  }

  /* Detecta los capítulos dentro del HTML */
  function splitChapters(html) {
    const b = A.parse(html);
    b.querySelectorAll('img:not([src]), img[src=""]').forEach((i) => i.remove());
    const kids = [...b.children];
    const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
    const isHeading = (el) => /^H[1-6]$/.test(el.nodeName);
    const looksLikeChapter = (el) => (isHeading(el) || el.nodeName === 'P') && text(el).length > 0 && text(el).length <= 140 && CH_RE.test(text(el));

    let isMarker = looksLikeChapter;
    /* Si alguna marca es un título de Word (H1, H2…), todos los títulos de ese nivel también son capítulos */
    const headingLevels = new Set(kids.filter((k) => looksLikeChapter(k) && isHeading(k)).map((k) => k.nodeName));
    if (headingLevels.size) isMarker = (el) => looksLikeChapter(el) || (headingLevels.has(el.nodeName) && text(el).length > 0);
    if (!kids.some(looksLikeChapter)) {
      const lvl = ['H1', 'H2', 'H3'].find((h) => kids.some((k) => k.nodeName === h));
      isMarker = lvl ? (el) => el.nodeName === lvl && text(el).length > 0 : () => false;
    }

    const cleanTitle = (t) => {
      const m = t.match(/^\s*(?:cap[ií]tulo|chapter|cap\.)\s*([0-9ivxlcdm]+|[a-záéíóúñ]+)?\s*[:.\-–—|]\s*(.+)$/i);
      return (m && m[2].trim()) || t;
    };

    const parts = [];
    let cur = { title: '', nodes: [], intro: true };
    kids.forEach((el) => {
      if (isMarker(el)) {
        parts.push(cur);
        cur = { title: cleanTitle(text(el)), nodes: [], intro: false };
      } else cur.nodes.push(el);
    });
    parts.push(cur);

    return parts
      .map((p) => {
        /* Saca párrafos vacíos al principio y al final */
        const isEmpty = (n) => !text(n) && !n.querySelector('img,table,hr');
        while (p.nodes.length && isEmpty(p.nodes[0])) p.nodes.shift();
        while (p.nodes.length && isEmpty(p.nodes[p.nodes.length - 1])) p.nodes.pop();
        const content = p.nodes.map((n) => n.outerHTML).join('\n');
        return { title: p.title, intro: p.intro, content, words: A.countWords(content) };
      })
      .filter((p) => (p.intro ? p.words > 0 : true));
  }

  async function importChapters(w, chapters, file) {
    let parsed;
    A.toast(L('Leyendo el archivo…', 'Reading the file…'));
    try {
      parsed = await fileToHtml(file);
    } catch (err) {
      A.toast(L('No se pudo leer el archivo: ', "Couldn't read the file: ") + err.message, 'err');
      return false;
    }
    let found = splitChapters(parsed.html);
    if (!found.length) { A.toast(L('El archivo está vacío.', 'The file is empty.'), 'err'); return false; }
    /* Si no encontró marcas de capítulo, todo el archivo es un solo capítulo */
    const single = found.length === 1 && found[0].intro;
    if (single) found[0] = Object.assign(found[0], { intro: false, title: file.name.replace(/\.[^.]+$/, '') });
    const hasIntro = found[0].intro;

    const rows = found.map((c, i) => {
      const big = c.content.length > MAX_CHARS;
      return `<li class="imp-row">
        <label class="chk"><input type="checkbox" data-imp-on="${i}" ${c.intro || big ? '' : 'checked'} ${big ? 'disabled' : ''}></label>
        <span class="imp-n">${c.intro ? '—' : ''}</span>
        <div class="imp-main">
          <input data-imp-title="${i}" value="${esc(c.intro ? L('Texto antes del primer capítulo', 'Text before the first chapter') : c.title)}" aria-label="${L('Título del capítulo', 'Chapter title')}">
          <span class="muted sm">${A.fmtNum(c.words)} ${L('palabras', 'words')}${big ? ' · ' + L('demasiado largo: dividilo en dos', 'too long: split it in two') : ''}${c.intro ? ' · ' + L('desmarcado: suele ser el título o una nota', 'unchecked: usually a title or a note') : ''}</span>
        </div></li>`;
    }).join('');

    const result = await A.modal({
      title: L('Importar capítulos', 'Import chapters'),
      wide: true,
      html: `<p>${L(`Encontré <b>${found.filter((c) => !c.intro).length}</b> capítulos en <b>${esc(file.name)}</b>. Revisá los títulos antes de importar.`, `Found <b>${found.filter((c) => !c.intro).length}</b> chapters in <b>${esc(file.name)}</b>. Check the titles before importing.`)}</p>
        ${single ? `<p class="hint">${L('No encontré marcas como "Capítulo 1" ni títulos de Word, así que el archivo entero va como un solo capítulo.', 'No "Chapter 1" markers or Word headings were found, so the whole file becomes one chapter.')}</p>` : ''}
        ${parsed.images ? `<p class="hint">${L(`El archivo tiene ${parsed.images} imagen(es). No se importan: subilas a GitHub y agregalas después desde el editor.`, `The file has ${parsed.images} image(s). They are not imported: upload them to GitHub and add them in the editor.`)}</p>` : ''}
        <div class="cols-2">
          <label class="field"><span>${L('Idioma del texto', 'Text language')}</span>
            <select id="imp-lang"><option value="es">Español</option><option value="en">English</option></select></label>
          <label class="field"><span>${L('Cómo cargarlos', 'How to add them')}</span>
            <select id="imp-mode">
              <option value="new">${L('Como capítulos nuevos, al final', 'As new chapters, at the end')}</option>
              ${chapters.length ? `<option value="translate">${L('Como traducción de los capítulos que ya están, en orden', 'As the translation of existing chapters, in order')}</option>` : ''}
            </select></label>
        </div>
        <p class="hint" id="imp-mode-hint">${L('Se crean como borradores: los revisás y los publicás cuando quieras.', 'They are created as drafts: review and publish them when you want.')}</p>
        <ol class="imp-list">${rows}</ol>`,
      actions: [
        { label: L('Cancelar', 'Cancel'), value: null },
        {
          label: L('Importar', 'Import'),
          kind: 'primary',
          value: (wrap) => ({
            lang: wrap.querySelector('#imp-lang').value,
            mode: wrap.querySelector('#imp-mode').value,
            items: found
              .map((c, i) => Object.assign({}, c, { on: wrap.querySelector(`[data-imp-on="${i}"]`).checked, title: wrap.querySelector(`[data-imp-title="${i}"]`).value.trim() }))
              .filter((c) => c.on),
          }),
        },
      ],
      onOpen(wrap) {
        const renumber = () => {
          let n = wrap.querySelector('#imp-mode').value === 'translate' ? 0 : chapters.length;
          wrap.querySelectorAll('.imp-row').forEach((row, i) => {
            const on = row.querySelector('[data-imp-on]').checked;
            row.querySelector('.imp-n').textContent = on ? String(++n) : '—';
            row.classList.toggle('imp-off', !on);
          });
          wrap.querySelector('#imp-mode-hint').textContent =
            wrap.querySelector('#imp-mode').value === 'translate'
              ? L('El primero importado se guarda como traducción del capítulo 1, el segundo del capítulo 2, y así. No se toca el texto del otro idioma.', 'The first imported chapter becomes the translation of chapter 1, the second of chapter 2, and so on. The other language is left untouched.')
              : L('Se crean como borradores: los revisás y los publicás cuando quieras.', 'They are created as drafts: review and publish them when you want.');
        };
        wrap.addEventListener('change', renumber);
        renumber();
      },
    });
    if (!result || !result.items.length) return false;

    const { lang, mode, items } = result;
    const other = lang === 'es' ? 'en' : 'es';
    if (mode === 'translate' && items.length > chapters.length) {
      A.toast(L(`Hay ${items.length} capítulos para importar y la obra tiene ${chapters.length}. Los que sobran se agregan como capítulos nuevos.`, `There are ${items.length} chapters to import and the work has ${chapters.length}. The extra ones are added as new chapters.`));
    }
    try {
      let order = chapters.length;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const html = A.ensurePids(it.content);
        const target = mode === 'translate' ? chapters[i] : null;
        if (target) {
          const content = Object.assign({ es: '', en: '' }, target.content, { [lang]: html });
          await A.store.saveChapter(w.id, {
            id: target.id,
            title: Object.assign({ es: '', en: '' }, target.title, { [lang]: it.title }),
            content,
            words: { [lang]: A.countWords(html), [other]: A.countWords(content[other]) },
          });
        } else {
          order++;
          await A.store.saveChapter(w.id, {
            title: { [lang]: it.title, [other]: '' },
            content: { [lang]: html, [other]: '' },
            noteTop: { es: '', en: '' }, noteBottom: { es: '', en: '' },
            playlist: '', css: '', js: '', pubAt: null, order,
            words: { [lang]: A.countWords(html), [other]: 0 },
          });
        }
        A.toast(L(`Guardado ${i + 1} de ${items.length}…`, `Saved ${i + 1} of ${items.length}…`));
      }
      await refreshAggregates(w.id);
      A.toast(L(`Listo: se importaron ${items.length} capítulo(s).`, `Done: ${items.length} chapter(s) imported.`));
      return true;
    } catch (err) {
      await refreshAggregates(w.id).catch(() => {});
      A.toast(L('Se cortó la importación: ', 'The import stopped: ') + err.message, 'err');
      return true;
    }
  }

  /* ---------- Editor de capítulo ---------- */
  async function chapterEditor(body, wid, cid) {
    const w = await A.store.getWork(wid, true);
    if (!w) { body.innerHTML = `<p>${L('No se encontró la obra.', 'Work not found.')}</p>`; return; }
    const chapters = await A.store.listChapters(wid, true);
    const isNew = cid === 'new';
    const blank = { es: '', en: '' };
    const ch = isNew
      ? { title: { ...blank }, content: { ...blank }, noteTop: { ...blank }, noteBottom: { ...blank }, playlist: '', css: '', js: '', pubAt: null, order: chapters.length + 1 }
      : chapters.find((c) => c.id === cid);
    if (!ch) { body.innerHTML = `<p>${L('No se encontró el capítulo.', 'Chapter not found.')}</p>`; return; }
    const content = { es: ch.content?.es || '', en: ch.content?.en || '' };
    let lang = 'es';
    let mode = 'visual';

    body.innerHTML = `<div class="admin-head">
        <h1 class="page-title">${isNew ? L('Nuevo capítulo', 'New chapter') : esc(A.pick(ch.title) || L('Capítulo', 'Chapter'))}</h1>
        <a class="btn btn-ghost" href="#/admin/w/${esc(wid)}">← ${esc(A.pick(w.title))}</a>
      </div>
      <form id="ch-form" class="form-grid">
        <section class="form-sec">
          ${bi('c-title', L('Título del capítulo', 'Chapter title'), ch.title)}
          <label class="field"><span>${L('Playlist (link de YouTube o Spotify)', 'Playlist (YouTube or Spotify link)')}</span>
            <input id="c-playlist" type="url" value="${esc(ch.playlist || '')}" placeholder="https://open.spotify.com/playlist/…"></label>
          <p class="hint" id="pl-check"></p>
        </section>

        <section class="form-sec editor-sec">
          <div class="editor-bar">
            <div class="seg seg-inline" role="tablist" aria-label="${L('Idioma del texto', 'Text language')}">
              <button type="button" role="tab" class="seg-btn on" data-lang="es" aria-selected="true">Español</button>
              <button type="button" role="tab" class="seg-btn" data-lang="en" aria-selected="false">English</button>
            </div>
            <div class="seg seg-inline" role="tablist" aria-label="${L('Modo de edición', 'Editing mode')}">
              <button type="button" role="tab" class="seg-btn on" data-mode="visual" aria-selected="true">${L('Visual', 'Visual')}</button>
              <button type="button" role="tab" class="seg-btn" data-mode="html" aria-selected="false">HTML</button>
            </div>
            <span class="muted sm" id="wc"></span>
          </div>
          <div class="toolbar" id="tb" role="toolbar" aria-label="${L('Formato', 'Formatting')}">
            ${[
              ['bold', '<b>B</b>', L('Negrita', 'Bold')], ['italic', '<i>I</i>', L('Cursiva', 'Italic')], ['underline', '<u>S</u>', L('Subrayado', 'Underline')], ['strikeThrough', '<s>T</s>', L('Tachado', 'Strikethrough')],
              ['h2', 'H2', L('Subtítulo', 'Heading')], ['h3', 'H3', L('Subtítulo chico', 'Subheading')], ['p', '¶', L('Párrafo', 'Paragraph')], ['blockquote', '❝', L('Cita', 'Quote')],
              ['insertUnorderedList', '•', L('Lista', 'List')], ['insertOrderedList', '1.', L('Lista numerada', 'Numbered list')],
              ['justifyLeft', '⇤', L('Alinear a la izquierda', 'Align left')], ['justifyCenter', '↔', L('Centrar', 'Center')], ['justifyRight', '⇥', L('Alinear a la derecha', 'Align right')], ['justifyFull', '☰', L('Justificar', 'Justify')],
              ['link', '🔗', L('Enlace', 'Link')], ['image', '🖼', L('Imagen', 'Image')], ['hr', '—', L('Separador', 'Divider')], ['color', 'A', L('Color del texto', 'Text color')], ['removeFormat', '⌫', L('Quitar formato', 'Clear formatting')],
            ].map(([c, i, t]) => `<button type="button" class="tb" data-cmd="${c}" title="${t}" aria-label="${t}">${i}</button>`).join('')}
          </div>
          <div id="ed-wrap" class="ed-visual story-body"><div id="workskin"><div id="ed-visual" class="ed-inner" contenteditable="true" aria-label="${L('Texto del capítulo', 'Chapter text')}"></div></div></div>
          <textarea id="ed-html" class="code ed-html" rows="22" spellcheck="false" hidden aria-label="HTML"></textarea>
          <p class="hint">${L('En modo HTML podés pegar código con estilos y scripts. El modo visual es para texto común: si tu capítulo tiene código complejo, editalo en HTML para no perder nada.', 'In HTML mode you can paste code with styles and scripts. Visual mode is for plain text: if your chapter has complex code, edit it in HTML so nothing gets lost.')}</p>
        </section>

        <section class="form-sec">
          <h2 class="sub-title">${L('Notas de la autora', "Author's notes")}</h2>
          ${bi('c-ntop', L('Al principio', 'Beginning'), ch.noteTop, 'textarea')}
          ${bi('c-nbot', L('Al final', 'End'), ch.noteBottom, 'textarea')}
          <p class="hint">${L('Aceptan HTML.', 'HTML is allowed.')}</p>
        </section>

        <section class="form-sec">
          <h2 class="sub-title">${L('Código propio del capítulo', 'Custom code for this chapter')}</h2>
          <label class="field"><span>CSS</span><textarea id="c-css" class="code" rows="8" spellcheck="false" placeholder=".story-body .mensaje { … }">${esc(ch.css || '')}</textarea></label>
          <label class="field"><span>JavaScript <span class="muted">${L('(la variable story es el contenedor del texto)', '(the story variable is the text container)')}</span></span>
            <textarea id="c-js" class="code" rows="8" spellcheck="false" placeholder="story.querySelectorAll('p')…">${esc(ch.js || '')}</textarea></label>
          ${pubControl('c', ch.pubAt)}
        </section>

        <div class="row-btns sticky-actions">
          <button type="submit" class="btn btn-primary">${L('Guardar', 'Save')}</button>
          <button type="button" class="btn btn-ghost" id="c-save-view">${L('Guardar y ver', 'Save & view')}</button>
          ${isNew ? '' : `<button type="button" class="btn btn-danger" id="c-delete">${L('Borrar capítulo', 'Delete chapter')}</button>`}
        </div>
      </form>`;

    const vis = $('#ed-visual');
    const html = $('#ed-html');
    const form = $('#ch-form');
    if (A.settings.globalCss || w.css || ch.css) {
      const st = document.createElement('style');
      st.id = 'story-css';
      st.textContent = (A.settings.globalCss || '') + '\n' + (w.css || '') + '\n' + (ch.css || '');
      document.head.appendChild(st);
    }

    const current = () => (mode === 'visual' ? vis.innerHTML : html.value);
    const store = () => (content[lang] = current().replace(/<br>$/, ''));
    const load = () => {
      if (mode === 'visual') vis.innerHTML = content[lang] || '<p><br></p>';
      else html.value = content[lang];
      updateWc();
    };
    const updateWc = () => ($('#wc').textContent = `${A.fmtNum(A.countWords(current()))} ${L('palabras', 'words')}`);
    load();

    form.addEventListener('input', () => { dirty = true; updateWc(); });
    vis.addEventListener('focus', () => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {} });

    body.querySelectorAll('[data-lang]').forEach((b) =>
      (b.onclick = () => {
        store();
        lang = b.dataset.lang;
        body.querySelectorAll('[data-lang]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
        load();
      })
    );
    body.querySelectorAll('[data-mode]').forEach((b) =>
      (b.onclick = () => {
        store();
        mode = b.dataset.mode;
        body.querySelectorAll('[data-mode]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
        $('#ed-wrap').hidden = mode !== 'visual';
        html.hidden = mode !== 'html';
        $('#tb').hidden = mode !== 'visual';
        load();
      })
    );

    /* Barra de formato */
    let savedRange = null;
    vis.addEventListener('blur', () => { const s = getSelection(); if (s.rangeCount) savedRange = s.getRangeAt(0); });
    const restore = () => { vis.focus(); if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } };
    $('#tb').addEventListener('mousedown', (e) => { if (e.target.closest('.tb')) e.preventDefault(); });
    $('#tb').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      const c = b.dataset.cmd;
      if (['h2', 'h3', 'p', 'blockquote'].includes(c)) { restore(); document.execCommand('formatBlock', false, c); }
      else if (c === 'hr') { restore(); document.execCommand('insertHTML', false, '<hr>'); }
      else if (c === 'link') {
        const r = await A.ask(L('Insertar enlace', 'Insert link'), [{ id: 'url', label: 'URL', type: 'url', placeholder: 'https://' }]);
        if (r && r.url) { restore(); document.execCommand('createLink', false, r.url); }
      } else if (c === 'image') {
        const r = await A.ask(L('Insertar imagen', 'Insert image'), [
          { id: 'url', label: L('Dirección de la imagen', 'Image address'), placeholder: 'img/mi-imagen.jpg  o  https://…' },
          { id: 'alt', label: L('Descripción (para lectores de pantalla)', 'Description (for screen readers)') },
          { id: 'cap', label: L('Epígrafe (opcional)', 'Caption (optional)') },
        ]);
        if (r && r.url) {
          restore();
          document.execCommand('insertHTML', false, `<figure><img src="${esc(r.url)}" alt="${esc(r.alt)}" loading="lazy">${r.cap ? `<figcaption>${esc(r.cap)}</figcaption>` : ''}</figure><p><br></p>`);
        }
      } else if (c === 'color') {
        const r = await A.ask(L('Color del texto', 'Text color'), [{ id: 'c', label: L('Color', 'Color'), type: 'color', value: '#8c1d33' }]);
        if (r) { restore(); document.execCommand('foreColor', false, r.c); }
      } else { restore(); document.execCommand(c, false, null); }
      dirty = true;
      updateWc();
    });

    const plCheck = () => {
      const v = $('#c-playlist').value.trim();
      $('#pl-check').textContent = !v ? '' : A.embedUrl(v) ? L('✓ Se va a mostrar el reproductor.', '✓ The player will be shown.') : L('No reconozco este link: se va a mostrar como enlace común.', "I don't recognize this link: it will show as a plain link.");
    };
    $('#c-playlist').addEventListener('input', plCheck);
    plCheck();

    const save = async (thenView) => {
      store();
      const data = {
        title: readBi(form, 'c-title'),
        content: { es: A.ensurePids(content.es), en: A.ensurePids(content.en) },
        noteTop: readBi(form, 'c-ntop'),
        noteBottom: readBi(form, 'c-nbot'),
        playlist: $('#c-playlist').value.trim(),
        css: $('#c-css').value,
        js: $('#c-js').value,
        pubAt: readPub(form, 'c', ch.pubAt),
        order: ch.order || chapters.length + 1,
      };
      data.words = { es: A.countWords(data.content.es), en: A.countWords(data.content.en) };
      if (!isNew) data.id = ch.id;
      try {
        const newId = await A.store.saveChapter(wid, data);
        await refreshAggregates(wid);
        dirty = false;
        A.toast(L('Capítulo guardado.', 'Chapter saved.'));
        if (A.isVisible(data.pubAt) && !A.isVisible(w.pubAt)) A.toast(L('Ojo: la obra sigue sin publicar, así que los lectores todavía no ven este capítulo.', "Heads up: the work itself isn't published yet, so readers can't see this chapter."));
        location.hash = thenView ? `#/w/${wid}/c/${newId}` : `#/admin/w/${wid}/c/${newId}`;
        if (!thenView && !isNew) chapterEditor(body, wid, newId);
      } catch (err) {
        A.toast(L('No se pudo guardar: ', "Couldn't save: ") + err.message, 'err');
      }
    };
    form.onsubmit = (e) => { e.preventDefault(); save(false); };
    $('#c-save-view').onclick = () => save(true);
    if ($('#c-delete')) $('#c-delete').onclick = async () => {
      if (!(await A.confirmDlg(L('¿Borrar este capítulo y sus comentarios? No se puede deshacer.', 'Delete this chapter and its comments? This cannot be undone.'), L('Borrar', 'Delete'), true))) return;
      await A.store.deleteChapter(wid, ch.id);
      const rest = (await A.store.listChapters(wid, true));
      for (let k = 0; k < rest.length; k++) if (rest[k].order !== k + 1) await A.store.saveChapter(wid, { id: rest[k].id, order: k + 1 });
      await refreshAggregates(wid);
      dirty = false;
      location.hash = `#/admin/w/${wid}`;
    };
  }

  /* ---------- Ajustes del sitio ---------- */
  async function settingsPage(body) {
    const s = JSON.parse(JSON.stringify(A.settings));
    const nameRow = (cls, item, extra) => `<div class="${cls}" data-id="${esc(item.id)}">
        <input class="n-es" value="${esc(item.name.es)}" aria-label="${L('Nombre en español', 'Name in Spanish')}" placeholder="Español">
        <input class="n-en" value="${esc(item.name.en)}" aria-label="${L('Nombre en inglés', 'Name in English')}" placeholder="English">
        ${extra || ''}
        <button type="button" class="tool" data-rm aria-label="${L('Quitar', 'Remove')}">×</button>
      </div>`;
    const secBlock = (x) => `<li class="sec-block">${nameRow('sec-row', x)}
        <ul class="subs">${(x.subs || []).map((b) => `<li>${nameRow('sub-row', b)}</li>`).join('')}</ul>
        <button type="button" class="link-btn" data-addsub>+ ${L('Subsección', 'Subsection')}</button></li>`;

    body.innerHTML = `<h1 class="page-title">${L('Ajustes del sitio', 'Site settings')}</h1>
      <form id="set-form" class="form-grid">
        <section class="form-sec"><h2 class="sub-title">${L('Identidad', 'Identity')}</h2>
          <div class="cols-2">
            <label class="field"><span>${L('Nombre del sitio', 'Site name')}</span><input id="s-name" value="${esc(s.siteName)}"></label>
            <label class="field"><span>${L('Tu nombre como autora', 'Your author name')}</span><input id="s-author" value="${esc(s.authorName)}"></label>
          </div>
          ${bi('s-tag', L('Frase de presentación', 'Tagline'), s.tagline)}
          ${bi('s-about', L('Sobre mí (acepta HTML)', 'About me (HTML allowed)'), s.about, 'textarea')}
          <label class="field"><span>${L('Tus redes y enlaces (uno por línea: Nombre | https://…)', 'Your links (one per line: Name | https://…)')}</span>
            <textarea id="s-links" rows="4" placeholder="Instagram | https://instagram.com/…">${esc((s.links || []).map((l) => l.label + ' | ' + l.url).join('\n'))}</textarea></label>
        </section>
        <section class="form-sec"><h2 class="sub-title">${L('Secciones y subsecciones', 'Sections and subsections')}</h2>
          <ul class="sec-list" id="sec-list">${(s.sections || []).map(secBlock).join('')}</ul>
          <button type="button" class="btn btn-ghost" id="add-sec">+ ${L('Sección', 'Section')}</button>
        </section>
        <section class="form-sec"><h2 class="sub-title">${L('Advertencias disponibles', 'Available warnings')}</h2>
          <div id="warn-list">${(s.warnings || []).map((x) => nameRow('warn-row', x, `<label class="chk sm"><input type="checkbox" class="w-neutral" ${x.neutral ? 'checked' : ''}> ${L('no pide aviso', 'no gate')}</label>`)).join('')}</div>
          <button type="button" class="btn btn-ghost" id="add-warn">+ ${L('Advertencia', 'Warning')}</button>
          <p class="hint">${L('Las obras con advertencias muestran un aviso antes de leer, salvo las marcadas como «no pide aviso».', 'Works with warnings show a notice before reading, except those marked “no gate”.')}</p>
        </section>
        <section class="form-sec"><h2 class="sub-title">${L('Lectura y protección', 'Reading and protection')}</h2>
          <label class="field"><span>${L('Emojis de reacción (separados por espacios)', 'Reaction emojis (space-separated)')}</span><input id="s-emojis" value="${esc((s.emojis || []).join(' '))}"></label>
          <label class="field"><span>${L('Texto de la marca de agua del PDF', 'PDF watermark text')}</span><input id="s-wm" value="${esc(s.watermark || '')}"></label>
          <label class="field"><span>${L('CSS para todas las obras (acá va tu workskin de AO3, tal cual)', 'CSS for every work (paste your AO3 workskin here as is)')}</span>
            <textarea id="s-css" class="code" rows="10" spellcheck="false">${esc(s.globalCss || '')}</textarea></label>
          <p class="hint">${L('Los estilos que empiezan con #workskin funcionan igual que en AO3.', 'Rules starting with #workskin work just like on AO3.')}</p>
          <label class="chk"><input type="checkbox" id="s-protect" ${s.protectDefault !== false ? 'checked' : ''}> ${L('Activar la protección contra copia en las obras nuevas', 'Turn on copy protection for new works')}</label>
        </section>
        <div class="row-btns sticky-actions"><button type="submit" class="btn btn-primary">${L('Guardar ajustes', 'Save settings')}</button></div>
      </form>`;

    const form = $('#set-form');
    form.addEventListener('input', () => (dirty = true));
    form.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        const row = rm.parentElement;
        if (row.classList.contains('sec-row')) row.closest('.sec-block').remove();
        else if (row.classList.contains('sub-row')) row.closest('li').remove();
        else row.remove();
        dirty = true;
        return;
      }
      const add = e.target.closest('[data-addsub]');
      if (add) {
        const li = document.createElement('li');
        li.innerHTML = nameRow('sub-row', { id: '', name: { es: '', en: '' } });
        add.previousElementSibling.appendChild(li);
        li.querySelector('input').focus();
      }
    });
    $('#add-sec').onclick = () => {
      const tmp = document.createElement('ul');
      tmp.innerHTML = secBlock({ id: '', name: { es: '', en: '' }, subs: [] });
      $('#sec-list').appendChild(tmp.firstElementChild);
      $('#sec-list').lastElementChild.querySelector('input').focus();
    };
    $('#add-warn').onclick = () => {
      const tmp = document.createElement('div');
      tmp.innerHTML = nameRow('warn-row', { id: '', name: { es: '', en: '' } }, `<label class="chk sm"><input type="checkbox" class="w-neutral"> ${L('no pide aviso', 'no gate')}</label>`);
      $('#warn-list').appendChild(tmp.firstElementChild);
    };

    const slug = (t) => A.norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || A.uid(6);
    const readName = (row) => ({ es: row.querySelector('.n-es').value.trim(), en: row.querySelector('.n-en').value.trim() });
    const uniq = (id, used) => { let x = id, n = 2; while (used.has(x)) x = id + '-' + n++; used.add(x); return x; };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const used = new Set();
      const sections = [...form.querySelectorAll('.sec-block')].map((blk) => {
        const row = blk.querySelector('.sec-row');
        const name = readName(row);
        const subsUsed = new Set();
        return {
          id: uniq(row.dataset.id || slug(name.es || name.en), used),
          name,
          subs: [...blk.querySelectorAll('.sub-row')].map((r) => { const n = readName(r); return { id: uniq(r.dataset.id || slug(n.es || n.en), subsUsed), name: n }; }).filter((b) => b.name.es || b.name.en),
        };
      }).filter((x) => x.name.es || x.name.en);
      const wUsed = new Set();
      const warnings = [...form.querySelectorAll('.warn-row')].map((r) => { const n = readName(r); return { id: uniq(r.dataset.id || slug(n.es || n.en), wUsed), name: n, neutral: r.querySelector('.w-neutral').checked }; }).filter((x) => x.name.es || x.name.en);
      const next = Object.assign(s, {
        siteName: $('#s-name').value.trim() || s.siteName,
        authorName: $('#s-author').value.trim() || s.authorName,
        tagline: readBi(form, 's-tag'),
        about: readBi(form, 's-about'),
        links: $('#s-links').value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0] && p[1]).map(([label, url]) => ({ label, url })),
        sections,
        warnings,
        emojis: $('#s-emojis').value.split(/\s+/).filter(Boolean).slice(0, 12),
        watermark: $('#s-wm').value,
        globalCss: $('#s-css').value,
        protectDefault: $('#s-protect').checked,
      });
      try {
        await A.store.saveSettings(next);
        A.settings = next;
        document.title = next.siteName;
        dirty = false;
        A.renderHeader();
        A.renderFooter();
        A.toast(L('Ajustes guardados.', 'Settings saved.'));
        settingsPage(body);
      } catch (err) {
        A.toast(L('No se pudo guardar: ', "Couldn't save: ") + err.message, 'err');
      }
    };
  }

  /* ---------- Moderación de comentarios ---------- */
  async function moderation(body) {
    const [list, blocked, works] = await Promise.all([A.store.listRecentComments(150), A.store.listBlocked(), A.getWorks(true)]);
    const wname = (id) => { const w = works.find((x) => x.id === id); return w ? A.pick(w.title) : id; };
    body.innerHTML = `<h1 class="page-title">${L('Comentarios', 'Comments')}</h1>
      <p class="hint">${L('Los más recientes primero. Los lectores no pueden editar ni borrar lo que escriben: solo vos.', 'Newest first. Readers cannot edit or delete what they write: only you can.')}</p>
      ${list.length ? `<ol class="mod-list">${list.map((c) => {
        const [wid, cid] = c.chapter.split('__');
        return `<li class="mod-item">
          <div class="com-head"><b>${esc(c.name)}</b>${c.isAuthor ? `<span class="pill pill-author">${L('Autora', 'Author')}</span>` : ''} <time class="muted">${A.fmtDate(c.createdAt, true)}</time></div>
          <p class="muted sm">${L('en', 'on')} <a href="#/w/${esc(wid)}/c/${esc(cid)}">${esc(wname(wid))}</a>${c.pid ? ' · ' + L('comentario de párrafo', 'paragraph comment') : ''}${c.parentId ? ' · ' + L('respuesta', 'reply') : ''}</p>
          <p class="com-text">${esc(c.text).replace(/\n/g, '<br>')}</p>
          <div class="com-actions"><button type="button" class="link-btn danger" data-del="${esc(c.id)}">${L('Borrar', 'Delete')}</button>
          ${!c.isAuthor ? `<button type="button" class="link-btn danger" data-block="${esc(c.uid)}" data-bname="${esc(c.name)}">${L('Bloquear', 'Block')}</button>` : ''}</div>
        </li>`;
      }).join('')}</ol>` : `<div class="empty"><p>${L('Todavía no hay comentarios.', 'No comments yet.')}</p></div>`}
      <h2 class="sub-title">${L('Usuarios bloqueados', 'Blocked users')}</h2>
      ${blocked.length ? `<ul class="blocked-list">${blocked.map((b) => `<li><span>${esc(b.name || b.uid)}</span> <button type="button" class="link-btn" data-unblock="${esc(b.uid)}">${L('Desbloquear', 'Unblock')}</button></li>`).join('')}</ul>` : `<p class="hint">${L('No bloqueaste a nadie.', "You haven't blocked anyone.")}</p>`}`;
    body.onclick = async (e) => {
      const d = e.target.closest('[data-del]');
      const b = e.target.closest('[data-block]');
      const u = e.target.closest('[data-unblock]');
      if (d && (await A.confirmDlg(L('¿Borrar este comentario y sus respuestas?', 'Delete this comment and its replies?'), L('Borrar', 'Delete'), true))) { await A.store.deleteComment(d.dataset.del); moderation(body); }
      if (b && (await A.confirmDlg(L(`¿Bloquear a ${b.dataset.bname}?`, `Block ${b.dataset.bname}?`), L('Bloquear', 'Block'), true))) { await A.store.blockUser(b.dataset.block, b.dataset.bname); moderation(body); }
      if (u) { await A.store.unblockUser(u.dataset.unblock); moderation(body); }
    };
  }

  /* ---------- Estadísticas ---------- */
  async function stats(body) {
    const works = (await A.getWorks(true)).filter((w) => w.pubAt != null);
    body.innerHTML = `<h1 class="page-title">${L('Estadísticas', 'Stats')}</h1><p class="loading">${L('Contando…', 'Counting…')}</p>`;
    const rows = await Promise.all(works.map(async (w) => ({ w, inf: A.workInfo(w), c: await A.store.workCounts(w.id).catch(() => ({ comments: 0, reactions: 0 })) })));
    rows.sort((a, b) => (b.w.views || 0) - (a.w.views || 0));
    const max = Math.max(1, ...rows.map((r) => r.w.views || 0));
    const tot = rows.reduce((t, r) => ({ v: t.v + (r.w.views || 0), c: t.c + r.c.comments, r: t.r + r.c.reactions, wd: t.wd + r.inf.words }), { v: 0, c: 0, r: 0, wd: 0 });
    body.innerHTML = `<h1 class="page-title">${L('Estadísticas', 'Stats')}</h1>
      <dl class="kpis">
        <div><dt>${L('Lecturas', 'Hits')}</dt><dd>${A.fmtNum(tot.v)}</dd></div>
        <div><dt>${L('Comentarios', 'Comments')}</dt><dd>${A.fmtNum(tot.c)}</dd></div>
        <div><dt>${L('Reacciones', 'Reactions')}</dt><dd>${A.fmtNum(tot.r)}</dd></div>
        <div><dt>${L('Palabras publicadas', 'Words published')}</dt><dd>${A.fmtNum(tot.wd)}</dd></div>
      </dl>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>${L('Obra', 'Work')}</th><th>${L('Lecturas', 'Hits')}</th><th class="num">${L('Coment.', 'Comm.')}</th><th class="num">${L('Reacc.', 'React.')}</th><th class="num">${L('Caps.', 'Ch.')}</th><th class="num">${L('Palabras', 'Words')}</th></tr></thead>
        <tbody>${rows.map(({ w, inf, c }) => `<tr>
          <td><a href="#/admin/w/${esc(w.id)}" class="strong">${esc(A.pick(w.title))}</a></td>
          <td class="bar-cell"><span class="bar" style="width:${Math.round(((w.views || 0) / max) * 100)}%"></span><span class="num">${A.fmtNum(w.views)}</span></td>
          <td class="num">${A.fmtNum(c.comments)}</td><td class="num">${A.fmtNum(c.reactions)}</td>
          <td class="num">${inf.chapters}</td><td class="num">${A.fmtNum(inf.words)}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="hint">${L('Las lecturas cuentan una visita por capítulo por sesión. Tus propias visitas como autora no se cuentan. El detalle por capítulo está en la página de cada obra.', "Hits count one visit per chapter per session. Your own visits as the author aren't counted. Per-chapter detail is on each work's page.")}</p>`;
  }
})();
