# Tool Shed tool search misses `seqkit_stats` for "seqkit stats"

- Target: galaxyproject/galaxy (Tool Shed, `lib/tool_shed/webapp/search/tool_search.py`). Not gxwf: it passes the query through unchanged and returns exactly what the API returns. Foundry tracking needed: yes. Comment on the existing galaxyproject/foundry#574 rather than opening a new issue. Foundry Molds already tell the agent to try query variants, so no Mold change is needed.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29, phase 5, iteration 17 (`trimmed_read_counts`), 2026-10-29. Ledger id `gxwf-tool-search-recall-seqkit-stats` (minor). The driver found the tool with `gxwf tool-search seqkit --owner iuc`.
- Existing issues/PRs: galaxyproject/foundry#574 (open, `needs-triage`) is the same root cause seen from Foundry. There, `collapse_collections` returned no hits because `repo_name` and `id` aren't search fields. galaxyproject/galaxy#2285 (open since 2016, "improve TS search index generation and search") is the general upstream request. I found no Galaxy issue or PR for these two defects. galaxyproject/galaxy#24142 fixed a GUID lookup, but in Galaxy's toolbox search, not the Tool Shed's. I couldn't search jmchilton/galaxy-tool-util-ts issues because of a GitHub rate limit, but nothing there is at fault.

## Symptom
`gxwf tool-search "seqkit stats"` (CLI 1.15.0) returns only `iuc/vsnp_statistics`. `"seqkit_stats"` returns no hits at all, even though `iuc/seqkit_stats` (name "SeqKit statistics", id `seqkit_stats`) exists. `"seqkit"` lists it 7th of 9, tied at 7.81. `"seqkit statistics"` ranks it 2nd.

## Root cause
Confidence: high. Two defects in the Tool Shed's tool search, both server-side:
1. **The tool id and repository name aren't searched.** The tool index stores `id` and `repo_name` (`shed_index.py:79`, `:192`), but the parser searches only `["name", "description", "help", "repo_owner_username"]` (`tool_search.py:80`). The word "stats" appears in `seqkit_stats` only in its id and repo name, so a query for it can't match. Also, Whoosh's `StandardAnalyzer` keeps `seqkit_stats` as one token (`\w` includes `_`), so an underscored query only matches an indexed underscored token. #574 has the same cause.
2. **Wrapping the whole query in `*...*` makes multi-word queries strict.** `parser.parse(f"*{search_term}*")` (`tool_search.py:82`) adds a wildcard only to the outer ends of the whole string. "seqkit stats" becomes `*seqkit AND stats*`: AND by default, a suffix match on the first word and a prefix match on the last. `stats*` doesn't match "statistics" and there's no stemming, so every term must appear literally somewhere. `vsnp_statistics` matched because its help text mentions seqkit. That's how an unrelated tool became the only hit.

gxwf isn't at fault. `@galaxy-tool-util/search@1.15.0` `dist/client/toolshed.js:15` sends `q` verbatim (as its comment says it should), and its result scores match the raw API scores to the digit.

## Evidence
- Raw API, 2026-10-29: `GET https://toolshed.g2.bx.psu.edu/api/tools?q=…`
  - `seqkit+stats` returns 1 hit: `vsnp_statistics` 17.99, matched_terms `{help: seqkit}`.
  - `seqkit_stats` returns 0.
  - `seqkit+statistics` returns 2 hits: `vsnp_statistics` 24.87, then `seqkit_stats` 21.15, matched_terms `{name: seqkit, help: statistics}`.
  - `seqkit` returns 9 hits, with `seqkit_stats` at 7.81.
