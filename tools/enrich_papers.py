#!/usr/bin/env python3
"""Fill in full abstracts, authors and years in data/papers.json from the original sources.

    python3 tools/enrich_papers.py            # update data/papers.json in place
    python3 tools/enrich_papers.py --dry-run  # only report what would change

Sources, in order: the arXiv API (arXiv links), the ACL Anthology .bib files (ACL links),
and Semantic Scholar's title match for everything else. An abstract is only replaced when the
stored one is empty or a cut-off beginning of the fetched one, so hand-written text is kept;
authors are only added when missing. Runs in GitHub Actions (.github/workflows/papers.yml).
"""
import argparse, difflib, html, json, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "papers.json"
UA = {"User-Agent": "sigiranic.github.io metadata updater (https://github.com/sigiranic/sigiranic.github.io)"}


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 500, 502, 503) and i < tries - 1:
                time.sleep(5 * (i + 1))
                continue
            print(f"  ! {url}: HTTP {e.code}", file=sys.stderr)
            return None
        except Exception as e:  # network hiccup
            if i < tries - 1:
                time.sleep(3 * (i + 1))
                continue
            print(f"  ! {url}: {e}", file=sys.stderr)
            return None


def clean(s):
    s = html.unescape(s or "")
    s = s.replace("``", "\u201c").replace("''", "\u201d")
    s = re.sub(r"\\[a-zA-Z]+\{([^}]*)\}", r"\1", s)        # \emph{x} -> x
    s = s.replace("{", "").replace("}", "").replace("\\", "").replace("--", "–")
    return re.sub(r"\s+", " ", s).strip()


def norm(t):
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


def same_title(a, b):
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio() >= 0.9


# ---------- arXiv ----------
ARXIV_ID = re.compile(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})")


def fetch_arxiv(ids):
    out = {}
    ids = sorted(set(ids))
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        xml = get("https://export.arxiv.org/api/query?" + urllib.parse.urlencode({"id_list": ",".join(chunk), "max_results": len(chunk)}))
        if not xml:
            continue
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for e in ET.fromstring(xml).findall("a:entry", ns):
            m = ARXIV_ID.search(e.findtext("a:id", "", ns))
            if not m:
                continue
            out[m.group(1)] = {
                "title": clean(e.findtext("a:title", "", ns)),
                "abstract": clean(e.findtext("a:summary", "", ns)),
                "authors": [clean(a.findtext("a:name", "", ns)) for a in e.findall("a:author", ns)],
                "year": int(e.findtext("a:published", "0000", ns)[:4]),
            }
        time.sleep(3)  # arXiv asks for a pause between calls
    return out


# ---------- ACL Anthology ----------
ACL_ID = re.compile(r"(?:aclanthology\.org|aclweb\.org/anthology)/([A-Z]\d{2}-\d{4}|\d{4}\.[\w-]+\.\d+)")


def bib_fields(bib):
    """Parse field = "..." / {...} / number pairs from one BibTeX entry."""
    fields, i = {}, bib.find(",") + 1
    while i < len(bib):
        m = re.compile(r"\s*(\w+)\s*=\s*").match(bib, i)
        if not m:
            break
        key, i = m.group(1).lower(), m.end()
        if bib[i] == '"':
            j = i + 1
            while j < len(bib) and not (bib[j] == '"' and bib[j - 1] != "\\"):
                j += 1
            fields[key], i = bib[i + 1:j], j + 1
        elif bib[i] == "{":
            depth, j = 0, i
            while j < len(bib):
                depth += {"{": 1, "}": -1}.get(bib[j], 0)
                if depth == 0:
                    break
                j += 1
            fields[key], i = bib[i + 1:j], j + 1
        else:
            m2 = re.compile(r"[^,\n}]+").match(bib, i)
            fields[key], i = (m2.group(0).strip(), m2.end()) if m2 else ("", i + 1)
        i = bib.find(",", i) + 1 if bib.find(",", i) != -1 else len(bib)
    return fields


def fetch_acl(aid):
    bib = get(f"https://aclanthology.org/{aid}.bib")
    if not bib:
        return None
    f = bib_fields(bib)
    authors = [clean(" ".join(reversed([p.strip() for p in a.split(",", 1)])) if "," in a else a) for a in re.split(r"\s+and\s+", f.get("author", "")) if a.strip()]
    return {"title": clean(f.get("title")), "abstract": clean(f.get("abstract")), "authors": authors,
            "year": int(f["year"]) if f.get("year", "").isdigit() else None}


# ---------- Semantic Scholar ----------
def fetch_s2(title):
    q = urllib.parse.urlencode({"query": title, "fields": "title,abstract,authors,year"})
    txt = get(f"https://api.semanticscholar.org/graph/v1/paper/search/match?{q}")
    time.sleep(1.5)
    if not txt:
        return None
    data = (json.loads(txt).get("data") or [None])[0]
    if not data or not same_title(data.get("title"), title):
        return None
    return {"title": data.get("title"), "abstract": clean(data.get("abstract")), "authors": [a["name"] for a in data.get("authors") or []], "year": data.get("year")}


def truncated(stored, full):
    """True when the stored abstract is empty or a cut-off beginning of the full one."""
    s = norm(stored)
    return not s or (len(norm(full)) > len(s) and norm(full).startswith(s[: max(0, len(s) - 3)]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    papers = json.loads(DATA.read_text())
    cut = lambda a: not a or not re.search(r"[.!?)\"\u201d]\s*$", a)   # empty or ends mid-sentence
    todo = [p for p in papers if not p.get("placeholder") and (cut(p.get("abstract")) or not p.get("authors"))]
    print(f"{len(todo)} of {len(papers)} papers need an abstract or authors")

    arxiv_ids = {p["id"]: m.group(1) for p in todo for m in [ARXIV_ID.search(p["url"] + " " + " ".join((p.get("links") or {}).values()))] if m}
    arxiv = fetch_arxiv(arxiv_ids.values()) if arxiv_ids else {}

    filled_abs = filled_auth = 0
    missing = []
    for p in todo:
        meta = None
        if p["id"] in arxiv_ids:
            meta = arxiv.get(arxiv_ids[p["id"]])
        if not meta:
            m = ACL_ID.search(p["url"] + " " + " ".join((p.get("links") or {}).values()))
            if m:
                meta = fetch_acl(m.group(1).rstrip("."))
        if not meta or not meta.get("abstract"):
            meta = fetch_s2(p["title"]) or meta
        if not meta:
            missing.append(p["title"])
            continue
        if meta.get("title") and not same_title(meta["title"], p["title"]):
            print(f"  ? title mismatch, skipped: {p['title'][:60]} <> {meta['title'][:60]}")
            missing.append(p["title"])
            continue
        if meta.get("abstract") and truncated(p.get("abstract"), meta["abstract"]):
            p["abstract"] = meta["abstract"]
            filled_abs += 1
        if not p.get("authors") and meta.get("authors"):
            p["authors"] = ", ".join(meta["authors"])
            filled_auth += 1
        if not p.get("abstract") and not meta.get("abstract"):
            missing.append(p["title"])

    print(f"filled {filled_abs} abstracts and {filled_auth} author lists")
    if missing:
        print("not found:\n  " + "\n  ".join(missing))
    if not args.dry_run:
        DATA.write_text(json.dumps(papers, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
