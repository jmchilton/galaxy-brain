# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `issue_23978_parameter_tools_xsd` (`2bd2d9cf1b4`, stacked on `issue_18642_framework_tool_coverage` at `f66d1f0f97d`) — Description: Makes all `parameters/` framework test tools XSD-valid (`ext=` → dropped/`format=`, section/repeat titles, `rules` in XSD enum) and validates them in `.ci/validate_test_tools.sh` (also fixes its XSD lint path); 5 tools now really restrict input formats; fixes #23978; blockers: parent PR opens first; fork CI on `2bd2d9cf1b4` (CircleCI `validate_test_tools` is the key job); recovered 2026-10-08 (Codex clean, scope unchanged); [implementation debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23978_parameter_tools_xsd?expand=1).

## Pre-polish status history (archived 2026-10-17)

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
