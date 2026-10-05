(async () => {
  const { esc, $, fmt, data } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.datasets, C = P.cols, T = site.taxonomy;
    const R = await data('resources');
    const url = SI.params();
    const state = { lang: url.get('lang') || 'all', q: url.get('q') || '', tab: url.get('tab') || 'datasets' };
    const label = k => T.paper_languages[k] || k;
    const langLink = k => T.lang_primary[k] ? SI.langUrl(T.lang_primary[k]) : null;

    // every language key that any resource covers, for the filter
    const keysOf = r => [...(Array.isArray(r.languages) ? r.languages.map(l => l.lang || l) : []), ...(r.also || []), ...(r.keys || [])];
    const allKeys = [...new Set([...R.datasets, ...R.tools, ...R.code_mixed].flatMap(keysOf))].sort((a, b) => label(a).localeCompare(label(b)));

    $('#hero').innerHTML = `<span class="kicker">${esc(P.kicker)}</span><h1>${esc(P.h1)}</h1><p class="lead">${esc(P.lead)}</p>`;
    const opt = (v, l) => `<option value="${esc(v)}"${v === state.lang ? ' selected' : ''}>${esc(l)}</option>`;
    $('#filters').innerHTML = `<label class="grow"><span class="visually-hidden">${esc(P.search_placeholder)}</span><input class="input" id="q" type="search" placeholder="${esc(P.search_placeholder)}" value="${esc(state.q)}"></label>
      <label><span class="visually-hidden">${esc(P.all_languages)}</span><select class="select" id="lang">${opt('all', P.all_languages)}${allKeys.map(k => opt(k, label(k))).join('')}</select></label>`;
    const tabIds = Object.keys(P.tabs);
    $('#tabs').innerHTML = SI.tabList('rs', tabIds.map(id => ({ id, label: P.tabs[id] }))) + tabIds.map((id, i) => SI.tabPanel('rs', id, `<div id="panel-${id}"></div>`, i === 0)).join('');
    const ctl = SI.tabs($('#tabs'), id => { state.tab = id; SI.setParams({ tab: id === 'datasets' ? '' : id }); });

    const chip = (k, extra = '', cls = 'lang-chip') => { const u = langLink(k); return u ? `<a class="${cls}" href="${u}">${esc(label(k))}${extra}</a>` : `<span class="${cls}">${esc(label(k))}${extra}</span>`; };
    const covers = r => {
      const main = (r.languages || []).map(l => typeof l === 'string' ? chip(l) : chip(l.lang, l.sentences ? ` <b>${fmt(l.sentences)}</b>` : ''));
      const also = (r.also || []).map(k => chip(k, '', 'lang-chip also'));
      return `<div class="langs"><span class="label">${esc(C.languages)}</span>${main.join('')}</div>${also.length ? `<div class="langs" title="${esc(r.also_note || '')}"><span class="label">${esc(C.also)}</span>${also.join('')}</div>` : ''}`;
    };
    const pairsTable = r => {
      const rows = (r.languages || []).filter(l => l.pairs && l.pairs.length);
      if (!rows.length) return '';
      return `<details><summary>${esc(C.pairs)}</summary><div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>${esc(C.language)}</th><th>${esc(C.pairs)}</th></tr></thead><tbody>
        ${rows.map(l => `<tr><td>${esc(label(l.lang))}</td><td>${l.pairs.map(p => `<span class="tag">${esc(p.lang)} ${fmt(p.count)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table></div></details>`;
    };
    const card = r => `<article class="card res" id="${SI.tok(r.id || r.name)}">
        <h3>${esc(r.name)}</h3>
        ${r.description ? `<p class="small muted" style="margin:0">${esc(r.description)}</p>` : ''}
        ${r.programming_language || r.tasks ? `<p class="small" style="margin:0">${r.programming_language ? `<span class="tag">${esc(r.programming_language)}</span> ` : ''}${esc(r.tasks || '')}</p>` : ''}
        ${r.features ? `<p class="small muted" style="margin:0">${esc(r.features)}</p>` : ''}
        ${r.contribution ? `<p class="small muted" style="margin:0">${esc(r.contribution)}</p>` : ''}
        ${r.reference ? `<p class="small" style="margin:0"><span class="label">${esc(C.reference)}</span>${esc(r.reference)}</p>` : ''}
        ${r.languages ? covers(r) : (r.keys ? `<div class="langs"><span class="label">${esc(C.languages)}</span>${esc(r.languages_text || r.keys.map(label).join(', '))}</div>` : '')}
        ${r.check ? `<p class="check"><b>${esc(P.check_label)}:</b> ${esc(r.check)}</p>` : ''}
        ${pairsTable(r)}
        ${Object.keys(r.links || {}).length ? `<div class="btn-row">${SI.linkButtons(r.links, site)}</div>` : ''}
      </article>`;

    function apply() {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const keep = r => (state.lang === 'all' || keysOf(r).includes(state.lang)) && terms.every(t => (JSON.stringify(r) + ' ' + keysOf(r).map(label).join(' ')).toLowerCase().includes(t));
      const ds = R.datasets.filter(keep), tools = R.tools.filter(keep), cm = R.code_mixed.filter(keep);

      // largest single resource per language (counts are not additive across resources)
      const best = {};
      ds.forEach(d => (d.languages || []).forEach(l => { if (l.sentences) best[l.lang] = Math.max(best[l.lang] || 0, l.sentences); }));
      const maxLog = Math.log10(Math.max(10, ...Object.values(best)));
      const chart = Object.keys(best).length ? `<div class="card" style="margin-bottom:20px"><h2 class="h3">${esc(P.chart_title)}</h2><p class="muted small">${esc(P.chart_note)}</p>
        ${SI.bars(Object.entries(best).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, label: label(k), value: n, scaled: Math.log10(Math.max(1, n)) / maxLog })))}</div>` : '';
      $('#panel-datasets').innerHTML = ds.length ? chart + `<div class="grid grid-2">${ds.map(card).join('')}</div>` : `<p class="empty">${esc(P.empty)}</p>`;
      $('#panel-tools').innerHTML = tools.length ? `<div class="grid grid-auto">${tools.map(card).join('')}</div>` : `<p class="empty">${esc(P.empty)}</p>`;
      $('#panel-code_mixed').innerHTML = cm.length ? `<div class="grid grid-auto">${cm.map(c => card({ ...c, languages_text: c.languages, languages: undefined })).join('')}</div>` : `<p class="empty">${esc(P.empty)}</p>`;
      [['datasets', ds], ['tools', tools], ['code_mixed', cm]].forEach(([id, list]) => { const b = $(`#rs-tab-${id}`); if (b) b.textContent = `${P.tabs[id]} (${list.length})`; });
      SI.setParams({ lang: state.lang, q: state.q });
    }
    $('#q').addEventListener('input', SI.debounce(e => { state.q = e.target.value.trim(); apply(); }));
    $('#lang').addEventListener('change', e => { state.lang = e.target.value; apply(); });
    apply();
    if (state.tab !== 'datasets') ctl.select(state.tab);
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' });
  } catch (e) { SI.showError($('#hero'), e); }
})();
