# sigiranic.github.io

Website of SIG Iranic, the special interest group on Iranian languages: <https://sigiranic.github.io>.

| Page | URL |
|---|---|
| Home, with search across everything | `/` |
| Languages: map, filters, CSV export | `/languages/` |
| One page per language (101) | `/languages/<iso>/` |
| Family tree | `/family/` |
| Scripts and timeline | `/scripts/` |
| Papers: filters, charts, BibTeX/CSV | `/research/` |
| Datasets and NLP tools | `/datasets/` |
| Text toolkit: normalise, inspect, transliterate | `/toolkit/` |
| Community | `/community/` |

## All content lives in `data/`

| File | What |
|---|---|
| `site.json` | every label and page text, navigation, colours, family-tree grouping, external link templates, map settings |
| `languages.json` | the 101 languages: ISO 639-3, Glottolog, branch, vitality, speakers, area, script, coordinates |
| `papers.json` | papers; `langs` use the keys mapped to ISO codes in `site.json` → `taxonomy.lang_keys` |
| `resources.json` | parallel data, NLP tools and code-mixing resources per language |
| `writing-systems.json` | scripts, with Unicode blocks, fonts and periods for the timeline |
| `text-tools.json` | toolkit rules: normalisation, flagged characters, script ranges, transliteration tables |

`templates/` holds only page structure and `assets/js/` only arranges the data. To add a paper or a dataset, edit the JSON and open a pull request.

## Build and run

```bash
python3 tools/build.py --out _site      # also checks links and placeholders
python3 -m http.server 8000 --directory _site
```

`.github/workflows/pages.yml` builds and deploys on every push to `main`, and writes the
`CARTO_BASEMAPS_KEY` secret to `_site/data/runtime.json` for the map tiles.

## Security

Everything from JSON or the URL is escaped before it reaches the page; links pass an allowlist
(`http(s)`, `mailto`, site paths) and colours a strict pattern. Each page sets a Content-Security-Policy
with scripts from this site only (Leaflet is vendored under `assets/vendor/`). The site is static, with
no forms, cookies or accounts, and the toolkit processes text only in the browser.
