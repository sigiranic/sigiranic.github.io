(async () => {
  const { esc, href, ext, $, fmt, data } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.datasets, C = P.cols;
    const resources = (await data('resources')).languages;
    const url = SI.params();
    const state = { lang: url.get('lang') || 'all', q: url.get('q') || '', tab: url.get('tab') || 'datasets' };
    const entries = Object.entries(resources);

    $('#hero').innerHTML = `<span class="kicker">${esc(P.kicker)}</span><h1>${esc(P.h1)}</h1><p class="lead">${esc(P.lead)}</p>`;
    const opt = (v, l) => `<option value="${esc(v)}"${v === state.lang ? ' selected' : ''}>${esc(l)}</option>`;
    $('#filters').innerHTML = `<label class="grow"><span class="visually-hidden">${esc(P.search_placeholder)}</span><input class="input" id="q" type="search" placeholder="${esc(P.search_placeholder)}" value="${esc(state.q)}"></label>
      <label><span class="visually-hidden">${esc(P.all_languages)}</span><select class="select" id="lang">${opt('all', P.all_languages)}${entries.map(([k, v]) => opt(k, v.name)).join('')}</select></label>`;
    const tabIds = Object.keys(P.tabs);
    $('#tabs').innerHTML = SI.tabList('rs', tabIds.map(id => ({ id, label: P.tabs[id] }))) + tabIds.map((id, i) => SI.tabPanel('rs', id, `<div id="panel-${id}"></div>`, i === 0)).join('');
    const ctl = SI.tabs($('#tabs'), id => { state.tab = id; SI.setParams({ tab: id === 'datasets' ? '' : id }); });

    const link = (name, u) => u ? `<a href="${href(u)}"${ext(u)}>${esc(name)}</a>` : esc(name);
    const match = (obj, terms) => terms.every(t => JSON.stringify(obj).toLowerCase().includes(t));
    function apply() {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const langs = entries.filter(([k]) => state.lang === 'all' || k === state.lang);
      const flat = kind => langs.flatMap(([k, v]) => v[kind].map(d => ({ ...d, _lang: v.name, _key: k }))).filter(d => match(d, terms));

      const ds = flat('datasets').sort((a, b) => b.sentences - a.sentences);
      // largest single resource per language (sentences are not additive across resources)
      const best = {}; ds.forEach(d => { best[d._lang] = Math.max(best[d._lang] || 0, d.sentences); });
      const maxLog = Math.log10(Math.max(10, ...Object.values(best)));
      $('#panel-datasets').innerHTML = ds.length ? `
        <div class="card" style="margin-bottom:20px"><h2 class="h3">${esc(P.chart_title)}</h2><p class="muted small">${esc(P.chart_note)}</p>
          ${SI.bars(Object.entries(best).sort((a, b) => b[1] - a[1]).map(([l, n]) => ({ key: l, label: l, value: n, scaled: Math.log10(Math.max(1, n)) / maxLog })), { color: 'var(--lapis)' })}</div>
        <div class="table-wrap"><table><thead><tr><th>${esc(C.name)}</th><th>${esc(C.language)}</th><th class="num">${esc(C.sentences)}</th><th>${esc(C.pairs)}</th><th>${esc(C.access)}</th></tr></thead><tbody>
        ${ds.map(d => `<tr><td>${link(d.name, d.url)}</td><td>${esc(d._lang)}</td><td class="num">${fmt(d.sentences)}</td><td>${(d.pairs || []).map(p => `<span class="tag">${esc(p.lang)} ${fmt(p.count)}</span>`).join(' ') || esc(d.note || '')}</td><td>${esc(d.access || '–')}</td></tr>`).join('')}
        </tbody></table></div>` : `<p class="empty">${esc(P.empty)}</p>`;

      const tools = flat('tools');
      $('#panel-tools').innerHTML = tools.length ? `<div class="grid grid-auto">${tools.map(t => `<article class="card"><h2 class="h3" style="margin-bottom:4px">${link(t.name, t.url)}</h2>
        <p class="small muted">${esc(t._lang)} · ${esc(t.programming_language || '')}</p><p class="small"><b>${esc(C.tasks)}:</b> ${esc(t.tasks || '–')}</p><p class="small"><b>${esc(C.features)}:</b> ${esc(t.features || '–')}</p>
        ${t.paper ? `<a class="btn btn--sm" href="${href(t.paper)}"${ext(t.paper)}>${esc(site.labels.paper)} ↗</a>` : ''}</article>`).join('')}</div>` : `<p class="empty">${esc(P.empty)}</p>`;

      const cm = flat('code_mixed');
      $('#panel-code_mixed').innerHTML = cm.length ? `<div class="grid grid-auto">${cm.map(c => `<article class="card"><h2 class="h3" style="margin-bottom:4px">${esc(c.name)}</h2>
        <p class="small muted">${esc(c.languages || c._lang)}</p><p class="small">${esc(c.description || '')}</p>${c.contribution ? `<p class="small muted">${esc(c.contribution)}</p>` : ''}
        <p class="small"><b>${esc(C.reference)}:</b> ${esc(c.reference || '–')}</p></article>`).join('')}</div>` : `<p class="empty">${esc(P.empty)}</p>`;

      // tab labels show how many entries each holds
      [['datasets', ds], ['tools', tools], ['code_mixed', cm]].forEach(([id, list]) => { const b = $(`#rs-tab-${id}`); if (b) b.textContent = `${P.tabs[id]} (${list.length})`; });
      SI.setParams({ lang: state.lang, q: state.q });
    }
    $('#q').addEventListener('input', SI.debounce(e => { state.q = e.target.value.trim(); apply(); }));
    $('#lang').addEventListener('change', e => { state.lang = e.target.value; apply(); });
    apply();
    if (state.tab !== 'datasets') ctl.select(state.tab);
  } catch (e) { SI.showError($('#hero'), e); }
})();
