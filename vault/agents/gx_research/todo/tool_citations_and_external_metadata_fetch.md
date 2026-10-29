# Component - Tool Citations and External Metadata Fetch

Write `vault/research/Component - Tool Citations and External Metadata Fetch.md` for `release_26.1`/`dev`. Cover how a tool's citations travel from source to display: XML `parse_citations` (profile-gated skip vs error) and YAML `parse_citations`, the `Citation` model in `tool_util_models/tool_source.py`, `Tool._parse_citations`, `CitationsManager`/`DoiCache` (`managers/citations.py`, beaker cache, lazy fetch in `DoiCitation.to_bibtex`), consumers (`api/tools.py` citations endpoint, `services/histories.py` history citations, tool form footer, agents operations, Tool Shed app), the bio.tools metadata source and its cache (`tool_util/biotools/source.py`, `tools/biotools.py`), the `citation_cache_*`/`biotools_service_cache_*` config options in the Galaxy and Tool Shed schemas and `config/__init__.py`/`tool_shed/webapp/config.py`, and the existing unit/API tests. Note how outbound fetches elsewhere are bounded (`stream_url_to_file`, `validate_non_local`, `fetch_url_allowlist_ips`, TRS proxy) for comparison. Leave out the YAML authoring models beyond `Citation` (see `Component - User-Defined Tool Source Validation`).

## Why

Citation hardening work needed the full source-to-display path and every outbound-fetch site and found no note; `Component - Data Fetch` and `Component - DRS Support` cover only the data-import fetch paths.

## Requested by

- vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/brain_research.md: needed the citation flow, cache wiring and consumer list in one place.
