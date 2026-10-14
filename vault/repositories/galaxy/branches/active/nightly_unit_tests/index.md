# nightly_unit_tests

Status: `branches_need_polish`. Base: `dev`. Pushed to `jmchilton/nightly_unit_tests`.

Rebalances dev PR CI and adds tracked nightly unit, Tool Shed and framework coverage for dev and release_26.0/26.1/26.2. Each branch has one configurable Python version (initially 3.10). Existing release PR matrices remain unchanged; reducing them needs a separate policy backport. Performance tests leave CI.

[Release nightly extension](release_nightlies_debrief.md) · [Extension checklist](release_nightlies_checklist.md) · [Description backup](pr_description_before_release_nightlies.md)

[PR description](pr_description.md) · [Title choices](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Polish checklist](polish_checklist.md) · [Description strengthening](polish_strengthening.md)

[Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Rename review](subagents/rename_review.md) · [Tool Shed review](subagents/toolshed_review.md) · [Tool framework + performance review](subagents/framework_tools_review.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Reporter harness](report_harness.mjs)

## Origin — 2026-10-14

From a chat with Marius about CI speed: drop one per-PR unit Python version (about 30 min) and run every version nightly with tracking issues, as the weekly Selenium run does ([#24014](https://github.com/galaxyproject/galaxy/pull/24014)).

## Decisions

- **Keep 3.14 per-PR, not 3.10** (John, 2026-10-14). 3.10 is the slower job (about 30 min vs about 22), so this shortens PR wall-clock time. Too-new code is caught statically on 3.10: ruff 0.17.0 flags too-new syntax, and mypy on 3.10 in the lint matrix flags too-new stdlib attributes (both checked with probe files). Gap: a whole new stdlib module (`import tomllib`) passes mypy because of `ignore_missing_imports = True`. The 3.10 runtime suites (API/integration/etc.) and the nightly cover it.
- Release branches keep 3.10 + 3.14 (`f18cff94279`), because schedules only fire on `dev`. `758d072b3da` briefly ran all five versions there; reverted to avoid a 10-job Tool Shed matrix per release PR.
- First upstream PR run: confirm "Unit tests" on the fork PR doesn't hit `startup_failure`; see the [normal review](subagents/normal_review.md) #2.
- Reporter extracted into a reusable workflow. This is the second consumer the #24014 debrief named as the trigger.

## Changes — 2026-10-14

- John: prefix reusable workflows with `_`, including `build_client.yaml` (`d449d938617`, `a97ecd968ad`).
- John: apply the same split to the Tool Shed tests (`7d8dad4d980`). Review fixes are in `f18cff94279`.
- John: drop the performance workflow (`ff639dd464b`). Tool framework: keep `never` (tool request API) per-PR, and move `always` (legacy API) to a daily run (`e0573f6bf2a`, review fixes in `694f69c4eab`).

## Polish — 2026-10-14

Final head `b2a792c206ded6040be900adef9b4b52f3819719` is pushed. No rebase was needed against current dev. Fixed three inaccurate nightly issue descriptions, completed the independent checklist and one strengthening round, and prepared the description/four titles. Human read-through remains unchecked. Final-head zizmor is green; unit, Tool Shed and framework CI remain in progress with no reported failures. See the [polish debrief](polish_debrief.md) for evidence and remaining upstream verification. No PR opened; approval remains unassigned.

## Release nightly extension — 2026-10-14

John requested release26.0/26.1/26.2 plus dev, one nightly Python per branch, and selected3.10 for all four. Implemented in one reversible commit `a13b016c0ff` on top of `b2a792c206d`; pushed to the fork. Nightly infrastructure runs from dev without release backports. Existing release PR checks retain their matrices; no release policy backport was made. Independent final checklist passed, CI is queued/pending, and the description backup preserves John's prior human-read mark. Rewrite/strengthening in progress; new tests/comments require a fresh human read.
