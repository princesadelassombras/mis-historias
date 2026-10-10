/* Ajustes por defecto del sitio y contenido de ejemplo para el modo demo */
(function () {
  const A = window.Arch;

  A.defaultSettings = () => ({
    siteName: 'Las historias de Aldana',
    tagline: { es: 'Fics, relatos, crónicas e investigaciones', en: 'Fics, stories, chronicles and research' },
    authorName: 'Aldana',
    about: {
      es: '<p>Escribo ficción, crónicas y trabajos de investigación. Acá vas a encontrar todo lo que publico, en español y en inglés.</p>',
      en: '<p>I write fiction, chronicles and research pieces. Everything I publish lives here, in Spanish and English.</p>',
    },
    links: [],
    sections: [
      { id: 'fanfics', name: { es: 'Fanfics', en: 'Fanfiction' }, subs: [
        { id: 'anime', name: { es: 'Anime y manga', en: 'Anime & Manga' } },
        { id: 'comics', name: { es: 'Cómics', en: 'Comics' } },
        { id: 'series', name: { es: 'Series y películas', en: 'TV & Movies' } },
        { id: 'videojuegos', name: { es: 'Videojuegos', en: 'Video Games' } },
        { id: 'libros', name: { es: 'Libros', en: 'Books' } },
      ] },
      { id: 'originales', name: { es: 'Historias originales', en: 'Original Fiction' }, subs: [
        { id: 'fantasia', name: { es: 'Fantasía', en: 'Fantasy' } },
        { id: 'romance', name: { es: 'Romance', en: 'Romance' } },
        { id: 'drama', name: { es: 'Drama', en: 'Drama' } },
        { id: 'terror', name: { es: 'Terror', en: 'Horror' } },
      ] },
      { id: 'cronicas', name: { es: 'Crónicas', en: 'Chronicles' }, subs: [
        { id: 'deportivas', name: { es: 'Deportivas', en: 'Sports' } },
        { id: 'urbanas', name: { es: 'Urbanas', en: 'Urban' } },
        { id: 'personales', name: { es: 'Personales', en: 'Personal' } },
      ] },
      { id: 'investigacion', name: { es: 'Investigación', en: 'Research' }, subs: [
        { id: 'periodismo', name: { es: 'Periodismo', en: 'Journalism' } },
        { id: 'academicos', name: { es: 'Trabajos académicos', en: 'Academic papers' } },
      ] },
      { id: 'guiones', name: { es: 'Guiones', en: 'Scripts' }, subs: [] },
    ],
    warnings: [
      { id: 'none', name: { es: 'No aplican advertencias', en: 'No Archive Warnings Apply' }, neutral: true },
      { id: 'chose-not', name: { es: 'La autora eligió no usar advertencias', en: 'Author Chose Not To Use Warnings' } },
      { id: 'violence', name: { es: 'Violencia gráfica', en: 'Graphic Depictions Of Violence' } },
      { id: 'death', name: { es: 'Muerte de un personaje principal', en: 'Major Character Death' } },
      { id: 'sensitive', name: { es: 'Temas sensibles', en: 'Sensitive Themes' } },
    ],
    emojis: ['❤️', '😭', '😂', '😱', '🔥', '🥺', '👏', '😡'],
    watermark: '© Todos los derechos reservados. Prohibida su reproducción sin autorización.',
    protectDefault: true,
    globalCss: A.DEFAULT_WORKSKIN || '',
  });

  const DAY = 86400000;

  A.demoSeed = () => {
    const now = Date.now();
    const settings = A.defaultSettings();

    const ch1es = A.ensurePids(`
<p class="capitular">La biblioteca abría a las tres de la mañana, y solo para quien hubiera perdido algo que no sabía nombrar.</p>
<p>Mara llegó empapada, con el paraguas roto colgando de la muñeca como un pájaro herido. La puerta era más angosta de lo que recordaba de los sueños, y la madera olía a cera y a lluvia vieja.</p>
<p>—Llegás tarde —dijo el bibliotecario sin levantar la vista—. Las horas perdidas se archivan rápido.</p>
<blockquote>«Cada estante guarda una hora que alguien dejó caer: la tarde que no se despidió, la mañana que llegó tarde a todo.»</blockquote>
<p>Ella caminó entre los pasillos. Los lomos no tenían títulos, solo fechas. Encontró una que conocía demasiado bien.</p>
<p><span class="reloj" data-reloj>03:00</span> marcaba el reloj de la pared, y no se movía.</p>`);

    const ch1en = A.ensurePids(`
<p class="capitular">The library opened at three in the morning, and only for those who had lost something they couldn't name.</p>
<p>Mara arrived soaked, her broken umbrella hanging from her wrist like a wounded bird. The door was narrower than she remembered from her dreams, and the wood smelled of wax and old rain.</p>
<p>"You're late," the librarian said without looking up. "Lost hours get filed quickly."</p>
<blockquote>"Every shelf keeps an hour someone dropped: the afternoon that never said goodbye, the morning that was late for everything."</blockquote>
<p>She walked between the aisles. The spines had no titles, only dates. She found one she knew far too well.</p>
<p>The wall clock read <span class="reloj" data-reloj>03:00</span>, and it did not move.</p>`);

    const ch2es = A.ensurePids(`
<p>El libro pesaba más de lo que debería pesar una hora.</p>
<p>Adentro, la letra era la suya: una lista de cosas que había prometido hacer «mañana», fechada once años atrás.</p>
<p>—No se pueden llevar —advirtió el bibliotecario—. Pero se pueden leer en voz alta. A veces eso alcanza.</p>
<p>Mara respiró hondo y empezó por la primera línea.</p>`);

    const ch2en = A.ensurePids(`
<p>The book weighed more than an hour should weigh.</p>
<p>Inside, the handwriting was her own: a list of things she had promised to do "tomorrow," dated eleven years ago.</p>
<p>"You can't take them with you," the librarian warned. "But you can read them aloud. Sometimes that's enough."</p>
<p>Mara took a deep breath and began with the first line.</p>`);

    const ch3es = A.ensurePids(`<p>(Capítulo programado: los lectores todavía no lo ven.)</p><p>El bibliotecario cerró la puerta detrás de ella.</p>`);

    const cronica = A.ensurePids(`
<p>A las once de la mañana el barrio ya olía a choripán y a nervios.</p>
<p>En la vereda del club, los pibes de la novena peloteaban contra la persiana del almacén mientras don Rubén, setenta y dos años y socio vitalicio, repasaba la formación en voz alta como quien reza.</p>
<h3>El primer tiempo</h3>
<p>El gol llegó a los veinte minutos, de cabeza, y la tribuna de cemento tembló como si fuera de chapa.</p>
<p>Nadie se acuerda del resultado final. Todos se acuerdan del abrazo.</p>`);

    const invest = A.ensurePids(`
<h3>Introducción</h3>
<p>Este trabajo analiza cómo los medios locales incorporan herramientas de periodismo de datos en sus coberturas cotidianas.</p>
<h3>Metodología</h3>
<p>Se relevaron publicaciones de tres medios durante un mes y se clasificaron según el tipo de dato utilizado.</p>
<table><thead><tr><th>Medio</th><th>Notas con datos</th><th>Total</th></tr></thead>
<tbody><tr><td>Medio A</td><td>12</td><td>80</td></tr><tr><td>Medio B</td><td>7</td><td>64</td></tr></tbody></table>
<p>(Los números de esta tabla son de ejemplo para la demo.)</p>`);

    const wc = (h) => A.countWords(h);

    const works = {
      w1: {
        id: 'w1',
        title: { es: 'La biblioteca de las horas perdidas', en: 'The Library of Lost Hours' },
        summary: {
          es: 'Una biblioteca que abre a las tres de la mañana guarda las horas que la gente deja caer. Mara viene a buscar una. (Relato de ejemplo para la demo.)',
          en: 'A library that opens at 3 a.m. keeps the hours people drop. Mara has come to find one. (Sample story for the demo.)',
        },
        section: 'originales', sub: 'fantasia', rating: 'T',
        warnings: ['none'], fandoms: [], relationships: [], characters: ['Mara', 'El bibliotecario'],
        tags: ['Realismo mágico', 'Slow burn', 'Bibliotecas'],
        complete: false, protect: true, cover: '',
        css: `.story-body .capitular::first-letter{float:left;font-size:3.4em;line-height:.85;padding:.08em .12em 0 0;color:var(--accent);font-family:var(--font-display)}
.story-body .reloj{font-variant-numeric:tabular-nums;padding:.1em .4em;border:1px solid currentColor;border-radius:4px}`,
        pubAt: now - 20 * DAY, createdAt: now - 20 * DAY, updatedAt: now - 3 * DAY, views: 214,
      },
      w2: {
        id: 'w2',
        title: { es: 'Domingo de clásico en el barrio', en: '' },
        summary: { es: 'Crónica de un domingo de fútbol de barrio, contada desde la tribuna de cemento. (Ejemplo para la demo.)', en: '' },
        section: 'cronicas', sub: 'deportivas', rating: 'G',
        warnings: ['none'], fandoms: [], relationships: [], characters: [], tags: ['Fútbol', 'Barrio', 'Crónica'],
        complete: true, protect: true, cover: '', css: '',
        pubAt: now - 9 * DAY, createdAt: now - 9 * DAY, updatedAt: now - 9 * DAY, views: 98,
      },
      w3: {
        id: 'w3',
        title: { es: 'Periodismo de datos en medios locales', en: 'Data Journalism in Local Media' },
        summary: { es: 'Un relevamiento de cómo los medios chicos usan datos en sus notas diarias. (Ejemplo para la demo.)', en: 'A survey of how small outlets use data in daily reporting. (Demo sample.)' },
        section: 'investigacion', sub: 'periodismo', rating: 'G',
        warnings: ['none'], fandoms: [], relationships: [], characters: [], tags: ['Periodismo de datos', 'Medios locales'],
        complete: true, protect: false, cover: '', css: '',
        pubAt: now - 30 * DAY, createdAt: now - 30 * DAY, updatedAt: now - 30 * DAY, views: 51,
      },
      w4: {
        id: 'w4',
        title: { es: 'Borrador sin título', en: '' },
        summary: { es: 'Un borrador: solo vos lo ves.', en: '' },
        section: 'fanfics', sub: 'anime', rating: 'M',
        warnings: ['chose-not'], fandoms: ['Fandom de ejemplo'], relationships: ['Personaje A/Personaje B'], characters: ['Personaje A', 'Personaje B'], tags: ['Enemies to lovers'],
        complete: false, protect: true, cover: '', css: '',
        pubAt: null, createdAt: now - DAY, updatedAt: now - DAY, views: 0,
      },
    };

    const chapters = {
      w1: {
        c1: { id: 'c1', order: 1, title: { es: 'Las tres de la mañana', en: 'Three in the Morning' }, content: { es: ch1es, en: ch1en },
          noteTop: { es: '<p>¡Hola! Este es el primer capítulo. Gracias por leer 💙</p>', en: '<p>Hi! This is the first chapter. Thanks for reading 💙</p>' },
          noteBottom: { es: '<p>¿Qué hora creen que perdió Mara? Los leo en los comentarios.</p>', en: '<p>Which hour do you think Mara lost? Tell me in the comments.</p>' },
          playlist: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
          css: '', js: `// Ejemplo de script propio: el reloj parpadea\nstory.querySelectorAll('[data-reloj]').forEach(el => {\n  let on = true;\n  setInterval(() => { el.style.opacity = (on = !on) ? 1 : .35; }, 900);\n});`,
          pubAt: now - 20 * DAY, views: 150 },
        c2: { id: 'c2', order: 2, title: { es: 'Lo que pesa una hora', en: 'What an Hour Weighs' }, content: { es: ch2es, en: ch2en },
          noteTop: { es: '', en: '' }, noteBottom: { es: '', en: '' }, playlist: '', css: '', js: '',
          pubAt: now - 3 * DAY, views: 64 },
        c3: { id: 'c3', order: 3, title: { es: 'La puerta', en: 'The Door' }, content: { es: ch3es, en: '' },
          noteTop: { es: '', en: '' }, noteBottom: { es: '', en: '' }, playlist: '', css: '', js: '',
          pubAt: now + 4 * DAY, views: 0 },
      },
      w2: {
        c1: { id: 'c1', order: 1, title: { es: 'Domingo', en: '' }, content: { es: cronica, en: '' },
          noteTop: { es: '', en: '' }, noteBottom: { es: '', en: '' }, playlist: '', css: '', js: '', pubAt: now - 9 * DAY, views: 98 },
      },
      w3: {
        c1: { id: 'c1', order: 1, title: { es: 'Informe completo', en: 'Full report' }, content: { es: invest, en: '' },
          noteTop: { es: '', en: '' }, noteBottom: { es: '', en: '' }, playlist: '', css: '', js: '', pubAt: now - 30 * DAY, views: 51 },
      },
      w4: {
        c1: { id: 'c1', order: 1, title: { es: 'Prólogo', en: '' }, content: { es: A.ensurePids('<p>Texto del borrador.</p>'), en: '' },
          noteTop: { es: '', en: '' }, noteBottom: { es: '', en: '' }, playlist: '', css: '', js: '', pubAt: null, views: 0 },
      },
    };

    /* Calcula palabras y metadatos de capítulos */
    for (const wid in chapters) {
      for (const cid in chapters[wid]) {
        const c = chapters[wid][cid];
        c.words = { es: wc(c.content.es), en: wc(c.content.en) };
      }
      works[wid].chapterMeta = A.buildChapterMeta(Object.values(chapters[wid]));
    }

    const firstPid = (html) => (A.parse(html).querySelector('[data-pid]') || {}).getAttribute?.('data-pid');
    const comments = [
      { id: 'k1', chapter: 'w1__c1', workId: 'w1', pid: firstPid(ch1es), parentId: null, text: 'Esta primera línea me atrapó. (Comentario de ejemplo.)', name: 'Lectora de ejemplo', uid: 'demo-reader', isAuthor: false, createdAt: now - 18 * DAY },
      { id: 'k2', chapter: 'w1__c1', workId: 'w1', pid: null, parentId: null, text: '¡Quiero saber qué hora perdió! (Comentario de ejemplo.)', name: 'Lector de ejemplo', uid: 'demo-reader-2', isAuthor: false, createdAt: now - 15 * DAY },
      { id: 'k3', chapter: 'w1__c1', workId: 'w1', pid: null, parentId: 'k2', text: 'Se viene en el capítulo dos 👀', name: 'Aldana', uid: 'demo-admin', isAuthor: true, createdAt: now - 14 * DAY },
    ];
    const reactions = [
      { id: 'r1', key: 'w1__c1', workId: 'w1', uid: 'demo-reader', code: '2764', emoji: '❤️' },
      { id: 'r2', key: 'w1__c1', workId: 'w1', uid: 'demo-reader-2', code: '2764', emoji: '❤️' },
      { id: 'r3', key: 'w1__c1', workId: 'w1', uid: 'demo-reader-2', code: '1f62d', emoji: '😭' },
    ];

    const search = {};
    for (const wid in works) search[wid] = { pubAt: works[wid].pubAt, text: A.buildSearchText(Object.values(chapters[wid])) };

    return { settings, works, chapters, comments, reactions, search, blocked: {} };
  };

  /* Resumen de capítulos que se guarda dentro de la obra (para listas y filtros) */
  A.buildChapterMeta = (chs) =>
    chs
      .filter((c) => c.pubAt != null)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, pubAt: c.pubAt, words: c.words || { es: 0, en: 0 }, langs: ['es', 'en'].filter((l) => A.has(c.content, l)) }));

  A.buildSearchText = (chs) =>
    A.norm(
      chs
        .filter((c) => c.pubAt != null)
        .map((c) => [A.pick(c.title, 'es'), A.pick(c.title, 'en'), A.plainText(c.content?.es), A.plainText(c.content?.en)].join(' '))
        .join(' ')
    ).slice(0, 900000);

  /* Código corto de un emoji para usarlo como identificador */
  A.emojiCode = (e) => [...e].map((ch) => ch.codePointAt(0).toString(16)).filter((h) => h !== 'fe0f').join('-');
})();
