# pulsar-explicit-imports

Status: `merged`. [PR #23898](https://github.com/galaxyproject/galaxy/pull/23898) merged 2026-10-13; upstream head `20cff59a4ab5ed99aa91dbbe2644c2180544885a`.

[Implementation debrief](implementation_debrief.md) · [incremental review](../../../reviews/archived/23898/release-pin-review-2026-10-11.md)

[John’s branch](https://github.com/jmchilton/galaxy/tree/pulsar-explicit-imports) and [PR branch](https://github.com/mvdbeek/galaxy/tree/pulsar-explicit-imports) are at `d2a95eff002f6ca9cb4c7040303dceea64029438`.

The migration now uses published Pulsar 0.16.0 and has no temporary source-build settings. Merged current dev, resolving only the runner-test imports and preserving both parents’ tests. All 33 focused runner tests pass with the PyPI wheel. The PR is mergeable and fresh GitHub Actions checks are queued; no current-head CI result is claimed.

## TICK — 2026-10-12

Fork head `d2a95eff002f6ca9cb4c7040303dceea64029438` has green runner integration, unit, browser and Python lint workflows. [Package tests](https://github.com/jmchilton/galaxy/actions/runs/38179350393) fail both Python versions in new `test_real_client_manager_selects_coexecution_backend` K8s cases because `pykube` is absent in the package test environment. This exercises the branch’s added runner tests, so do not promote it as greenish. The fork release-script red is the unrelated legacy `master` version check. Live PR #23898 still belongs to `mvdbeek`, has the same head, and conflicts with dev. The automatic rebase push authorization is limited to `jmchilton`; no push to the PR owner’s fork was attempted.

Requested failed-job reruns for the recorded unrelated failures: [run 38179350276](https://github.com/jmchilton/galaxy/actions/runs/38179350276). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

[PR #23898](https://github.com/galaxyproject/galaxy/pull/23898) merged at 2026-10-13T15:44:59Z, upstream PR head `20cff59a4ab5ed99aa91dbbe2644c2180544885a`. Removed from the active queue and archived this record under merged. The jmchilton fork still has the earlier d2a95eff002f head; upstream merged mvdbeek’s later 20cff59a4ab5 head. No fork rewrite inferred. Worktree cleanup safety was checked; see the morning report.
