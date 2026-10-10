/* PDF con marca de agua: cada página es una imagen, así el texto no se puede copiar del archivo */
(function () {
  const A = window.Arch;
  const L = (es, en) => A.L(es, en);
  const esc = A.esc;
  const H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  A.pdf = {};
  let busy = false;

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
      const who = u && !u.isAdmin && u.name ? u.name : '';
      const stamp = A.fmtDate(Date.now(), true);
      const title = A.pick(work.title, lang);

      /* Documento fuera de pantalla, con fondo blanco y los estilos de la obra */
      box.className = 'pdf-doc';
      box.setAttribute('aria-hidden', 'true');
      const css = (s.globalCss || '') + '\n' + (work.css || '') + '\n' + chapters.map((c) => c.css || '').join('\n');
      box.innerHTML = `<style>${css}</style>
        <header class="pdf-cover pdf-block">
          <p class="pdf-site">${esc(s.siteName)}</p>
          <h1>${esc(title)}</h1>
          <p class="pdf-by">${L('por', 'by')} ${esc(s.authorName)}</p>
          <p class="pdf-meta">${esc(A.pick(A.RATINGS[work.rating] || A.RATINGS.G, lang))} · ${esc(A.secName(work.section))}</p>
          ${chapters.length > 1 ? `<p class="pdf-sum">${esc(A.pick(work.summary, lang))}</p>` : ''}
        </header>
        ${chapters.map((c, i) => {
          const body = A.parse(A.pick(c.content, lang));
          body.querySelectorAll('script,iframe,.pc-btn').forEach((e) => e.remove());
          return `<section class="pdf-chapter">
            <h2 class="pdf-block">${esc(A.pick(c.title, lang) || L('Capítulo', 'Chapter') + ' ' + (c.order || i + 1))}</h2>
            <div class="story-body"><div id="workskin">${body.innerHTML}</div></div>
          </section>`;
        }).join('')}`;
      document.body.appendChild(box);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

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
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
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

        /* Marca de agua diagonal repetida */
        ctx.save();
        ctx.globalAlpha = 0.09;
        ctx.fillStyle = '#000000';
        ctx.font = `600 ${Math.round(15 * scale)}px Figtree, Arial, sans-serif`;
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

        /* Pie de página */
        ctx.fillStyle = '#555555';
        ctx.font = `${Math.round(8.5 * scale)}px Figtree, Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(footer, 40 * scale, pageH - 38 * scale);
        ctx.fillText(dl, 40 * scale, pageH - 24 * scale);
        ctx.textAlign = 'right';
        ctx.fillText(`${i + 1} / ${pages.length}`, pageW - 40 * scale, pageH - 38 * scale);
        if (legal) {
          ctx.font = `${Math.round(7.5 * scale)}px Figtree, Arial, sans-serif`;
          ctx.fillText(legal.length > 110 ? legal.slice(0, 110) + '…' : legal, pageW - 40 * scale, pageH - 24 * scale);
        }

        if (i > 0) doc.addPage();
        doc.addImage(pc.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, 210, 297);
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
})();
