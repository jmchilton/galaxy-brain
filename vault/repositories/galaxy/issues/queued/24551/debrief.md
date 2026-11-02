# Debrief

- Source: gx_research ingest of [[Component - Object Store Cache and Direct Access]] (2026-10-28), `origin/dev` @ `7761eeb3256`.
- One subagent review round fixed: route path, who uses `metadata_file` (history download menu, not genome browsers), #19255 cited only for 504s, `display?filename=` stream-only (keeps #22895/#23321 no-redirect rule), content-type/sanitization handling, Range wording. No duplicates; #24484's stacked follow-up is Pulsar-only.
- Added reproduction after review: boto3 store with ~1 KB cache and 5000-byte object — primary file streams and redirects; metadata-file and extra-file addressing raise `ObjectNotFound`, and `get_data_stream` rejects `extra_dir`.
- Display applications (`dataset/display_application`) also pull into the cache; noted as out of scope.
- Recommendation: post as follow-up. Status `blocked` on #24484.
