# Component - Tool Citations and External Metadata Fetch

Write `vault/research/Component - Tool Citations and External Metadata Fetch.md` for `release_26.1`/`dev`. Cover how a tool's citations travel from source to display: XML `parse_citations` (profile-gated skip vs error) and YAML `parse_citations`, the `Citation` model in `tool_util_models/tool_source.py`, `Tool._parse_citations`, `CitationsManager`/`DoiCache` (`managers/citations.py`, beaker cache, lazy fetch in `DoiCitation.to_bibtex`), consumers (`api/tools.py` citations endpoint, `services/histories.py` history citations, tool form footer, agents operations, Tool Shed app), the bio.tools metadata source and its cache (`tool_util/biotools/source.py`, `tools/biotools.py`), the `citation_cache_*`/`biotools_service_cache_*` config options in the Galaxy and Tool Shed schemas and `config/__init__.py`/`tool_shed/webapp/config.py`, and the existing unit/API tests. Note how outbound fetches elsewhere are bounded (`stream_url_to_file`, `validate_non_local`, `fetch_url_allowlist_ips`, TRS proxy) for comparison. Leave out the YAML authoring models beyond `Citation` (see `Component - User-Defined Tool Source Validation`).

## Why

Citation hardening work needed the full source-to-display path and every outbound-fetch site and found no note; `Component - Data Fetch` and `Component - DRS Support` cover only the data-import fetch paths.

## Requested by

- vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/brain_research.md: needed the citation flow, cache wiring and consumer list in one place.

## Debrief

- Created `vault/research/Component - Tool Citations and External Metadata Fetch.md`, verified against Galaxy `origin/dev` `65e6daff2334c8cfd4971682eecfb87f38a224be`. Covers XML `parse_citations` and its profile rule, the `Citation` model, `Tool._parse_citations`, `CitationsManager`/`DoiCache`, every consumer (tools and histories citation APIs, tool form footer, history citations page, agent/MCP, Tool Shed app and Tool Shed 2.0 UI), the bio.tools source and its cache, `citation_cache_*`/`biotools_service_cache_*` config for Galaxy and the Tool Shed, tests, and the comparison with outbound URL bounding (`validate_non_local`, `fetch_url_allowlist_ips`, HTTP file source, TRS proxy).
- **YAML `parse_citations` does not exist on `dev`.** `YamlToolSource` inherits the default `[]`, so YAML and user tools drop their citations at load. The note describes that baseline and puts the `yaml_tool_model_validation_26.1` / `citation_fetch_hardening_26.1` changes in a separate "In-flight changes" section. Only `dev` was read, not `release_26.1`.
- Added backlinks in Data Fetch, DRS Support, User-Defined Tool Source Validation, User-Defined Tools, Agents Backend, PR 22615 and PR 18524.
- Research issues filed: `agents-tool-citations-wrong-attributes.md`, `tool-shed-citation-cache-url-reads-lock-dir.md` (the `config.py:135` typo, plus schema/default drift), `yaml-tool-citations-dropped-at-load.md`, `biotools-cache-shares-doi-namespace.md`.
- Out of scope: the YAML authoring models other than `Citation`, the data-import fetch internals (beyond the comparison), and client citation-js formatting details. Hardening observations were reported to John privately, not recorded here.
