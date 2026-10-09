# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- [#23972](https://github.com/galaxyproject/galaxy/pull/23972) — branch `issue_18750_s3fs_bucket_prefix` — Description: s3fs file source strips `s3://`/`s3a://` and surrounding slashes from the bucket so browsed entries import (fixes #18750); blockers: needs review (opened 2026-10-08 at approved `82d3a2800ef`, greenish: fork API/Unit green; reds unrelated: packages social-auth `AuthMissingParameter`, Integration `TestDefaultSingularityContainerResolvers` (network-bound); cache-evicted E2E/startup don't exercise s3fs; PR CI red only on Integration Singularity resolver tests (network-bound, unrelated)). [Description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md).
