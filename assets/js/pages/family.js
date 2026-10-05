(async () => {
  const { esc, tok, $, $$, data } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.family, T = site.taxonomy, F = T.family;
    const languages = await data('languages');
    $('#hero').innerHTML = `<span class="kicker">${esc(P.kicker)}</span><h1>${esc(P.h1)}</h1><p class="lead">${esc(P.lead)}</p>`;
    $('#note').textContent = P.note;
    $('#controls').innerHTML = `<label class="grow"><span class="visually-hidden">${esc(P.filter_placeholder)}</span><input class="input" id="hl" type="search" placeholder="${esc(P.filter_placeholder)}"></label>
      <button class="btn" type="button" id="open-all">${esc(P.expand)}</button><button class="btn" type="button" id="close-all">${esc(P.collapse)}</button>`;
    $('#legend').innerHTML = Object.values(T.status).map(v => `<span><i style="background:${SI.color(v.color)}"></i>${esc(v.label)}</span>`).join('');

    const inBranch = b => languages.filter(l => l.branch === b).sort((a, c) => a.name.localeCompare(c.name));
    const leaf = l => `<li><a href="${SI.langUrl(l.code)}" data-name="${esc((l.name + ' ' + l.code).toLowerCase())}" title="${esc(SI.status(site, l.status).label)}"><i style="background:${SI.color(SI.status(site, l.status).color)}"></i>${esc(l.name)}</a></li>`;
    const branchNode = b => { const ls = inBranch(b), info = SI.branch(site, b);
      return `<li><details open><summary><span class="dot" style="width:10px;height:10px;border-radius:50%;background:${SI.color(info.color)}"></span><b>${esc(info.label)}</b><span class="n">${ls.length}</span></summary><ul class="leaves">${ls.map(leaf).join('')}</ul></details></li>`; };
    const groupNode = g => { const n = g.branches.reduce((s, b) => s + inBranch(b).length, 0);
      return `<li><details open><summary><b>${esc(g.label)}</b><span class="n">${n}</span></summary><ul>${g.branches.map(branchNode).join('')}</ul></details></li>`; };
    $('#tree').innerHTML = `<ul class="tree"><li class="root"><details open><summary><b>${esc(F.name)}</b><span class="n">${languages.length}</span></summary><ul>${F.groups.map(groupNode).join('')}</ul></details></li></ul>`;

    const all = () => $$('#tree details');
    $('#open-all').addEventListener('click', () => all().forEach(d => { d.open = true; }));
    $('#close-all').addEventListener('click', () => all().forEach((d, i) => { d.open = i === 0; }));
    $('#hl').addEventListener('input', SI.debounce(e => {
      const t = e.target.value.trim().toLowerCase();
      $$('#tree .leaves a').forEach(a => { const hit = t && a.dataset.name.includes(t); a.classList.toggle('match', !!hit); a.classList.toggle('dim', !!t && !hit); });
      if (t) $$('#tree .leaves a.match').forEach(a => { let d = a.closest('details'); while (d) { d.open = true; d = d.parentElement.closest('details'); } });
    }));
  } catch (e) { SI.showError($('#hero'), e); }
})();
