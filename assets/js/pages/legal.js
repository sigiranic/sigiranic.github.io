(async () => {
  const { esc, href, ext, $, data, fill } = SI;
  try {
    const site = await SI.site;
    const legal = await data('legal');
    const doc = legal[document.querySelector('main').dataset.doc];
    const vars = { email: site.brand.email, repo: site.brand.repo };
    $('#hero').innerHTML = `<span class="kicker">${esc(doc.kicker)}</span><h1>${esc(doc.h1)}</h1><p class="lead">${esc(doc.lead)}</p><p class="muted small">${esc(legal.updated_label)}: <time datetime="${esc(legal.updated)}">${esc(legal.updated)}</time></p>`;
    // {email} becomes a mailto link; everything else is plain escaped text.
    const para = t => esc(fill(t, { ...vars, email: '\u0000' })).replace('\u0000', `<a href="${href('mailto:' + vars.email)}">${esc(vars.email)}</a>`);
    $('#legal').innerHTML = doc.sections.map(s => `<section><h2>${esc(s.h)}</h2>${s.p.map(t => `<p>${para(t)}</p>`).join('')}
      ${s.links ? `<p class="chips">${s.links.map(([l, u]) => { const url = fill(u, vars); return `<a class="chip" href="${href(url)}"${ext(url)}>${esc(l)} ↗</a>`; }).join('')}</p>` : ''}</section>`).join('');
  } catch (e) { SI.showError($('#hero'), e); }
})();
