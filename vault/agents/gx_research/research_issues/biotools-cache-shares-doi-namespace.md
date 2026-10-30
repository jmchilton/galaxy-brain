# bio.tools metadata cache reuses the citation cache's beaker namespace

- Area: lib/galaxy/tools/biotools.py, lib/galaxy/tool_util/biotools/source.py
- Found while: [[Component - Tool Citations and External Metadata Fetch]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`get_galaxy_biotools_metadata_source` (`tools/biotools.py:18-26`) builds its beaker cache with `.get_cache("doi")`, the same namespace as `DoiCache` (`managers/citations.py:69`), apparently copied. With the default `file` type the two use different data dirs (`biotools/` and `citations/` under `cache_dir`), so nothing collides. With `ext:database`, both URLs default to `database_connection` (`config/__init__.py:166-170`) and both table names default to `beaker_cache` (`config_schema.yml`). DOI entries and bio.tools entries then share one namespace in one table. Keys rarely collide, since DOIs start with `10.` and bio.tools ids don't, but the namespace no longer tells you which cache owns a row, and clearing one cache clears the other.

Related cache quirks in the same module:

- `InMemoryCache.backend` is a class attribute (`tool_util/biotools/source.py:34-42`), so every `ApiBiotoolsMetadataSource()` built without a cache (for example the `BioToolsValid` linter, `tool_util/linters/general.py:257-267`) shares one process-wide dict that never evicts.
- `_raw_get_metadata` returns `None` on any exception (`source.py:51-59`). The cache stores that `None`, so a transient bio.tools outage is cached as "no entry". `DoiCache` behaves the other way: failures raise and are never cached.

## Evidence / repro

- Read in code. `test/unit/tool_util/biotools/test_metadata_source.py` exercises the API source only against the live site (`skip_if_site_down`) and doesn't cover caching.

## Suggested fix

Use a distinct namespace (`"biotools"`), make `InMemoryCache.backend` an instance attribute, and skip caching failures (raise from `createfunc`, catch in `get_biotools_metadata`).
