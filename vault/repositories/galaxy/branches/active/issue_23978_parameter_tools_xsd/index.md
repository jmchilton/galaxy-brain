# issue_23978_parameter_tools_xsd

Status: `branches_implemented_needs_ci`. Base: `dev`.

Makes framework test tools XSD-valid and checks every test-tool subdirectory in CI (#23978).

[Implementation](implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Tracking history](tracking_history.md)

The parent PR opens first; preserve the recorded parent dependency when opening this branch.

## TICK — 2026-10-11

Current head has green tool/workflow framework, API, lint, Selenium and integration-Selenium checks; Playwright workflow runtime-parameter timeout and social-core package failure remain. The recorded key coverage is CircleCI `validate_test_tools`; no successful current-head status for that check was found, so retain needs CI rather than claiming XML validation ran.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37879977381](https://github.com/jmchilton/galaxy/actions/runs/37879977381). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 37879977381](https://github.com/jmchilton/galaxy/actions/runs/37879977381). All requests accepted; reruns are pending, not passing coverage.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 37879977381](https://github.com/jmchilton/galaxy/actions/runs/37879977381). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.

## TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 37879977381](https://github.com/jmchilton/galaxy/actions/runs/37879977381). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.

## Morning refresh — 2026-10-16

Requested failed-job reruns for diagnosed unrelated failures: [run 37879977381](https://github.com/jmchilton/galaxy/actions/runs/37879977381). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Re-harden — 2026-10-16

Re-hardened with one re-scope: CI now XSD-validates every test-tool subdirectory (`*/*.xml`, 431 tools), not just `parameters/`. Original scope kept as `issue_23978_parameter_tools_xsd_alt_original_scope` (`ab7999ce965`, ancestor of HEAD). History restructured (pre-existing CI-script fixes first). New head `04034197ef7`, force-pushed; earlier CI runs and reruns above are for the old head and no longer apply. READY; needs CI on the new head (CircleCI `validate_test_tools` is the key job). Earlier debriefs in `earlier_drafts/1/` (recovery) and `earlier_drafts/2/` (round 1).
