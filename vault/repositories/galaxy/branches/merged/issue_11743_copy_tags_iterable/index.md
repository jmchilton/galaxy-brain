# issue_11743_copy_tags_iterable

Status: `merged` (refreshed 2026-10-16).

Types copy_tags as an iterable and preserves nested element tags when copying collections (#11743).

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

John converted the PR to draft on 2026-10-08 without recording the reason. That decision remains unresolved; green CI alone does not settle it. PR CI (2026-10-09) red only on macOS startup (3.14), not yet diagnosed.

## TICK — 2026-10-11

Live #23973 is mergeable but still draft. Its macOS 3.14 red fails `Restore client cache`, key `galaxy-static-97c9356...`, before startup tests. Diagnosed unrelated and reran failed jobs in [run 37773026992](https://github.com/galaxyproject/galaxy/actions/runs/37773026992). John’s unexplained draft conversion remains a blocker independent of CI, so no undraft.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37773026992](https://github.com/galaxyproject/galaxy/actions/runs/37773026992). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 37773026992](https://github.com/galaxyproject/galaxy/actions/runs/37773026992). All requests accepted; reruns are pending, not passing coverage.

## TICK — 2026-10-13 evening

GitHub now reports OPEN, non-draft and mergeable at its unchanged head; this TICK did not change draft status. The sole failure remains the diagnosed macOS 3.14 client-cache restoration failure. Reclassified to `ready` and requested its failed-job rerun.

## TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 37773026992](https://github.com/galaxyproject/galaxy/actions/runs/37773026992). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.

## Morning refresh — 2026-10-16

GitHub confirms [#23973](https://github.com/galaxyproject/galaxy/pull/23973) merged at 2026-10-16T07:03:35Z, head `5bc71db5779fe3edbc4f5e07ecc802bb7afb9bce`. Removed from the active queue and archived this record under `merged/`. Clean worktree removed with ghwt after verifying pushed history.
