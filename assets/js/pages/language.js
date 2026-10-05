(async () => {
  const { esc, href, ext, tok, $, fmt, data, fill } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.language, F = P.facts, T = site.taxonomy;
    const code = document.querySelector('main').dataset.code;
    const [languages, papersAll, resources, scripts] = await Promise.all([data('languages'), data('papers'), data('resources'), data('writing-systems')]);
    const l = languages.find(x => x.code === code);
    if (!l) throw new Error(code);
    const b = SI.branch(site, l.branch), st = SI.status(site, l.status);
    const script = scripts.find(s => s.id === l.scriptId);
    const keys = SI.keysForCode(site, code);
    const papers = SI.realPapers(papersAll).filter(p => (p.langs || []).some(k => keys.includes(k))).sort((a, b2) => b2.year - a.year);
    // resources that name one of this language's keys, either directly or under "also covers"
    const coverage = r => { const hit = (Array.isArray(r.languages) ? r.languages : []).find(x => keys.includes(x.lang)); return hit ? { sentences: hit.sentences } : (r.also || []).concat(r.keys || []).some(k => keys.includes(k)) ? { also: true } : null; };
    const ds = resources.datasets.map(r => [r, coverage(r)]).filter(([, c]) => c);
    const tools = resources.tools.concat(resources.code_mixed).map(r => [r, coverage(r)]).filter(([, c]) => c);

    document.title = fill(P.title, { name: l.name, code: l.code });
    $('#hero').insertAdjacentHTML('beforeend', `<div class="chips" style="margin-top:6px"><span class="tag mono">${esc(l.code)}</span>${SI.badge(b.label, b.color)} ${SI.badge(st.label, st.color, st.text)}</div>`);

    /* main column: facts, papers, datasets */
    const facts = [
      [F.iso, `<a href="${href(fill(site.links.iso, l))}"${ext(site.links.iso)}><code>${esc(l.code)}</code></a>`],
      [F.glottolog, l.glottolog ? `<a href="${href(fill(site.links.glottolog, l))}"${ext(site.links.glottolog)}><code>${esc(l.glottolog)}</code></a>` : '–'],
      [F.branch, `<a href="/languages/?branch=${encodeURIComponent(l.branch)}">${esc(b.label)}</a>`],
      [F.status, `${esc(st.label)} <span class="muted small">· ${esc(st.text)}</span>`],
      [F.speakers, esc(l.speakers || '–')],
      [F.area, esc(l.area || '–')],
      [F.script, script ? `<a href="/scripts/#${tok(script.id)}">${esc(l.script)}</a>` : esc(l.script || '–')],
    ];
    const D = site.pages.datasets.cols;
    const resRow = ([r, c]) => `<li class="card paper"><h3><a href="/datasets/#${tok(r.id || r.name)}">${esc(r.name)}</a></h3>
      <div class="meta">${c.sentences ? `${fmt(c.sentences)} ${esc(site.pages.datasets.total_label)}` : c.also ? esc(D.also) : ''}${r.programming_language ? ' · ' + esc(r.programming_language) : ''}</div>
      <div class="row">${SI.linkButtons(r.links, site)}</div></li>`;
    $('#body').innerHTML = `
      <dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      <section style="margin-top:36px"><h2>${esc(P.papers_title)} <span class="muted small">${papers.length || ''}</span></h2>
        ${papers.length ? `<ul class="paper-list">${papers.map(p => SI.paperItem(p, site)).join('')}</ul>` : `<p class="empty">${esc(fill(P.papers_empty, { name: l.name }))} <a href="${href(site.brand.repo + '/edit/main/data/papers.json')}"${ext(site.brand.repo)}>${esc(site.labels.edit_on_github)} ↗</a></p>`}</section>
      <section style="margin-top:36px"><h2>${esc(P.datasets_title)}</h2>
        ${ds.length || tools.length ? `<ul class="paper-list">${ds.concat(tools).map(resRow).join('')}</ul>` : `<p class="empty">${esc(fill(P.datasets_empty, { name: l.name }))}</p>`}</section>`;
    SI.bindBib($('#body'), papers);

    /* side column: script sample, map, neighbours, links */
    const near = languages.filter(x => x.code !== l.code && Array.isArray(x.coordinates) && Array.isArray(l.coordinates))
      .map(x => [x, Math.hypot(x.coordinates[0] - l.coordinates[0], x.coordinates[1] - l.coordinates[1])]).sort((a, c) => a[1] - c[1]).slice(0, 8).map(([x]) => x);
    $('#side').innerHTML = `
      ${script && script.example ? `<div class="card" style="margin-bottom:18px"><p class="kicker" style="margin-bottom:8px">${esc(F.script)}</p><div class="script-sample" id="sample" dir="auto">${esc(script.example.split(' (')[0])}</div><a href="/scripts/#${tok(script.id)}">${esc(script.name)} →</a></div>` : ''}
      ${Array.isArray(l.coordinates) ? `<h2 class="h3">${esc(P.map_title)}</h2><div class="map map--small" id="mini-map" role="region" aria-label="${esc(P.map_title)}"></div>` : ''}
      <h2 class="h3" style="margin-top:22px">${esc(P.nearby_title)}</h2><div class="chips">${near.map(x => `<a class="chip" href="${SI.langUrl(x.code)}"><span class="dot" style="background:${SI.color(SI.branch(site, x.branch).color)}"></span>${esc(x.name)}</a>`).join('')}</div>
      <h2 class="h3" style="margin-top:22px">${esc(P.links_title)}</h2>
      <div class="chips">${Object.entries(site.links).filter(([k]) => k !== 'wikipedia' || l.wikipedia).map(([k, tpl]) => { const u = fill(tpl, l); return `<a class="chip" href="${href(u)}"${ext(u)}>${esc(site.link_labels[k] || k)} ↗</a>`; }).join('')}</div>`;
    if (script && script.font) SI.useFont($('#sample'), script.font, script.example);
    if (Array.isArray(l.coordinates)) {
      const map = await SIMap.make($('#mini-map'), { center: l.coordinates, zoom: 5, scroll: false });
      near.forEach(x => SIMap.dot(x, SI.branch(site, x.branch).color, 6).bindPopup(() => SIMap.popup(x, site)).addTo(map));
      SIMap.dot(l, b.color, 11).bindPopup(SIMap.popup(l, site)).addTo(map);
    }
  } catch (e) { SI.showError($('#body'), e); }
})();
