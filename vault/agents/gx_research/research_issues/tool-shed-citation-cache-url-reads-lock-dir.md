# Tool Shed config sets `citation_cache_url` from the `citation_cache_lock_dir` key

- Area: lib/tool_shed/webapp/config.py
- Found while: [[Component - Tool Citations and External Metadata Fetch]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`ToolShedAppConfiguration` (`tool_shed/webapp/config.py:129-137`) overrides the citation cache options by hand. Line 135 reads the wrong key:

```python
self.citation_cache_url = kwargs.get("citation_cache_lock_dir", None)
```

A `citation_cache_url` set in `tool_shed.yml` is ignored. If the admin sets `citation_cache_lock_dir`, its raw path is passed as the beaker `cache.url`. That only matters for `citation_cache_type: ext:database`, but there it makes the documented option unusable.

The same block uses different defaults from the shed schema. `config.py` uses `database/tool_shed_citations/{data,locks}`, while `tool_shed_config_schema.yml:680-696` documents `database/citations/data` and `database/citations/lock`. The hand-written defaults are the ones in effect, so the generated sample/docs describe paths the shed doesn't use. `citation_cache_type` is not overridden and comes from the schema default (`file`).

## Evidence / repro

- Read in code. No test covers Tool Shed citation cache config.

## Suggested fix

Change line 135 to read `citation_cache_url`. Then either drop the hand-written overrides and let the schema defaults (with root-dir resolution) apply, or make the schema defaults match the overrides.
