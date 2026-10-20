# yaml_boolean_defaults

Status: `branches_implemented`.

Honors explicit YAML Boolean defaults with user-tool API contract coverage (#23888).

[Initial implementation](initial_implementation_debrief.md) · [Tracking history](tracking_history.md)

## Hardening — 2026-10-20

Rebased onto `origin/release_26.1` (`6df388987b4`); old tip `01027324b35`. Only conflict vs release_26.1: `tool_request_raw` kwargs in `populators.py` (kept both `preferred_object_store_id` and `tool_uuid`). The 5-path conflicts in the notes below were measured against `dev`, not the branch's target.

Hardened tip `9894e813cc1` (pushed): fixture fix → Baseline tests → 2 refactor commits → 3 fix commits. Contract suite 46 passed / 4 strict xfail. Debriefs: [test challenges](test_challenges_debrief.md) · [codex](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope](scope_evaluation.md).

**Awaiting John:** scope evaluation recommends modest expansion (canonical YAML `repeat`/`section` loading → turn 4 structural xfails green; `yaml_origin` into `strictify` section branch). Hardening paused before re-scope; no final `implementation_debrief.md` yet. `MY_BRANCHES.md` compare link still says `dev...` — should be `release_26.1...`.

## TICK — 2026-10-12

Current fork tip `01027324b35b860fd2136d1baf442a882c3a80f6` conflicts with dev in `lib/galaxy/tool_util/parameters/convert.py`, `lib/galaxy/tool_util/parser/interface.py`, `lib/galaxy/tool_util/parser/util.py`, `lib/galaxy/tools/__init__.py`, `lib/galaxy_test/base/populators.py`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

## GOOD_MORNING — 2026-10-13

Current fork head `01027324b35b860fd2136d1baf442a882c3a80f6` conflicts with `origin/dev` in 5 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `lib/galaxy/tool_util/parameters/convert.py` · `lib/galaxy/tool_util/parser/interface.py` · `lib/galaxy/tool_util/parser/util.py` · `lib/galaxy/tools/__init__.py` · `lib/galaxy_test/base/populators.py`

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `01027324b35b860fd2136d1baf442a882c3a80f6` found overlapping changes in 5 paths (`lib/galaxy/tool_util/parameters/convert.py`, `lib/galaxy/tool_util/parser/interface.py`, `lib/galaxy/tool_util/parser/util.py`, `lib/galaxy/tools/__init__.py`, `lib/galaxy_test/base/populators.py`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
