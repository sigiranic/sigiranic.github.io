(async () => {
  const { esc, href, ext, tok, $, fmt, data, langUrl } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.home, T = site.taxonomy;
    const [languages, papersAll, resources, scripts] = await Promise.all([data('languages'), data('papers'), data('resources'), data('writing-systems')]);
    const papers = SI.realPapers(papersAll);
    const res = Object.entries(resources.languages);
    const nResources = res.reduce((n, [, v]) => n + v.datasets.length + v.tools.length + v.code_mixed.length, 0);

    /* hero + search */
    $('#hero-text').innerHTML = `<span class="kicker">${esc(P.kicker)}</span>
      <h1>${esc(P.h1)}</h1>
      <p class="lead">${esc(P.lead)}</p>
      <div class="search" role="search">
        <label class="visually-hidden" for="q">${esc(P.search_placeholder)}</label>
        <span class="glass" aria-hidden="true">⌕</span>
        <input class="input" id="q" type="search" autocomplete="off" placeholder="${esc(P.search_placeholder)}" role="combobox" aria-expanded="false" aria-controls="results" aria-autocomplete="list">
        <div class="results" id="results" role="listbox" hidden></div>
      </div>
      <p class="search-hint">${esc(P.search_hint)}</p>`;

    // One index across languages, scripts, papers and resources, shown in that order.
    const G = [
      { id: 'languages', label: site.labels.languages, all: q => `/languages/?q=${encodeURIComponent(q)}` },
      { id: 'scripts', label: site.pages.scripts.h1, all: () => '/scripts/' },
      { id: 'papers', label: site.pages.research.h1, all: q => `/research/?q=${encodeURIComponent(q)}` },
      { id: 'datasets', label: site.pages.datasets.h1, all: q => `/datasets/?q=${encodeURIComponent(q)}` },
    ];
    const langLabels = p => (p.langs || []).map(k => T.paper_languages[k] || k).join(' ');
    const index = [
      ...languages.map(l => ({ g: 'languages', label: l.name, sub: l.code, url: langUrl(l.code), text: `${l.name} ${l.code} ${l.area} ${l.glottolog}` })),
      ...scripts.filter(s => s.id !== 'unwritten').map(s => ({ g: 'scripts', label: s.name, sub: s.direction, url: `/scripts/#${tok(s.id)}`, text: `${s.name} ${s.nativeName} ${s.languages.join(' ')}` })),
      ...papers.map(p => ({ g: 'papers', label: p.title, sub: String(p.year), url: `/research/?id=${encodeURIComponent(p.id)}`, text: `${p.title} ${p.venue} ${(p.areas || []).map(a => T.areas[a] || a).join(' ')} ${langLabels(p)}` })),
      ...res.flatMap(([key, v]) => ['datasets', 'tools', 'code_mixed'].flatMap(kind => v[kind].map(d => ({ g: 'datasets', label: d.name, sub: v.name, url: `/datasets/?lang=${encodeURIComponent(key)}&q=${encodeURIComponent(d.name)}${kind === 'datasets' ? '' : '&tab=' + kind}`, text: `${d.name} ${v.name} ${d.tasks || ''} ${d.description || ''}` })))),
    ].map(x => ({ ...x, hay: x.text.toLowerCase(), low: x.label.toLowerCase() }));
    const q = $('#q'), box = $('#results');
    let active = -1;
    // Exact label, then label prefix, then a word in the label, then anywhere.
    const score = (x, phrase, terms) => x.low === phrase || x.sub.toLowerCase() === phrase ? 0 : x.low.startsWith(phrase) ? 1 : terms.every(t => x.low.split(/[\s:(),-]+/).some(w => w.startsWith(t))) ? 2 : 3;
    const mark = (text, terms) => {
      const re = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      return String(text).split(re).map((part, i) => i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)).join('');
    };
    const render = () => {
      const raw = q.value.trim(), phrase = raw.toLowerCase(), terms = phrase.split(/\s+/).filter(Boolean);
      if (!terms.length) { box.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
      const hits = index.filter(x => terms.every(t => x.hay.includes(t))).map(x => ({ ...x, s: score(x, phrase, terms) })).sort((a, b) => a.s - b.s || a.label.localeCompare(b.label));
      let html = '', n = 0;
      G.forEach(g => {
        const all = hits.filter(h => h.g === g.id); if (!all.length) return;
        html += `<div class="group" role="presentation"><span>${esc(g.label)}</span><span>${fmt(all.length)}</span></div>`;
        all.slice(0, 4).forEach(it => { html += `<a role="option" id="opt-${n++}" href="${href(it.url)}" aria-selected="false"><span>${mark(it.label, terms)}</span><small>${esc(it.sub)}</small></a>`; });
        if (all.length > 4) html += `<a class="more" role="option" id="opt-${n++}" href="${href(g.all(raw))}" aria-selected="false">${esc(SI.fill(P.search_all, { n: fmt(all.length), group: g.label }))} →</a>`;
      });
      box.innerHTML = html || `<p class="none">${esc(SI.fill(P.search_none, { q: raw }))}</p>`;
      box.hidden = false; box.scrollTop = 0; q.setAttribute('aria-expanded', 'true'); q.removeAttribute('aria-activedescendant'); active = -1;
    };
    const move = d => {
      const opts = [...box.querySelectorAll('[role="option"]')]; if (!opts.length) return;
      active = (active + d + opts.length) % opts.length;
      opts.forEach((o, i) => o.setAttribute('aria-selected', i === active));
      q.setAttribute('aria-activedescendant', opts[active].id); opts[active].scrollIntoView({ block: 'nearest' });
    };
    q.addEventListener('input', SI.debounce(render, 80));
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { const o = box.querySelectorAll('[role="option"]')[Math.max(active, 0)]; if (o) location.href = o.getAttribute('href'); }
      else if (e.key === 'Escape') { box.hidden = true; q.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) { box.hidden = true; q.setAttribute('aria-expanded', 'false'); } });

    /* the logo, as on the printed mark */
    const B = site.brand;
    $('#hero-art').innerHTML = `<img class="logo-img" src="${href(B.logo)}" alt="${esc(B.logo_alt)}" width="200" height="200"><b>${esc(B.name.split(' ')[0])}</b><span>${esc(B.name.split(' ').slice(1).join(' '))}</span>
      <dl>${B.codes.map(c => `<dt>${esc(c.label)}</dt><dd>${esc(c.value)}</dd>`).join('')}</dl>`;

    /* stats */
    const values = { languages: languages.length, papers: papers.length, datasets: nResources, scripts: scripts.filter(s => s.id !== 'unwritten').length };
    $('#stats').innerHTML = P.stats.map(s => `<div class="stat"><b>${fmt(values[s.key])}</b><span>${esc(s.label)}</span></div>`).join('');

    /* explore */
    $('#explore-title').textContent = P.explore_title;
    $('#explore').innerHTML = P.explore.map(c => `<a class="card" href="${href(c.href)}"><span class="glyph" aria-hidden="true">${esc(c.glyph)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></a>`).join('');

    /* coverage: papers per language key */
    $('#coverage-title').textContent = P.coverage_title;
    $('#coverage-text').textContent = P.coverage_text;
    const perKey = {};
    papers.forEach(p => (p.langs || []).forEach(k => { if (T.lang_keys[k]) perKey[k] = (perKey[k] || 0) + 1; }));
    const rows = Object.entries(perKey).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => ({ key: k, label: T.paper_languages[k] || k, value: n }));
    const covered = new Set(Object.keys(perKey).flatMap(k => T.lang_keys[k]));
    $('#coverage').innerHTML = SI.bars(rows, { color: 'var(--carnelian)' }) +
      `<p class="muted small" style="margin-top:14px">${esc(SI.fill(P.coverage_count, { n: fmt(languages.filter(l => covered.has(l.code)).length), total: fmt(languages.length) }))}</p>`;

    /* latest papers */
    $('#latest-title').textContent = P.latest_title;
    const latest = [...papers].sort((a, b) => b.year - a.year).slice(0, 4);
    $('#latest').innerHTML = latest.map(p => `<li class="card paper"><h3><a href="${href(p.url)}"${ext(p.url)}>${esc(p.title)}</a></h3><div class="meta">${esc(p.venue)}</div></li>`).join('');
  } catch (e) { SI.showError($('#hero-text'), e); }

})();
