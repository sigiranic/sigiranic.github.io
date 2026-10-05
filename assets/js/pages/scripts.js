(async () => {
  const { esc, tok, $, data } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.scripts;
    const [scripts, languages] = await Promise.all([data('writing-systems'), data('languages')]);
    $('#hero').innerHTML = `<span class="kicker">${esc(P.kicker)}</span><h1>${esc(P.h1)}</h1><p class="lead">${esc(P.lead)}</p>`;
    $('#timeline-title').textContent = P.timeline_title;
    $('#timeline-note').textContent = P.timeline_note;

    /* timeline: years before the common era are negative */
    const now = new Date().getFullYear(), from = -600, to = now;
    const x = y => ((y - from) / (to - from)) * 100;
    const dated = scripts.filter(s => s.start != null).sort((a, b) => a.start - b.start);
    const yearLabel = y => y < 0 ? `${-y} ${P.bce}` : y === 0 ? `1 ${P.ce}` : `${y}`;
    $('#timeline').innerHTML = dated.map(s => {
      const end = s.end ?? now;
      return `<div class="tl-row"><span title="${esc(s.name)}"><a href="#${tok(s.id)}" style="color:inherit;text-decoration:none">${esc(s.name)}</a></span>
        <div class="tl-track" role="img" aria-label="${esc(`${s.name}: ${yearLabel(s.start)} – ${s.end == null ? P.present : yearLabel(s.end)}`)}"><i class="${s.end == null ? 'open' : ''}" style="left:${x(s.start)}%;width:${Math.max(.8, x(end) - x(s.start))}%;--c:${SI.color(s.color)}"></i></div></div>`;
    }).join('') + `<div class="tl-axis" aria-hidden="true">${[-500, 0, 500, 1000, 1500, 2000].map(y => `<span style="left:${x(y)}%">${yearLabel(y)}</span>`).join('')}</div>`;

    /* cards */
    const usedBy = id => languages.filter(l => l.scriptId === id).sort((a, b) => a.name.localeCompare(b.name));
    $('#scripts').innerHTML = scripts.map(s => {
      const langs = usedBy(s.id);
      const sample = (s.example || s.nativeName || '').split(' (')[0];
      return `<article class="card script-card" id="${tok(s.id)}">
        <div class="script-sample" data-font="${esc(s.font || '')}" dir="auto">${esc(sample)}</div>
        <div><h2 class="h3" style="margin:0 0 4px"><span class="swatch" style="--c:${SI.color(s.color)}"></span>${esc(s.name)}</h2><p class="muted small" style="margin:0 0 10px">${esc(s.example || '')}</p></div>
        <div><p class="small">${esc(s.description)}</p>
          <dl>
            <dt>${esc(P.period_label)}</dt><dd>${esc(s.period)}</dd>
            <dt>${esc(P.type_label)}</dt><dd>${esc(s.type)} · ${esc(s.family)}</dd>
            <dt>${esc(P.direction_label)}</dt><dd>${esc(s.direction)}</dd>
            ${s.unicodeBlock ? `<dt>${esc(P.unicode_label)}</dt><dd><code>${esc(s.unicodeBlock)}</code></dd>` : ''}
            ${s.notableTexts ? `<dt>${esc(P.texts_label)}</dt><dd>${esc(s.notableTexts)}</dd>` : ''}
            <dt>${esc(P.languages_label)}</dt><dd>${langs.length ? langs.map(l => `<a href="${SI.langUrl(l.code)}">${esc(l.name)}</a>`).join(', ') : esc(s.languages.join(', '))}</dd>
          </dl></div>
      </article>`;
    }).join('');
    // Fetch each historical script's font only when its card nears the viewport.
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); SI.useFont(e.target, e.target.dataset.font, e.target.textContent); } }), { rootMargin: '300px' }) : null;
    document.querySelectorAll('.script-sample[data-font]').forEach(el => { if (el.dataset.font) io ? io.observe(el) : SI.useFont(el, el.dataset.font, el.textContent); });
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (e) { SI.showError($('#hero'), e); }
})();
