---
upstream_base_branch: release_26.2
pr: 24555
---
# issue_3899_pulsar_container_deps

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_3899_pulsar_container_deps?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_3899_pulsar_container_deps)

## Status

Status: `branches_ready_for_final_review`. Polished 2026-10-28: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](pr_checklist.md) · [polish debrief](polish_debrief.md). Retargeted 2026-10-28 from `dev` to `release_26.2` (clean rebase, head `d9a8abb4ca9`, 42 runner unit tests pass).

Draft PR [#24555](https://github.com/galaxyproject/galaxy/pull/24555) opened 2026-10-28 at `d9a8abb4ca9` (title 1, human review at that SHA); upstream CI queued, undraft when green.

Respects a Pulsar container job’s dependency-resolution opt-in (#3899).

[Implementation](implementation_debrief.md) · [test challenges](test_challenges_debrief.md) · [codex](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope](scope_evaluation.md) · [earlier drafts](earlier_drafts/1/implementation_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live fork head `9bf9056b1cce4ed3b96f8af74913a92d7aaadc80`: Integration [run 37616684134](https://github.com/jmchilton/galaxy/actions/runs/37616684134) passed both `TestEmbeddedDockerPulsarRemoteDependencyResolution` host and container cases. Unit/tool/workflow framework and Python lint pass. API’s sole red is the unrelated workflow purged-input output-state assertion (`error` vs `paused`), also seen on the retry-only branch. Packages fail removed social_core AuthMissingParameter import, and browser/startup runs miss the client cache before tests. Relevant new Docker coverage is executed and green, so promoted to implemented; failed API/cache jobs were rerun.

## TICK — 2026-10-12

Resolved only the runner-test import block, combining upstream’s metrics/runner imports with this branch’s effective_dependency_resolution import. All **32 runner unit cases pass**. Tests use the existing Python 3.13 environment plus the exact dev-pinned `pulsar-galaxy-lib==0.15.16` wheel in a temporary PYTHONPATH directory; no existing environment was changed. Initial runs in the bare environment lacked Pulsar and stopped during collection; supplying the exact wheel resolved setup. Changed Python parses and whitespace checks pass. Moved from implemented/green back to needs CI for this new head; previous head’s green Docker regression is retained as historical evidence, not claimed for the rebased SHA. Rebased onto dev `2671a6d5d63ca13ad554ac68cfd6739d4a881780` and force-pushed with the exact old-head lease to `jmchilton:issue_3899_pulsar_container_deps` at `a1f1b0862805c80637fb3608f887696bbf0a7ac3`. Fresh CI is pending. The rebase had a conflict, so any previous SHA approval cannot carry; no PR opened or final-review approval inferred.

## GOOD_MORNING — 2026-10-13

Rebased onto actual dev `b23da2fc8f0943d51b2cb191148464aa2297de43`. Resolved only the runner-test import block, retaining upstream build_client_manager and the branch’s effective_dependency_resolution imports. All **42 runner unit tests pass** using the existing Python 3.13 environment and released Pulsar 0.16.0 in a temporary PYTHONPATH. Whitespace checks pass. Force-pushed only to jmchilton with exact old-SHA lease `a1f1b0862805c80637fb3608f887696bbf0a7ac3`, new head `05e0c26b297a743b69ff14401ab9a535cd11e858`. Fresh CI pending; old green results do not attest this head. Conflict resolution invalidates any old approval; no PR opened.

## TICK — 2026-10-13 evening

Current fork head `05e0c26b297a743b69ff14401ab9a535cd11e858` has passing Integration, including both `test_host_job_resolves_dependencies_in_pulsar` and `test_container_job_skips_dependency_resolution_in_pulsar` in [run 38430289612](https://github.com/jmchilton/galaxy/actions/runs/38430289612). The sole red is release-script run 38430289239, which compares the old fork master version (`VERSION_MINOR = None`) against the expected release value; unrelated to dependency resolution. Promoted to `branches_implemented`; failed release-script jobs were rerun. No PR approval or publication inferred.

## Re-harden — 2026-10-28

Re-hardened READY, scope keep. Baseline refactor commit split out ahead of fix; tree identical to `05e0c26b297`. New head `1b94de12b96` pushed to jmchilton; fresh CI pending. Moved to `branches_implemented_needs_ci`. See [debrief](implementation_debrief.md).
