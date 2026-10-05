/* Leaflet helpers. Tile URLs are in data/site.json (map); the CARTO key is written to
   data/runtime.json at deploy time from the CARTO_BASEMAPS_KEY repository secret. */

const SIMap = (() => {
  const cfg = Promise.all([SI.data('site'), SI.getJSON('data/runtime.json').catch(() => ({}))]).then(([site, rt]) => {
    const m = site.map, key = String(rt.carto_basemaps_key || '').trim();
    return key
      ? { light: m.tiles.light.replace('{key}', encodeURIComponent(key)), dark: m.tiles.dark.replace('{key}', encodeURIComponent(key)), attribution: m.attribution, dim: false, center: m.center, zoom: m.zoom }
      : { light: m.fallback.tiles, dark: m.fallback.tiles, attribution: m.fallback.attribution, dim: true, center: m.center, zoom: m.zoom };
  });

  async function make(el, { center, zoom, scroll = true } = {}) {
    const c = await cfg;
    const map = L.map(el, { scrollWheelZoom: scroll, worldCopyJump: true, minZoom: 2 }).setView(center || c.center, zoom || c.zoom);
    let layer;
    const tiles = () => {
      const theme = SI.currentTheme();
      if (layer) map.removeLayer(layer);
      layer = L.tileLayer(c[theme], { attribution: c.attribution, maxZoom: 12 }).addTo(map);
      el.classList.toggle('dim-tiles', c.dim && theme === 'dark');
    };
    tiles();
    document.addEventListener('si:theme', tiles);
    return map;
  }

  const ring = () => SI.currentTheme() === 'dark' ? '#15110d' : '#fffdf8';
  function dot(l, color, radius = 7) {
    return L.circleMarker([l.coordinates[0], l.coordinates[1]], { radius, weight: 1.5, color: ring(), opacity: .95, fillColor: color, fillOpacity: .85 });
  }
  function popup(l, site) {
    const b = SI.branch(site, l.branch), s = SI.status(site, l.status);
    return `<b>${SI.esc(l.name)}</b> <code>${SI.esc(l.code)}</code><br>${SI.esc(b.label)} · ${SI.esc(s.label)}<br>${SI.esc(l.area)}<br><a href="${SI.langUrl(l.code)}">${SI.esc(site.labels.open)} →</a>`;
  }
  return { make, dot, popup, ring };
})();
