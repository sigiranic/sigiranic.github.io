(async () => {
  const { esc, tok, $, $$, fmt, data, fill } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.languages, T = site.taxonomy;
    const [languages, scripts] = await Promise.all([data('languages'), data('writing-systems')]);
    const scriptName = Object.fromEntries(scripts.map(s => [s.id, s.name]));
    const url = SI.params();
    const state = { q: url.get('q') || '', branch: url.get('branch') || 'all', status: url.get('status') || 'all', script: url.get('script') || 'all', color: url.get('color') === 'status' ? 'status' : 'branch' };

    $('#hero').innerHTML = `<span class="kicker">${esc(P.kicker)}</span><h1>${esc(P.h1)}</h1><p class="lead">${esc(P.lead)}</p>`;
    const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
    const usedScripts = [...new Set(languages.map(l => l.scriptId))].sort((a, b) => (scriptName[a] || a).localeCompare(scriptName[b] || b));
    $('#filters').innerHTML = `
      <label class="grow"><span class="visually-hidden">${esc(P.search_placeholder)}</span><input class="input" id="q" type="search" placeholder="${esc(P.search_placeholder)}" value="${esc(state.q)}"></label>
      <label><span class="visually-hidden">${esc(site.pages.language.facts.status)}</span><select class="select" id="status">${opt('all', site.pages.language.facts.status + ': ' + site.labels.all, state.status)}${Object.entries(T.status).map(([k, v]) => opt(k, v.label, state.status)).join('')}</select></label>
      <label><span class="visually-hidden">${esc(site.pages.language.facts.script)}</span><select class="select" id="script">${opt('all', site.pages.language.facts.script + ': ' + site.labels.all, state.script)}${usedScripts.map(k => opt(k, scriptName[k] || k, state.script)).join('')}</select></label>
      <label><span class="visually-hidden">${esc(P.color_by.branch)}</span><select class="select" id="color">${Object.entries(P.color_by).map(([k, v]) => opt(k, v, state.color)).join('')}</select></label>
      <button class="btn" type="button" id="csv">${esc(P.export)}</button>`;
    const branchCount = b => languages.filter(l => l.branch === b).length;
    $('#branch-chips').innerHTML = [['all', site.labels.all, languages.length]].concat(Object.entries(T.branches).map(([k, v]) => [k, v.label, branchCount(k)]))
      .map(([k, label, n]) => `<button class="chip" type="button" data-branch="${esc(k)}" aria-pressed="${state.branch === k}">${k === 'all' ? '' : `<span class="dot" style="background:${SI.color(T.branches[k].color)}"></span>`}${esc(label)} <span class="muted">${n}</span></button>`).join('');

    const map = await SIMap.make($('#map'));
    const layer = L.layerGroup().addTo(map);
    const markers = new Map();
    const colorOf = l => (state.color === 'status' ? SI.status(site, l.status) : SI.branch(site, l.branch)).color;
    let rows = [];

    function apply() {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      rows = languages.filter(l =>
        (state.branch === 'all' || l.branch === state.branch) &&
        (state.status === 'all' || l.status === state.status) &&
        (state.script === 'all' || l.scriptId === state.script) &&
        terms.every(t => `${l.name} ${l.code} ${l.area} ${l.glottolog}`.toLowerCase().includes(t)))
        .sort((a, b) => a.name.localeCompare(b.name));
      $('#count').textContent = fill(P.count, { n: fmt(rows.length), total: fmt(languages.length) });
      $('#list').innerHTML = rows.map(l => `<li><a href="${SI.langUrl(l.code)}" data-code="${esc(l.code)}"><span class="dot" style="background:${SI.color(colorOf(l))}"></span><span>${esc(l.name)}</span><small>${esc(l.code)} · ${esc(l.speakers || '–')}</small></a></li>`).join('');
      layer.clearLayers(); markers.clear();
      rows.forEach(l => {
        if (!Array.isArray(l.coordinates)) return;
        const m = SIMap.dot(l, colorOf(l)).bindPopup(() => SIMap.popup(l, site)).addTo(layer);
        m.on('mouseover', () => highlight(l.code, true)).on('mouseout', () => highlight(l.code, false));
        markers.set(l.code, m);
      });
      const legend = state.color === 'status' ? T.status : T.branches;
      $('#legend').innerHTML = Object.values(legend).map(v => `<span><i style="background:${SI.color(v.color)}"></i>${esc(v.label)}${v.text ? ` <span class="muted">· ${esc(v.text)}</span>` : ''}</span>`).join('');
      SI.setParams({ q: state.q, branch: state.branch, status: state.status, script: state.script, color: state.color === 'branch' ? '' : state.color });
    }
    function highlight(code, on) {
      const a = $(`#list a[data-code="${CSS.escape(code)}"]`); if (a) a.classList.toggle('hl', on);
      const m = markers.get(code); if (m) m.setStyle({ radius: on ? 11 : 7, weight: on ? 2.5 : 1.5 });
    }
    $('#list').addEventListener('mouseover', e => { const a = e.target.closest('a[data-code]'); if (a) highlight(a.dataset.code, true); });
    $('#list').addEventListener('mouseout', e => { const a = e.target.closest('a[data-code]'); if (a) highlight(a.dataset.code, false); });
    $('#list').addEventListener('focusin', e => { const a = e.target.closest('a[data-code]'); const m = a && markers.get(a.dataset.code); if (m) map.panTo(m.getLatLng()); });

    $('#q').addEventListener('input', SI.debounce(e => { state.q = e.target.value.trim(); apply(); }));
    ['status', 'script', 'color'].forEach(id => $('#' + id).addEventListener('change', e => { state[id] = e.target.value; apply(); }));
    $('#branch-chips').addEventListener('click', e => {
      const b = e.target.closest('[data-branch]'); if (!b) return;
      state.branch = b.dataset.branch;
      $$('[data-branch]').forEach(x => x.setAttribute('aria-pressed', x === b));
      apply();
    });
    $('#csv').addEventListener('click', () => {
      const F = site.pages.language.facts;
      SI.download('iranian-languages.csv', SI.csv([['name', 'iso639_3', 'glottolog', F.branch, F.status, F.speakers, F.area, F.script, 'lat', 'lon'],
        ...rows.map(l => [l.name, l.code, l.glottolog, SI.branch(site, l.branch).label, SI.status(site, l.status).label, l.speakers, l.area, l.script, ...(l.coordinates || [])])]), 'text/csv');
    });
    document.addEventListener('si:theme', apply);
    apply();
  } catch (e) { SI.showError($('#hero'), e); }
})();
