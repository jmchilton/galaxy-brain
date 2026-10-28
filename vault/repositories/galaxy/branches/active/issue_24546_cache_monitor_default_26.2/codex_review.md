Run via gpt-6-sol at medium effort.

# Codex review (round 2, after re-scope)

Acted on 1 of 2 findings. Fixed the confirmed iRODS XML P1 in `315bd644053`. The Celery per-store P1 is left as a pre-existing follow-up.

Not acted on:
- **Celery cleanup ignores per-store drivers.** Valid but pre-existing, and out of scope for a 26.2 fix. `lib/galaxy/celery/__init__.py` schedules `clean_object_store_caches` from the global driver only, and the task scans every cache target. A per-store `celery` under a global `external` gets no task, and a per-store `external` under a global `celery` still gets cleaned. Beat schedules at config time, before any store exists, so the fix needs design (the thermo review and scope eval said the same). Dev follow-up / PR-description note.

<details><summary>Details</summary>

Scope: `git diff origin/release_26.2...HEAD` at `0279b1a5ff2`. Codex left no coverage notes.

1. **P1, certain: iRODS XML cache monitor overrides are discarded.** CONFIRMED.
   - `irods.parse_config_xml` hand-built `cache_dict` from size, path, cache_updated_data and dirs, and dropped `monitor`.
   - Effect: `<cache size="1" monitor="external"/>` with global `auto` and no Celery started an in-process thread.
   - Fix: use the shared `parse_caching_config_dict_from_xml`, keeping iRODS's required-`<cache>` check.
   - Red test: `test_parse_config_xml_cache_monitor`.
   - `monitor_interval` is not parsed from XML by any store (shared parser included), so that stays consistent.
2. **P1, certain: per-store driver overrides don't control Celery cleanup.** Valid, pre-existing, not acted on (above).
</details>
