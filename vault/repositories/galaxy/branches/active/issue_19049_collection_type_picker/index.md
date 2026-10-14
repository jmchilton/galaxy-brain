# issue_19049_collection_type_picker

Status: `author_work`. Base: `dev`. Draft [PR #24055](https://github.com/galaxyproject/galaxy/pull/24055), head `d37a9e903038064bbc1ed9eb2830ef013150a48d`.

Adds a select-or-text field for workflow collection types and Tool Shed targets.

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md) · [Registry sync breakdown](registry_sync_breakdown.md)

## TICK — 2026-10-12

All 60 upstream checks settled; client and browser checks passed. The only two failures are package-test collection importing removed `pulsar.client.build_client_manager`, outside this client/selector change. [Package run](https://github.com/galaxyproject/galaxy/actions/runs/38179027765). This is greenish and mergeable. Reclassified to draft-ready; preserve John’s draft request before final read-through and the recorded UX/scope questions. The published human-read item is checked, but the record does not say those remaining decisions are resolved; no undraft inferred.

Requested failed-job reruns for the recorded unrelated failures: [run 38179027765](https://github.com/galaxyproject/galaxy/actions/runs/38179027765). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## TICK — 2026-10-14

Current head 18cb34074127 is mergeable but Playwright run 38439282446 fails test_collection_workbook_template_is_typed waiting for [data-which-builder="list:paired"]. This intersects collection type/workbook behavior and has not been diagnosed as unrelated. Moved to author_work; preserve draft/final-read-through instructions. No implementation fix inferred.