- The repository search does work: `/api/repositories?q=seqkit_stats` returns `iuc/seqkit_stats` (86.82), because it searches the repository `name`. `?q=seqkit+stats` returns 0.
- Parsing locally with whoosh, using the schema and field list from `tool_search.py`:
  - `"*seqkit stats*"` parses to `((name:*seqkit OR description:*seqkit OR help:*seqkit OR repo_owner_username:*seqkit) AND (name:stats* OR … ))`.
  - `StandardAnalyzer("seqkit_stats")` gives `['seqkit_stats']`.
  - `"SeqKit statistics"` gives `['seqkit','statistics']`.
- Line numbers are from galaxyproject/galaxy dev @ 44f71e8: `lib/tool_shed/webapp/search/tool_search.py:37-47` (schema), `:80` (fields), `:82` (wrap), and `lib/tool_shed/util/shed_index.py:76-81`, `:184-196`.
- Foundry already documents these limits. In pipeline-run-smrnaseq-v1 @ e0aefee0, `content/cli/gxwf/tool-search.md:69,72-73` covers searchable fields, the wrap and ids. `content/molds/discover-shed-tool/index.md:123,169` says to split `_` and also try "the bare significant word" before calling a search a `miss`. Following that rule (`seqkit`) would have found the tool.

## Proposed fix
- Upstream (Galaxy Tool Shed):
  - (a) Add `id` and `repo_name` to the `MultifieldParser` fields, with a boost, so a tool id or repo slug ranks first.
  - (b) Wildcard each term, not the whole string, and combine the terms with OR plus a bonus for matching all of them (`qparser.OrGroup.factory(0.9)`), instead of a strict AND.
  - (c) Optionally, index `id`/`repo_name` with an analyzer that also splits on `_`/`-`, e.g. by adding a split copy of the field.
  - Add tests in `test/unit/tool_shed/` using `seqkit_stats` and `collapse_collections`.
- Foundry: no Mold change. Comment on #574 and label it `upstream/tool-shed`. After the Tool Shed deploys the fix, retest #574 and this case and close #574.

## Draft issue
**galaxyproject/galaxy: Tool Shed tool search ignores tool id and repository name; multi-word queries require every term**

`/api/tools?q=` searches only `name`, `description`, `help` and `repo_owner_username` (`lib/tool_shed/webapp/search/tool_search.py:80`), even though `id` and `repo_name` are in the index. The parser also wraps the whole query once: `parser.parse(f"*{search_term}*")` (line 82). The results on toolshed.g2.bx.psu.edu:

| Query | Result |
|---|---|
| `seqkit_stats` (the tool id and repo name) | 0 hits |
| `collapse_collections` | 0 hits |
| `seqkit stats` | parses to `*seqkit AND stats*`, so `stats*` doesn't match "SeqKit statistics"; the only hit is `vsnp_statistics`, whose help mentions seqkit |

`/api/repositories?q=seqkit_stats` finds the repository (score 86.8), so the tool search is the outlier.

Suggested changes:
1. Add `id` and `repo_name` to the searched fields, with a boost.
2. Wildcard each term, and use an OR group with a bonus for matching every term instead of an implicit AND.
3. Optionally, tokenize `id`/`repo_name` on `_`/`-` as well.

Related: #2285. Seen through `gxwf tool-search` (galaxy-tool-util-ts), which forwards the query unchanged.

**Comment for galaxyproject/foundry#574 (label `upstream/tool-shed`):**
> Same root cause, hit again on 2026-10-29 (smrnaseq workflow-brief-to-galaxy run): `gxwf tool-search "seqkit stats"` missed `iuc/seqkit_stats` and `"seqkit_stats"` returned nothing. It isn't gxwf, which forwards `q` unchanged. The Tool Shed tool search doesn't search `id`/`repo_name` (`tool_search.py:80`), and its single `*query*` wrap ANDs the terms (`:82`). Filed upstream: "Tool Shed tool search ignores tool id and repository name; multi-word queries require every term". `discover-shed-tool` already says to try the bare word before calling a search a `miss`, so Foundry needs no Mold change. Close this issue once the Tool Shed deploys the fix.
