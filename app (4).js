/* Núcleo: arranque, encabezado, rutas, portada con buscador y filtros, Sobre mí, Siguiendo */
(function () {
  const A = window.Arch;
  const L = (es, en) => A.L(es, en);
  const esc = A.esc;
  const $ = (s, r) => (r || document).querySelector(s);

  A.views = {};
  A.prefs = Object.assign({ theme: 'auto', size: 1 }, A.ls.get('arch.prefs', {}));

  /* ---------- Preferencias de lectura ---------- */
  A.applyPrefs = () => {
    const root = document.documentElement;
    if (A.prefs.theme === 'auto') root.removeAttribute('data-reader-theme');
    else root.setAttribute('data-reader-theme', A.prefs.theme);
    root.style.setProperty('--story-zoom', String(A.prefs.size));
    root.lang = A.lang;
    A.ls.set('arch.prefs', A.prefs);
  };

  /* ---------- Ayudantes de datos ---------- */
  A.secName = (id) => { const s = (A.settings.sections || []).find((x) => x.id === id); return s ? A.pick(s.name) : ''; };
  A.subName = (sid, sub) => {
    const s = (A.settings.sections || []).find((x) => x.id === sid);
    const b = s && (s.subs || []).find((x) => x.id === sub);
    return b ? A.pick(b.name) : '';
  };
  A.warnName = (id) => { const w = (A.settings.warnings || []).find((x) => x.id === id); return w ? A.pick(w.name) : id; };
  A.warnNeutral = (id) => { const w = (A.settings.warnings || []).find((x) => x.id === id); return !!(w && w.neutral); };

  A.workInfo = (w) => {
    const vis = (w.chapterMeta || []).filter((c) => A.isVisible(c.pubAt));
    const other = A.lang === 'es' ? 'en' : 'es';
    const words = vis.reduce((s, c) => s + ((c.words && (c.words[A.lang] || c.words[other])) || 0), 0);
    const langs = new Set();
    vis.forEach((c) => (c.langs || []).forEach((l) => langs.add(l)));
    const updated = vis.length ? Math.max(...vis.map((c) => c.pubAt)) : w.pubAt;
    return { chapters: vis.length, words, langs: [...langs], updated, ids: vis.map((c) => c.id) };
  };

  let worksCache = null;
  A.getWorks = async (force) => {
    const admin = !!A.store.user()?.isAdmin;
    if (!force && worksCache && worksCache.admin === admin) return worksCache.list;
    const list = await A.store.listWorks(admin);
    worksCache = { admin, list };
    return list;
  };
  A.invalidate = () => { worksCache = null; A.searchTexts = null; };

  /* ---------- Seguir obras (se guarda en este navegador) ---------- */
  A.follows = A.ls.get('arch.follows', {});
  A.isFollowing = (id) => id in A.follows;
  A.toggleFollow = (w) => {
    if (A.isFollowing(w.id)) delete A.follows[w.id];
    else A.follows[w.id] = A.workInfo(w).chapters;
    A.ls.set('arch.follows', A.follows);
    renderHeader();
  };
  A.markSeen = (w) => {
    if (!A.isFollowing(w.id)) return;
    A.follows[w.id] = Math.max(A.follows[w.id] || 0, A.workInfo(w).chapters);
    A.ls.set('arch.follows', A.follows);
  };
  const newFollowCount = (works) => works.filter((w) => A.isFollowing(w.id) && A.workInfo(w).chapters > (A.follows[w.id] || 0)).length;

  /* ---------- Encabezado ---------- */
  let followBadge = 0;
  async function renderHeader() {
    const u = A.store.user();
    const s = A.settings;
    const secs = (s.sections || [])
      .map((x) => `<a href="#/" data-sec="${esc(x.id)}" class="menu-item">${esc(A.pick(x.name))}</a>`)
      .join('');
    $('#site-header').innerHTML = `
      <div class="hdr-in">
        <a href="#/" class="brand"><span class="brand-name">${esc(s.siteName)}</span></a>
        <nav class="hdr-nav" aria-label="${L('Principal', 'Main')}">
          <details class="menu"><summary>${L('Secciones', 'Sections')}</summary><div class="menu-pop">${secs}</div></details>
          <a href="#/following" class="nav-link">${L('Siguiendo', 'Following')}${followBadge ? `<span class="nbadge" aria-label="${L('novedades', 'updates')}">${followBadge}</span>` : ''}</a>
          <a href="#/about" class="nav-link">${L('Sobre mí', 'About')}</a>
          ${u && u.isAdmin ? `<a href="#/admin" class="nav-link nav-admin">${L('Panel', 'Dashboard')}</a>` : ''}
        </nav>
        <div class="hdr-tools">
          <button type="button" class="tool" id="btn-lang" aria-label="${L('Cambiar idioma', 'Change language')}">${A.lang === 'es' ? 'EN' : 'ES'}</button>
          <button type="button" class="tool" id="btn-prefs" aria-label="${L('Ajustes de lectura', 'Reading settings')}"><span aria-hidden="true">Aa</span></button>
        </div>
      </div>
      ${A.store.demo ? `<div class="demo-bar">${L('Modo demo: lo que hagas se guarda solo en este navegador.', 'Demo mode: changes are saved only in this browser.')}
        ${u && u.isAdmin ? '' : `<button type="button" class="link-btn" id="demo-admin">${L('Entrar como autora', 'Sign in as author')}</button>`}
        <button type="button" class="link-btn" id="demo-reset">${L('Reiniciar demo', 'Reset demo')}</button></div>` : ''}`;
    $('#btn-lang').onclick = () => {
      A.lang = A.lang === 'es' ? 'en' : 'es';
      A.ls.set('arch.lang', A.lang);
      A.applyPrefs();
      renderHeader();
      renderFooter();
      route();
    };
    $('#btn-prefs').onclick = openPrefs;
    document.querySelectorAll('#site-header [data-sec]').forEach((a) =>
      a.addEventListener('click', () => {
        A.filters = Object.assign(defaultFilters(), { section: a.dataset.sec });
        a.closest('details').open = false;
        if (location.hash === '#/' || location.hash === '') route();
      })
    );
    if ($('#demo-admin')) $('#demo-admin').onclick = () => A.store.signInAdmin();
    if ($('#demo-reset')) $('#demo-reset').onclick = async () => {
      if (!(await A.confirmDlg(L('¿Volver la demo a su estado inicial? Se borra todo lo que cargaste.', 'Reset the demo? Everything you added will be erased.'), L('Reiniciar', 'Reset'), true))) return;
      A.store.resetDemo();
      A.settings = await A.store.getSettings();
      A.invalidate();
      renderHeader();
      location.hash = '#/';
      route();
    };
  }
  A.renderHeader = renderHeader;

  function renderFooter() {
    const u = A.store.user();
    const s = A.settings;
    const links = (s.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
    $('#site-footer').innerHTML = `<div class="ftr-in">
      <p>© ${new Date().getFullYear()} ${esc(s.authorName)}. ${L('Todos los derechos reservados.', 'All rights reserved.')}</p>
      ${links ? `<p class="ftr-links">${links}</p>` : ''}
      <p class="ftr-auth">${
        u
          ? `${u.isAdmin ? L('Sesión de autora', 'Author session') : esc(u.name || L('Lector/a', 'Reader'))} · <button type="button" class="link-btn" id="btn-out">${L('Cerrar sesión', 'Sign out')}</button>`
          : `<a href="#/admin">${L('Acceso autora', 'Author access')}</a>`
      }</p></div>`;
    if ($('#btn-out')) $('#btn-out').onclick = () => A.store.signOut();
  }
  A.renderFooter = renderFooter;

  /* ---------- Panel de ajustes de lectura ---------- */
  function openPrefs() {
    const themes = [
      ['auto', L('Automático', 'Automatic')],
      ['light', L('Claro', 'Light')],
      ['dark', L('Oscuro', 'Dark')],
      ['lowvision', L('Baja visión', 'Low vision')],
    ];
    A.modal({
      title: L('Ajustes de lectura', 'Reading settings'),
      html: `<fieldset class="seg" aria-label="${L('Tema', 'Theme')}"><legend>${L('Tema', 'Theme')}</legend>
        ${themes.map(([v, l]) => `<label class="seg-opt"><input type="radio" name="pref-theme" value="${v}" ${A.prefs.theme === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
        </fieldset>
        <label class="field"><span>${L('Tamaño del texto', 'Text size')}: <b id="size-out">${Math.round(A.prefs.size * 100)}%</b></span>
        <input type="range" id="pref-size" min="0.8" max="2" step="0.05" value="${A.prefs.size}"></label>
        <p class="hint">${L('El tamaño cambia sin tocar los estilos, colores ni efectos propios de cada historia.', "Size changes without removing each story's own styles, colors or effects.")}</p>`,
      actions: [{ label: L('Restablecer', 'Reset'), value: 'reset' }, { label: L('Listo', 'Done'), value: null, kind: 'primary' }],
      onOpen(w) {
        w.querySelectorAll('[name=pref-theme]').forEach((r) =>
          r.addEventListener('change', () => {
            A.prefs.theme = r.value;
            if (r.value === 'lowvision' && A.prefs.size < 1.25) {
              A.prefs.size = 1.3;
              w.querySelector('#pref-size').value = 1.3;
              w.querySelector('#size-out').textContent = '130%';
            }
            A.applyPrefs();
          })
        );
        w.querySelector('#pref-size').addEventListener('input', (e) => {
          A.prefs.size = Number(e.target.value);
          w.querySelector('#size-out').textContent = Math.round(A.prefs.size * 100) + '%';
          A.applyPrefs();
        });
      },
    }).then((v) => {
      if (v === 'reset') {
        A.prefs = { theme: 'auto', size: 1 };
        A.applyPrefs();
      }
    });
  }

  /* ---------- Filtros ---------- */
  function defaultFilters() {
    return { q: '', inText: false, section: '', sub: '', ratings: [], complete: 'any', wMin: '', wMax: '', from: '', to: '', include: [], exclude: [], sort: 'updated' };
  }
  A.filters = Object.assign(defaultFilters(), A.ss.get('arch.filters', {}));

  const allTags = (w) => [...(w.fandoms || []), ...(w.relationships || []), ...(w.characters || []), ...(w.tags || [])];

  async function applyFilters(works) {
    const f = A.filters;
    let list = works.filter((w) => A.isVisible(w.pubAt) || A.store.user()?.isAdmin);
    if (f.section) list = list.filter((w) => w.section === f.section);
    if (f.sub) list = list.filter((w) => w.sub === f.sub);
    if (f.ratings.length) list = list.filter((w) => f.ratings.includes(w.rating));
    if (f.complete === 'yes') list = list.filter((w) => w.complete);
    if (f.complete === 'no') list = list.filter((w) => !w.complete);
    if (f.wMin) list = list.filter((w) => A.workInfo(w).words >= Number(f.wMin));
    if (f.wMax) list = list.filter((w) => A.workInfo(w).words <= Number(f.wMax));
    if (f.from) { const t = new Date(f.from + 'T00:00').getTime(); list = list.filter((w) => (w.pubAt || 0) >= t); }
    if (f.to) { const t = new Date(f.to + 'T23:59').getTime(); list = list.filter((w) => (w.pubAt || 0) <= t); }
    if (f.include.length) list = list.filter((w) => { const tg = allTags(w).map(A.norm); return f.include.every((t) => tg.includes(A.norm(t))); });
    if (f.exclude.length) list = list.filter((w) => { const tg = allTags(w).map(A.norm); return !f.exclude.some((t) => tg.includes(A.norm(t))); });
    if (f.q.trim()) {
      const q = A.norm(f.q.trim());
      let texts = null;
      if (f.inText) {
        if (!A.searchTexts) A.searchTexts = await A.store.loadSearchTexts();
        texts = A.searchTexts;
      }
      list = list.filter((w) => {
        const meta = A.norm([w.title?.es, w.title?.en, w.summary?.es, w.summary?.en, ...allTags(w)].join(' '));
        return meta.includes(q) || (texts && (texts[w.id] || '').includes(q));
      });
    }
    const by = {
      updated: (a, b) => A.workInfo(b).updated - A.workInfo(a).updated,
      published: (a, b) => (b.pubAt || 0) - (a.pubAt || 0),
      oldest: (a, b) => (a.pubAt || 0) - (b.pubAt || 0),
      words: (a, b) => A.workInfo(b).words - A.workInfo(a).words,
      views: (a, b) => (b.views || 0) - (a.views || 0),
      title: (a, b) => A.pick(a.title).localeCompare(A.pick(b.title)),
    };
    return list.sort(by[f.sort] || by.updated);
  }

  /* ---------- Ficha de una obra en listas (estilo AO3) ---------- */
  A.ratingChip = (r) => `<span class="rating r-${esc(r || 'G')}" title="${esc(A.pick(A.RATINGS[r] || A.RATINGS.G))}">${esc((A.RATINGS[r] || A.RATINGS.G).short)}</span>`;

  A.tagLinks = (list, cls) =>
    (list || []).map((t) => `<li><button type="button" class="tagbtn ${cls || ''}" data-tag="${esc(t)}">${esc(t)}</button></li>`).join('');

  A.blurb = (w) => {
    const inf = A.workInfo(w);
    const st = A.pubState(w.pubAt);
    const warns = (w.warnings || []).filter((x) => !A.warnNeutral(x));
    const total = w.complete ? inf.chapters : '?';
    return `<article class="blurb${w.cover ? ' blurb-with-cover' : ''}">${w.cover ? `<a href="#/w/${esc(w.id)}" tabindex="-1" aria-hidden="true"><img class="blurb-cover" src="${esc(w.cover)}" alt="" loading="lazy"></a><div>` : ''}
      <div class="blurb-head">
        <div class="blurb-icons">${A.ratingChip(w.rating)}
          <span class="state ${w.complete ? 'st-done' : 'st-wip'}" title="${w.complete ? L('Terminada', 'Complete') : L('En curso', 'In progress')}">${w.complete ? '✓' : '…'}</span>
        </div>
        <div class="blurb-title-wrap">
          <h3 class="blurb-title"><a href="#/w/${esc(w.id)}">${esc(A.pick(w.title) || L('(sin título)', '(untitled)'))}</a>
            ${st !== 'published' ? `<span class="pill pill-${st}">${st === 'draft' ? L('Borrador', 'Draft') : L('Programada', 'Scheduled')}</span>` : ''}</h3>
          <p class="blurb-sec">${esc(A.secName(w.section))}${w.sub ? ' › ' + esc(A.subName(w.section, w.sub)) : ''}${(w.fandoms || []).length ? ' · ' + esc(w.fandoms.join(', ')) : ''}</p>
          ${w.series ? `<p class="blurb-series">${L('Parte', 'Part')} ${esc(w.seriesPart || 1)} ${L('de', 'of')} <a href="#/series/${encodeURIComponent(w.series)}">${esc(w.series)}</a></p>` : ''}
        </div>
        <time class="blurb-date" datetime="${new Date(inf.updated || Date.now()).toISOString()}">${A.fmtDate(inf.updated)}</time>
      </div>
      ${warns.length ? `<p class="warn-line"><span class="warn-label">${L('Advertencias', 'Warnings')}:</span> ${warns.map((x) => esc(A.warnName(x))).join(', ')}</p>` : ''}
      <ul class="taglist">${A.tagLinks(w.relationships, 'tag-rel')}${A.tagLinks(w.characters, 'tag-char')}${A.tagLinks(w.tags)}</ul>
      <p class="blurb-sum">${esc(A.pick(w.summary))}</p>
      <dl class="wstats">
        <div><dt>${L('Idioma', 'Language')}</dt><dd>${inf.langs.map((l) => (l === 'es' ? 'Español' : 'English')).join(' · ') || '—'}</dd></div>
        <div><dt>${L('Palabras', 'Words')}</dt><dd>${A.fmtNum(inf.words)}</dd></div>
        <div><dt>${L('Capítulos', 'Chapters')}</dt><dd>${inf.chapters}/${total}</dd></div>
        <div><dt>${L('Lecturas', 'Hits')}</dt><dd>${A.fmtNum(w.views)}</dd></div>
      </dl>
    ${w.cover ? '</div>' : ''}</article>`;
  };

  /* ---------- Portada: explorar y buscar ---------- */
  A.views.home = async (main) => {
    const s = A.settings;
    const works = await A.getWorks();
    const tagPool = [...new Set(works.flatMap(allTags))].sort((a, b) => a.localeCompare(b));
    const f = A.filters;
    const sec = (s.sections || []).find((x) => x.id === f.section);

    main.innerHTML = `
      <section class="intro">
        <h1 class="intro-title">${esc(s.siteName)}</h1>
        <p class="intro-sub">${esc(A.pick(s.tagline))}</p>
      </section>
      <nav class="sec-tabs" aria-label="${L('Secciones', 'Sections')}">
        <button type="button" class="sec-tab ${!f.section ? 'on' : ''}" data-sec="">${L('Todo', 'Everything')}</button>
        ${(s.sections || []).map((x) => `<button type="button" class="sec-tab ${f.section === x.id ? 'on' : ''}" data-sec="${esc(x.id)}">${esc(A.pick(x.name))}</button>`).join('')}
      </nav>
      ${sec && (sec.subs || []).length ? `<nav class="sub-tabs" aria-label="${L('Subsecciones', 'Subsections')}">
        <button type="button" class="sub-tab ${!f.sub ? 'on' : ''}" data-sub="">${L('Todas', 'All')}</button>
        ${sec.subs.map((b) => `<button type="button" class="sub-tab ${f.sub === b.id ? 'on' : ''}" data-sub="${esc(b.id)}">${esc(A.pick(b.name))}</button>`).join('')}
      </nav>` : ''}
      <div class="browse">
        <aside class="filters" aria-label="${L('Filtros', 'Filters')}">
          <details class="filters-box" ${window.innerWidth > 860 ? 'open' : ''}>
            <summary>${L('Buscar y filtrar', 'Search & filter')}</summary>
            <form id="filter-form" class="filter-form">
              <label class="field"><span>${L('Buscar', 'Search')}</span>
                <input id="f-q" type="search" value="${esc(f.q)}" placeholder="${L('Título, resumen o etiqueta', 'Title, summary or tag')}"></label>
              <label class="chk"><input id="f-intext" type="checkbox" ${f.inText ? 'checked' : ''}> ${L('Buscar también dentro del texto', 'Also search inside the text')}</label>
              <label class="field"><span>${L('Ordenar por', 'Sort by')}</span>
                <select id="f-sort">
                  ${[['updated', L('Última actualización', 'Last updated')], ['published', L('Más recientes', 'Newest')], ['oldest', L('Más antiguas', 'Oldest')], ['words', L('Más palabras', 'Most words')], ['views', L('Más leídas', 'Most read')], ['title', L('Título (A-Z)', 'Title (A-Z)')]]
                    .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select></label>
              <fieldset><legend>${L('Clasificación', 'Rating')}</legend>
                ${Object.entries(A.RATINGS).map(([k, r]) => `<label class="chk"><input type="checkbox" name="f-rating" value="${k}" ${f.ratings.includes(k) ? 'checked' : ''}> ${A.ratingChip(k)} ${esc(A.pick(r))}</label>`).join('')}
              </fieldset>
              <fieldset><legend>${L('Estado', 'Status')}</legend>
                ${[['any', L('Todas', 'All')], ['yes', L('Terminadas', 'Complete')], ['no', L('En curso', 'In progress')]].map(([v, l]) => `<label class="chk"><input type="radio" name="f-complete" value="${v}" ${f.complete === v ? 'checked' : ''}> ${l}</label>`).join('')}
              </fieldset>
              <fieldset><legend>${L('Palabras', 'Words')}</legend>
                <div class="pair"><input id="f-wmin" type="number" min="0" inputmode="numeric" placeholder="${L('Desde', 'From')}" value="${esc(f.wMin)}" aria-label="${L('Mínimo de palabras', 'Minimum words')}">
                <input id="f-wmax" type="number" min="0" inputmode="numeric" placeholder="${L('Hasta', 'To')}" value="${esc(f.wMax)}" aria-label="${L('Máximo de palabras', 'Maximum words')}"></div>
              </fieldset>
              <fieldset><legend>${L('Fecha de publicación', 'Date published')}</legend>
                <div class="pair"><input id="f-from" type="date" value="${esc(f.from)}" aria-label="${L('Desde', 'From')}">
                <input id="f-to" type="date" value="${esc(f.to)}" aria-label="${L('Hasta', 'To')}"></div>
              </fieldset>
              <fieldset><legend>${L('Etiquetas', 'Tags')}</legend>
                <datalist id="tag-pool">${tagPool.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
                <label class="field"><span>${L('Incluir', 'Include')}</span><input id="f-inc" list="tag-pool" placeholder="${L('Escribí y apretá Enter', 'Type and press Enter')}"></label>
                <ul class="chips" id="inc-chips">${f.include.map((t) => `<li><button type="button" class="chip chip-inc" data-rm-inc="${esc(t)}">${esc(t)} <span aria-hidden="true">×</span></button></li>`).join('')}</ul>
                <label class="field"><span>${L('Excluir', 'Exclude')}</span><input id="f-exc" list="tag-pool" placeholder="${L('Escribí y apretá Enter', 'Type and press Enter')}"></label>
                <ul class="chips" id="exc-chips">${f.exclude.map((t) => `<li><button type="button" class="chip chip-exc" data-rm-exc="${esc(t)}">${esc(t)} <span aria-hidden="true">×</span></button></li>`).join('')}</ul>
              </fieldset>
              <button type="button" class="btn btn-ghost" id="f-clear">${L('Limpiar filtros', 'Clear filters')}</button>
            </form>
          </details>
        </aside>
        <section class="results" aria-live="polite">
          <p class="results-count" id="res-count"></p>
          <div id="res-list" class="blurbs"></div>
        </section>
      </div>`;

    const save = () => A.ss.set('arch.filters', A.filters);
    const rerender = async () => {
      save();
      const list = await applyFilters(works);
      $('#res-count').textContent = list.length === 1 ? L('1 obra', '1 work') : L(`${list.length} obras`, `${list.length} works`);
      $('#res-list').innerHTML = list.length
        ? list.map(A.blurb).join('')
        : `<div class="empty"><p>${L('No hay obras con estos filtros.', 'No works match these filters.')}</p></div>`;
    };

    main.querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => { A.filters.section = b.dataset.sec; A.filters.sub = ''; save(); A.views.home(main); }));
    main.querySelectorAll('[data-sub]').forEach((b) => (b.onclick = () => { A.filters.sub = b.dataset.sub; save(); A.views.home(main); }));

    const form = $('#filter-form');
    form.addEventListener('submit', (e) => e.preventDefault());
    let tmr;
    $('#f-q').addEventListener('input', (e) => { A.filters.q = e.target.value; clearTimeout(tmr); tmr = setTimeout(rerender, 250); });
    $('#f-intext').onchange = (e) => { A.filters.inText = e.target.checked; rerender(); };
    $('#f-sort').onchange = (e) => { A.filters.sort = e.target.value; rerender(); };
    form.querySelectorAll('[name=f-rating]').forEach((c) => (c.onchange = () => { A.filters.ratings = [...form.querySelectorAll('[name=f-rating]:checked')].map((x) => x.value); rerender(); }));
    form.querySelectorAll('[name=f-complete]').forEach((c) => (c.onchange = () => { A.filters.complete = c.value; rerender(); }));
    [['f-wmin', 'wMin'], ['f-wmax', 'wMax'], ['f-from', 'from'], ['f-to', 'to']].forEach(([id, k]) => ($('#' + id).onchange = (e) => { A.filters[k] = e.target.value; rerender(); }));
    const addTag = (input, key) => input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = input.value.trim();
      if (v && !A.filters[key].includes(v)) A.filters[key].push(v);
      save();
      A.views.home(main);
    });
    addTag($('#f-inc'), 'include');
    addTag($('#f-exc'), 'exclude');
    main.querySelectorAll('[data-rm-inc]').forEach((b) => (b.onclick = () => { A.filters.include = A.filters.include.filter((t) => t !== b.dataset.rmInc); save(); A.views.home(main); }));
    main.querySelectorAll('[data-rm-exc]').forEach((b) => (b.onclick = () => { A.filters.exclude = A.filters.exclude.filter((t) => t !== b.dataset.rmExc); save(); A.views.home(main); }));
    $('#f-clear').onclick = () => { A.filters = defaultFilters(); save(); A.views.home(main); };
    /* Tocar una etiqueta en una ficha la agrega como filtro */
    $('#res-list').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tag]');
      if (!t) return;
      if (!A.filters.include.includes(t.dataset.tag)) A.filters.include.push(t.dataset.tag);
      save();
      A.views.home(main);
    });
    await rerender();
  };

  /* ---------- Sobre mí ---------- */
  A.views.about = async (main) => {
    const s = A.settings;
    main.innerHTML = `<article class="page-narrow about">
      <h1 class="page-title">${L('Sobre mí', 'About me')}</h1>
      <div class="prose">${A.pick(s.about)}</div>
      ${(s.links || []).length ? `<h2 class="sub-title">${L('Dónde encontrarme', 'Find me')}</h2>
        <ul class="link-list">${s.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>` : ''}
    </article>`;
  };

  /* ---------- Página de una serie ---------- */
  A.views.series = async (main, name) => {
    const works = (await A.getWorks())
      .filter((w) => (w.series || '') === name)
      .sort((a, b) => (a.seriesPart || 1) - (b.seriesPart || 1));
    const words = works.reduce((s, w) => s + A.workInfo(w).words, 0);
    main.innerHTML = `<section class="page-mid">
      <p class="eyebrow">${L('Serie', 'Series')}</p>
      <h1 class="page-title">${esc(name)}</h1>
      <p class="hint">${works.length === 1 ? L('1 obra', '1 work') : L(`${works.length} obras`, `${works.length} works`)} · ${A.fmtNum(words)} ${L('palabras', 'words')} · ${L('por', 'by')} ${esc(A.settings.authorName)}</p>
      <div class="blurbs">${
        works.length
          ? works.map((w) => `<p class="new-flag">${L('Parte', 'Part')} ${esc(w.seriesPart || 1)}</p>` + A.blurb(w)).join('')
          : `<div class="empty"><p>${L('Esta serie todavía no tiene obras publicadas.', 'This series has no published works yet.')}</p></div>`
      }</div></section>`;
    main.querySelector('.blurbs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tag]');
      if (!t) return;
      A.filters = Object.assign(defaultFilters(), { include: [t.dataset.tag] });
      location.hash = '#/';
    });
  };

  /* ---------- Siguiendo ---------- */
  A.views.following = async (main) => {
    const works = (await A.getWorks()).filter((w) => A.isFollowing(w.id));
    main.innerHTML = `<section class="page-mid">
      <h1 class="page-title">${L('Obras que seguís', 'Works you follow')}</h1>
      <p class="hint">${L('Se guardan en este navegador. Cuando haya capítulos nuevos vas a ver un aviso en el menú.', "Saved in this browser. You'll see a badge in the menu when new chapters come out.")}</p>
      <div class="blurbs">${
        works.length
          ? works.map((w) => {
              const n = A.workInfo(w).chapters - (A.follows[w.id] || 0);
              return (n > 0 ? `<p class="new-flag">${n === 1 ? L('1 capítulo nuevo', '1 new chapter') : L(`${n} capítulos nuevos`, `${n} new chapters`)}</p>` : '') + A.blurb(w);
            }).join('')
          : `<div class="empty"><p>${L('Todavía no seguís ninguna obra. Entrá a una y tocá «Seguir».', "You're not following anything yet. Open a work and tap “Follow”.")}</p></div>`
      }</div></section>`;
    main.querySelector('.blurbs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tag]');
      if (!t) return;
      A.filters = Object.assign(defaultFilters(), { include: [t.dataset.tag] });
      location.hash = '#/';
    });
  };

  /* ---------- Rutas ---------- */
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const main = $('#main');
    if (A.reader) A.reader.cleanup();
    window.scrollTo(0, 0);
    main.innerHTML = `<div class="loading" role="status">${L('Cargando…', 'Loading…')}</div>`;
    try {
      if (!parts.length) await A.views.home(main);
      else if (parts[0] === 'w' && parts[2] === 'c') await A.reader.chapter(main, parts[1], parts[3]);
      else if (parts[0] === 'w') await A.reader.work(main, parts[1]);
      else if (parts[0] === 'about') await A.views.about(main);
      else if (parts[0] === 'following') await A.views.following(main);
      else if (parts[0] === 'series' && parts[1]) await A.views.series(main, parts[1]);
      else if (parts[0] === 'admin') await A.admin.route(main, parts.slice(1));
      else main.innerHTML = `<div class="empty page-mid"><h1 class="page-title">${L('No encontramos esta página', "We couldn't find this page")}</h1><p><a href="#/">${L('Volver al inicio', 'Back home')}</a></p></div>`;
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="empty page-mid"><h1 class="page-title">${L('Algo falló', 'Something went wrong')}</h1><p>${esc(e.message || e)}</p><p><a href="#/">${L('Volver al inicio', 'Back home')}</a></p></div>`;
    }
    main.focus({ preventScroll: true });
    refreshBadge();
  }
  A.route = route;

  async function refreshBadge() {
    try {
      const n = newFollowCount(await A.getWorks());
      if (n !== followBadge) { followBadge = n; renderHeader(); }
    } catch (e) {}
  }

  /* ---------- Arranque ---------- */
  async function boot() {
    A.applyPrefs();
    const cfg = window.SITE_CONFIG || {};
    const real = cfg.firebase && cfg.firebase.apiKey;
    A.store = real ? new A.FirebaseStore() : new A.LocalStore();
    try {
      await A.store.init(cfg);
    } catch (e) {
      console.error(e);
      $('#main').innerHTML = `<div class="empty page-mid"><h1 class="page-title">No se pudo conectar</h1><p>Revisá la configuración de Firebase en <code>js/config.js</code>.</p><p>${esc(e.message)}</p></div>`;
      return;
    }
    A.settings = await A.store.getSettings();
    document.title = A.settings.siteName;
    A.store.onAuth(() => {
      A.invalidate();
      renderHeader();
      renderFooter();
      const h = location.hash;
      if (h.startsWith('#/admin') || h === '' || h === '#/') route();
    });
    renderHeader();
    renderFooter();
    window.addEventListener('hashchange', route);
    document.addEventListener('click', (e) => {
      const open = document.querySelector('details.menu[open]');
      if (open && !open.contains(e.target)) open.open = false;
    });
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
