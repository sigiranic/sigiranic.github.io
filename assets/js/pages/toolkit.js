(async () => {
  const { esc, tok, $, $$, fmt, data, fill } = SI;
  try {
    const site = await SI.site;
    const P = site.pages.toolkit;
    const K = await data('text-tools');
    $('#hero').innerHTML = `<span class="kicker">${esc(P.kicker)}</span><h1>${esc(P.h1)}</h1><p class="lead">${esc(P.lead)}</p>`;
    const ids = Object.keys(P.tabs);
    const io = (id, extra = '') => `<div class="tool">
        <div><label for="${id}-in">${esc(P.input_label)}</label><textarea id="${id}-in" dir="auto" spellcheck="false"></textarea>
          <div class="btn-row" style="margin-top:10px"><button class="btn btn--sm" type="button" data-sample="${id}">${esc(P.sample)}</button><button class="btn btn--sm" type="button" data-clear="${id}">${esc(P.clear)}</button></div></div>
        <div>${extra}</div></div>`;
    const panels = {
      normalize: `<p class="muted">${esc(P.normalize_intro)}</p><div class="rules" id="rules">${K.normalize.map(r => `<label><input type="checkbox" value="${esc(r.id)}"${r.default ? ' checked' : ''}><span>${esc(r.label)}</span></label>`).join('')}</div>` +
        io('normalize', `<label for="normalize-out">${esc(P.output_label)} <span class="muted small" id="normalize-n"></span></label><textarea id="normalize-out" dir="auto" readonly></textarea><div class="btn-row" style="margin-top:10px"><button class="btn btn--sm" type="button" data-copy="normalize-out">${esc(P.copy)}</button></div>`),
      inspect: `<p class="muted">${esc(P.inspect_intro)}</p>` + io('inspect', `<div id="inspect-out" aria-live="polite"></div>`),
      translit: `<p class="muted">${esc(P.translit_intro)}</p><label class="toolbar" style="margin:14px 0"><span>${esc(P.scheme)}</span><select class="select" id="scheme">${K.translit.map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('')}</select></label>` +
        io('translit', `<label for="translit-out">${esc(P.output_label)}</label><textarea id="translit-out" readonly></textarea><p class="muted small" id="translit-note"></p><div class="btn-row"><button class="btn btn--sm" type="button" data-copy="translit-out">${esc(P.copy)}</button></div>`),
    };
    $('#tools').innerHTML = SI.tabList('tk', ids.map(id => ({ id, label: P.tabs[id] }))) + ids.map((id, i) => SI.tabPanel('tk', id, panels[id], i === 0)).join('');
    const hash = location.hash.slice(1);
    const ctl = SI.tabs($('#tools'), id => history.replaceState(null, '', '#' + id));
    if (ids.includes(hash)) ctl.select(hash);

    /* ---------- normalise ---------- */
    const compiled = Object.fromEntries(K.normalize.map(r => [r.id, r.rules.map(([pat, flags, rep]) => [new RegExp(pat, flags.includes('g') ? flags : flags + 'g'), rep])]));
    function normalize() {
      let s = $('#normalize-in').value, n = 0;
      $$('#rules input:checked').forEach(c => compiled[c.value].forEach(([re, rep]) => { s = s.replace(re, (...m) => { n++; return rep.replace(/\$(\d)/g, (_, i) => m[+i] ?? ''); }); }));
      $('#normalize-out').value = s;
      $('#normalize-n').textContent = n ? `· ${fill(P.changes, { n: fmt(n) })}` : '';
    }
    $('#normalize-in').addEventListener('input', normalize);
    $('#rules').addEventListener('change', normalize);

    /* ---------- inspect ---------- */
    const ranges = K.scripts.map(s => ({ ...s, r: s.ranges.map(([a, b]) => [parseInt(a, 16), parseInt(b, 16)]) }));
    const scriptOf = cp => ranges.find(s => s.r.some(([a, b]) => cp >= a && cp <= b));
    const hex = cp => cp.toString(16).toUpperCase().padStart(4, '0');
    const SHOW = { 0x200C: 'ZWNJ', 0x200D: 'ZWJ', 0x200E: 'LRM', 0x200F: 'RLM', 0xFEFF: 'BOM', 0x00A0: 'NBSP', 0x00AD: 'SHY', 0x0020: '␠', 0x000A: '↵', 0x0009: '⇥' };
    function inspect() {
      const text = $('#inspect-in').value, chars = [...text];
      const out = $('#inspect-out');
      if (!chars.length) { out.innerHTML = ''; return; }
      const counts = {}, flags = {};
      chars.forEach(ch => {
        const cp = ch.codePointAt(0), s = scriptOf(cp);
        if (s) counts[s.name] = (counts[s.name] || 0) + 1;
        const f = K.flags[hex(cp)];
        if (f && f.level !== 'context-sorani') flags[hex(cp)] = (flags[hex(cp)] || 0) + 1;
        if (/[‪-‮⁦-⁩]/.test(ch) && !f) flags[hex(cp)] = (flags[hex(cp)] || 0) + 1;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      const letterScripts = Object.keys(counts).filter(n => n !== 'Digits');
      const color = n => (ranges.find(s => s.name === n) || {}).color || '#8a8073';
      out.innerHTML = `<h2 class="h3">${esc(P.scripts_found)}</h2>
        <div class="stack" role="img" aria-label="${esc(Object.entries(counts).map(([n, c]) => `${n} ${Math.round(c / total * 100)}%`).join(', '))}">${Object.entries(counts).map(([n, c]) => `<i style="width:${c / total * 100}%;background:${SI.color(color(n))}"></i>`).join('')}</div>
        <div class="legend" style="margin:0 0 18px">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<span><i style="background:${SI.color(color(n))}"></i>${esc(n)} ${Math.round(c / total * 100)}%</span>`).join('')}</div>
        <h2 class="h3">${esc(P.flags_found)}</h2>
        ${Object.keys(flags).length || letterScripts.length > 1 ? `<ul class="flag-list">
          ${letterScripts.length > 1 ? `<li class="info"><code>${esc(letterScripts.length)}×</code><span>${esc(letterScripts.join(' + '))}</span><span></span></li>` : ''}
          ${Object.entries(flags).map(([h, n]) => { const f = K.flags[h] || { name: 'BIDI CONTROL', note: '', level: 'warn' }; return `<li class="${tok(f.level)}"><code>U+${esc(h)}</code><span><b>${esc(f.name)}</b><br><span class="muted">${esc(f.note)}</span></span><b>${fmt(n)}×</b></li>`; }).join('')}</ul>`
          : `<p class="muted">${esc(P.no_flags)}</p>`}
        <div class="charmap">${chars.slice(0, 400).map(ch => { const cp = ch.codePointAt(0), f = K.flags[hex(cp)], s = scriptOf(cp);
          const lvl = f && f.level !== 'context-sorani' ? f.level : (/[‪-‮⁦-⁩]/.test(ch) ? 'warn' : '');
          return `<div class="${tok(lvl)}" title="${esc(f ? f.name : (s ? s.name : ''))}"><b>${esc(SHOW[cp] || ch)}</b><small>U+${hex(cp)}</small><small>${esc(s ? s.name : '')}</small></div>`; }).join('')}</div>`;
    }
    $('#inspect-in').addEventListener('input', SI.debounce(inspect, 120));

    /* ---------- transliterate ---------- */
    const isLetter = ch => /\p{L}/u.test(ch || '');
    function translit() {
      const sc = K.translit.find(s => s.id === $('#scheme').value);
      $('#translit-note').textContent = sc.note;
      $('#translit-in').dir = sc.dir;
      const chars = [...$('#translit-in').value];
      const vowel = ch => sc.vowels.includes(ch);
      let out = '', prevVowel = false;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i], prev = chars[i - 1], next = chars[i + 1];
        const start = !isLetter(prev) || prev === '‌', end = !isLetter(next);
        let o;
        const pair = start && sc.initial_pairs && sc.initial_pairs[ch + next];
        if (pair) { out += pair; i++; prevVowel = true; continue; }
        if (sc.semivowels[ch]) {
          const sv = sc.semivowels[ch];
          if (sv.double && next === ch) { o = sv.double; i++; }
          else if (start || prevVowel || sc.vowels.includes(next) || sc.semivowels[next]) o = sv.consonant;
          else o = sv.vowel;
          prevVowel = o === sv.vowel || o === sv.double;
        } else {
          if (start && sc.initial && sc.initial[ch] != null) o = sc.initial[ch];
          else if (end && !start && sc.final && sc.final[ch] != null) o = sc.final[ch];
          else if (sc.shadda && ch === sc.shadda) o = out.slice(-1);
          else o = sc.map[ch] ?? ch;
          prevVowel = vowel(ch);
        }
        out += o;
      }
      $('#translit-out').value = out;
    }
    $('#translit-in').addEventListener('input', translit);
    $('#scheme').addEventListener('change', translit);

    /* ---------- shared buttons ---------- */
    const run = { normalize, inspect, translit };
    $('#tools').addEventListener('click', e => {
      const s = e.target.closest('[data-sample]'), c = e.target.closest('[data-clear]'), cp = e.target.closest('[data-copy]');
      if (s) { const id = s.dataset.sample; const v = K.samples[id]; $(`#${id}-in`).value = typeof v === 'string' ? v : v[$('#scheme').value]; run[id](); }
      if (c) { const id = c.dataset.clear; $(`#${id}-in`).value = ''; run[id](); }
      if (cp) SI.copy($('#' + cp.dataset.copy).value, cp);
    });
    translit();
  } catch (e) { SI.showError($('#hero'), e); }
})();
