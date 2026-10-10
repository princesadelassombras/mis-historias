/* PDF con marca de agua: cada página es una imagen, así el texto no se puede copiar del archivo */
(function () {
  const A = window.Arch;
  const L = (es, en) => A.L(es, en);
  const esc = A.esc;
  const H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  A.pdf = {};
  let busy = false;

  /* html2canvas no dibuja el texto de un párrafo dentro de un elemento inline-block
     (por ejemplo, los globos de los chats). Los pasamos a bloque, conservando la alineación. */
  const fixForCanvas = (root) => {
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (!/^inline-(block|flex|grid)$/.test(cs.display)) return;
      if (![...el.children].some((c) => !/^inline/.test(getComputedStyle(c).display))) return;
      const align = el.parentElement ? getComputedStyle(el.parentElement).textAlign : '';
      el.style.display = 'block';
      el.style.width = 'fit-content';
      if (align === 'right' || align === 'end') el.style.marginLeft = 'auto';
      else if (align === 'center') { el.style.marginLeft = 'auto'; el.style.marginRight = 'auto'; }
    });
  };

  /* Espera a que carguen las imágenes del documento (portada, avatares) */
  const imagesReady = (root) =>
    Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 8000); }))));

  const chapterHtml = (c, i, lang) => {
    const body = A.parse(A.pick(c.content, lang));
    body.querySelectorAll('script,iframe,.pc-btn,.pc-after').forEach((e) => e.remove());
    return { title: A.pick(c.title, lang) || L('Capítulo', 'Chapter') + ' ' + (c.order || i + 1), html: body.innerHTML };
  };

  A.pdf.download = async (work, chapters, lang) => {
    if (busy) return;
    if (!chapters || !chapters.length) return;
    busy = true;
    A.toast(L('Armando el PDF… puede tardar unos segundos.', 'Building the PDF… this may take a few seconds.'));
    const box = document.createElement('div');
    try {
      await A.loadScript(H2C);
      await A.loadScript(JSPDF);
      const s = A.settings;
      const u = A.store.user();
      const isAuthor = !!(u && u.isAdmin);
      const who = u && !u.isAdmin && u.name ? u.name : '';
      const stamp = A.fmtDate(Date.now(), true);
      const title = A.pick(work.title, lang);

      /* Documento fuera de pantalla, con fondo blanco y los estilos de la obra */
      box.className = 'pdf-doc';
      box.setAttribute('aria-hidden', 'true');
      const css = (s.globalCss || '') + '\n' + (work.css || '') + '\n' + chapters.map((c) => c.css || '').join('\n');
      box.innerHTML = `<style>${css}</style>
        ${work.cover ? `<section class="pdf-chapter pdf-cover-page pdf-block"><img src="${esc(work.cover)}" alt="" crossorigin="anonymous"></section>` : ''}
        <header class="pdf-chapter pdf-cover pdf-block">
          <p class="pdf-site">${esc(s.siteName)}</p>
          <h1>${esc(title)}</h1>
          <p class="pdf-by">${L('por', 'by')} ${esc(s.authorName)}</p>
          <p class="pdf-meta">${esc(A.pick(A.RATINGS[work.rating] || A.RATINGS.G, lang))} · ${esc(A.secName(work.section))}</p>
          ${chapters.length > 1 ? `<p class="pdf-sum">${esc(A.pick(work.summary, lang))}</p>` : ''}
        </header>
        ${chapters.map((c, i) => {
          const ch = chapterHtml(c, i, lang);
          return `<section class="pdf-chapter">
            <h2 class="pdf-block">${esc(ch.title)}</h2>
            <div class="story-body"><div id="workskin">${ch.html}</div></div>
          </section>`;
        }).join('')}`;
      document.body.appendChild(box);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await imagesReady(box);
      fixForCanvas(box);

      const canvas = await window.html2canvas(box, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const scale = canvas.width / box.offsetWidth;
      const boxTop = box.getBoundingClientRect().top;
      const pos = (el, edge) => Math.round((el.getBoundingClientRect()[edge] - boxTop) * scale);

      /* Cortes de página entre bloques, nunca a mitad de un renglón si se puede evitar */
      const blocks = [...box.querySelectorAll('.pdf-block, #workskin > *')];
      const soft = blocks.map((el) => pos(el, 'bottom')).sort((a, b) => a - b);
      const forced = [...box.querySelectorAll('.pdf-chapter')].map((el) => pos(el, 'top')).filter((y) => y > 10);
      const pageW = canvas.width;
      const pageH = Math.round(pageW * (297 / 210));
      const mTop = Math.round(48 * scale);
      const mBot = Math.round(64 * scale);
      const usable = pageH - mTop - mBot;
      const pages = [];
      let y = 0;
      while (y < canvas.height - 2) {
        const limit = y + usable;
        const f = forced.find((p) => p > y + 4 && p < limit);
        let end;
        if (f) end = f;
        else if (limit >= canvas.height) end = canvas.height;
        else {
          const cand = soft.filter((b) => b > y + usable * 0.4 && b <= limit);
          end = cand.length ? cand[cand.length - 1] : limit;
        }
        pages.push([y, end]);
        y = end;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a5', compress: true });
      const footer = `${s.siteName} · ${title}`;
      const legal = s.watermark || '';
      const dl = who ? L(`Descargado por ${who} el ${stamp}`, `Downloaded by ${who} on ${stamp}`) : L(`Descargado el ${stamp}`, `Downloaded on ${stamp}`);

      pages.forEach(([y0, y1], i) => {
        const pc = document.createElement('canvas');
        pc.width = pageW;
        pc.height = pageH;
        const ctx = pc.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageW, pageH);
        ctx.drawImage(canvas, 0, y0, pageW, y1 - y0, 0, mTop, pageW, y1 - y0);

        /* Marca de agua diagonal repetida (no se pone en la copia de la autora) */
        if (!isAuthor) {
        ctx.save();
        ctx.globalAlpha = 0.09;
        ctx.fillStyle = '#000000';
        ctx.font = `600 ${Math.round(12 * scale)}px Figtree, Arial, sans-serif`;
        ctx.translate(pageW / 2, pageH / 2);
        ctx.rotate(-Math.PI / 6);
        const mark = `${s.authorName} · ${s.siteName} · ${who || L('copia personal', 'personal copy')}`;
        const step = Math.round(120 * scale);
        for (let yy = -pageH; yy < pageH; yy += step) {
          for (let xx = -pageW * 1.2; xx < pageW * 1.2; xx += ctx.measureText(mark).width + 60 * scale) {
            ctx.fillText(mark, xx, yy + ((yy / step) % 2 ? step / 2 : 0));
          }
        }
        ctx.restore();
        }

        /* Pie de página */
        ctx.fillStyle = '#555555';
        ctx.font = `${Math.round(7.5 * scale)}px Figtree, Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(footer.length > 60 ? footer.slice(0, 60) + '…' : footer, 40 * scale, pageH - 38 * scale);
        if (!isAuthor) ctx.fillText(dl, 40 * scale, pageH - 24 * scale);
        ctx.textAlign = 'right';
        ctx.fillText(`${i + 1} / ${pages.length}`, pageW - 40 * scale, pageH - 38 * scale);
        if (legal && !isAuthor) {
          ctx.font = `${Math.round(6.5 * scale)}px Figtree, Arial, sans-serif`;
          ctx.fillText(legal.length > 80 ? legal.slice(0, 80) + '…' : legal, pageW - 40 * scale, pageH - 24 * scale);
        }

        if (i > 0) doc.addPage();
        doc.addImage(pc.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 148, 210);
      });

      doc.setProperties({ title, author: s.authorName, subject: legal, creator: s.siteName });
      const name = A.norm(title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'historia';
      doc.save(`${name}${chapters.length === 1 && A.workInfo(work).chapters > 1 ? '-cap-' + (chapters[0].order || 1) : ''}.pdf`);
      if (window.self !== window.top) A.toast(L('Si no se descargó, es porque esta vista previa bloquea descargas. En tu sitio publicado funciona.', "If nothing downloaded, this preview blocks downloads. It works on your published site."));
    } catch (e) {
      console.error(e);
      A.toast(L('No se pudo generar el PDF: ', "Couldn't create the PDF: ") + e.message, 'err');
    } finally {
      box.remove();
      busy = false;
    }
  };

  /* ---------- Libro A5 para imprimir (solo autora, sin marca de agua) ----------
     Usa la impresión del navegador: el texto queda como texto real y los estilos se respetan.
     En la ventana de impresión se elige "Guardar como PDF". */
  A.pdf.printBook = async (work, chapters, lang) => {
    if (!chapters || !chapters.length) { A.toast(L('Esta obra todavía no tiene capítulos.', 'This work has no chapters yet.'), 'err'); return; }
    const s = A.settings;
    const title = A.pick(work.title, lang);
    document.getElementById('print-book')?.remove();
    const book = document.createElement('div');
    book.id = 'print-book';
    const css = (s.globalCss || '') + '\n' + (work.css || '') + '\n' + chapters.map((c) => c.css || '').join('\n');
    const chs = chapters.map((c, i) => chapterHtml(c, i, lang));
    const fandoms = (work.fandoms || []).join(' · ');
    book.innerHTML = `<style>${css}${work.cover ? '@page :first { margin: 0 }' : ''}</style>
      ${work.cover ? `<section class="pb-cover"><img src="${esc(work.cover)}" alt=""></section>` : ''}
      <section class="pb-title">
        <h1>${esc(title)}</h1>
        <p class="pb-author">${esc(s.authorName)}</p>
        ${fandoms ? `<p class="pb-fandom">${esc(fandoms)}</p>` : ''}
      </section>
      <section class="pb-legal">
        <p>${esc(title)}</p>
        <p>© ${new Date().getFullYear()} ${esc(s.authorName)}</p>
        ${s.watermark ? `<p>${esc(s.watermark)}</p>` : ''}
        <p>${esc(s.siteName)}</p>
      </section>
      ${A.has(work.summary, lang) || A.pick(work.summary, lang) ? `<section class="pb-summary"><h2>${L('Sinopsis', 'Synopsis')}</h2><p>${esc(A.pick(work.summary, lang))}</p></section>` : ''}
      ${chs.length > 1 ? `<section class="pb-toc"><h2>${L('Índice', 'Contents')}</h2><ol>${chs.map((c) => `<li>${esc(c.title)}</li>`).join('')}</ol></section>` : ''}
      ${chs.map((c, i) => `<section class="pb-chapter">
        <p class="pb-num">${chs.length > 1 ? L('Capítulo', 'Chapter') + ' ' + (i + 1) : ''}</p>
        <h2 class="pb-chtitle">${esc(c.title)}</h2>
        <div class="story-body"><div id="workskin">${c.html}</div></div>
      </section>`).join('')}`;
    document.body.appendChild(book);
    document.documentElement.classList.add('printing-book');
    const prevTitle = document.title;
    document.title = title;
    const done = () => {
      document.documentElement.classList.remove('printing-book');
      book.remove();
      document.title = prevTitle;
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    A.toast(L('Se abre la ventana de impresión. Elegí "Guardar como PDF" como destino.', 'The print dialog opens. Choose "Save as PDF" as the destination.'));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await imagesReady(book);
    setTimeout(() => window.print(), 300);
  };
})();
