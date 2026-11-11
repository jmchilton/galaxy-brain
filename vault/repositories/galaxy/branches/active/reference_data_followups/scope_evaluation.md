Run via Claude Opus 5.5 at low (reasoning_effort=15) effort.

**Recommendation: no further scope change. Keep the branch as implemented after the re-scope (Scope 1).** The first evaluation's expansion is in and verified: the fixture-wide parity guard over all 11 v1 types, the text-default fix and the guard wording. Every idea left over from the debriefs is either on a different target branch, outside the code this branch touches, or a codebase-wide change. None of them is a modest extension of this work. The strongest candidate is `exclude_none` erasing explicit `value: null`, and it is a real bug. It lives in `custom_tool.py:758` and `lint.py:349`, which this branch doesn't touch, and it exists unchanged on `release_26.1` (`custom_tool.py:760`, `lint.py:347`). Galaxy policy sends that fix to its own `release_26.1` PR, and folding it into this `dev` branch would put it on the wrong target. Do it as a separate follow-up: the two-line fix from normal review 2, plus a round-trip test. Once it lands, the only real storage dumps are the full dump (user tools) and `exclude_unset` (admin), and the parity test already covers both. The latent factory vs `to_internal()` mismatches all predate this branch and have no runtime path today. Required text with no value needs `model_fields_set` work. The factory drops the `no_options` validator on purpose. `area` feeds only the `gx_area` schema extra, which nothing consumes, and that gap is also on 26.1. So they are #23888 follow-ups. `extra="forbid"` and mypy `init_forbid_extra` are codebase-wide follow-ups. Moving every type to `to_internal()`, dropping `test_run_with_reference_data` and splitting out the text fix stay John's call, as the first evaluation found.

Evaluated at `05f155c5e78` (8 commits) against merge-base `a73355ea2e5` (the #24798 merge on `origin/dev`). Target stays `dev`, because reference_data exists only there. The text bug is also on 26.1 (`yaml_parameters.py:284`), but 26.1 has no production `to_internal()` caller (`git grep` finds none outside `tool_util_models`), so it has no user impact there and needs no backport.

## Possible Decompositions

Size: +301/−50 across 16 files, none generated. About 69/−36 is production code (`lib/galaxy` minus `galaxy_test`); the rest is tests and two JSON fixtures. Current order (`baseline_refactor.md`): 4× Baseline tests → refactor `f6723040770` → XML guard `901be64fe60` → authoring-model loading `9d4560807d4` → text fix `05f155c5e78`.

1. **One PR as is.** Small enough to review in one pass.
2. **Two PRs: behavior-preserving, then behavior changes.**
   - (a) The 4 Baseline tests commits plus the refactor (contract-harness twins, closed-table and admin API tests, reference_data parity guard, `reference_data_runtime_json()`, `ToolDataTable.readable_by()`).
   - (b) The XML guard, authoring-model loading and text fix.
   - (b) depends on (a).
3. **Two PRs: text fix first.**
   - (a) `05f155c5e78` alone, reordered ahead of `901be64fe60`: the one-token `YamlTextParameter.to_internal()` fix plus the fixture-wide parity test. It doesn't depend on the reference_data commits.
   - (b) Everything else, rebased on (a).
   - `baseline_refactor.md` did not verify that the parity test is green at that point in the history. Check it before choosing this option.
4. **Three PRs.** (a) the Baseline tests, (b) the refactor, (c) the three fix commits.
   - The XML guard and the authoring-model loading share the `parse_reference_data()` hook, which would be unused on its own, so they stay together.
   - The text fix could ride in (c) or go ahead as in option 3.

## Scope 1: As implemented after the re-scope (recommended)

Ports the still-applicable #24798 round 0 findings (P2 1-3, P3 1, 3, and the admin half of P3 4), adapted to upstream's `ReferenceDataParameterModel`. It adds the first evaluation's expansion: a parity drift guard over every functional YAML fixture × class × {full, `exclude_unset`} (130 cases, all 11 v1 types), the text-default fix it caught, and guard wording that names GalaxyTool/GalaxyUserTool.

| Pros | Cons |
|---|---|
| <ul><li>Covers every still-applicable review finding plus the one real `to_internal()` bug</li><li>The parity guard is the reusable #23888 slice-1 regression matrix</li><li>Baseline tests first and refactor split out, so it's easy to decompose</li><li>Every review pass (normal 2, Codex, thermo-nuclear, test challenge) came back ready with no bugs</li></ul> | <ul><li>Its own parity test leaves out `exclude_none` because of a bug outside the branch, which needs a follow-up</li><li>Three latent factory vs `to_internal()` mismatches stay unguarded, because no fixture exercises them</li><li>reference_data is still the only type strictly validated on disk</li></ul> |

## Scope 2: Fold in the `exclude_none` fix

Drop `exclude_none=True` from `CustomToolAgent._render_tool_yaml` (`custom_tool.py:758`) and from `lint_user_tool_source` (`lint.py:349`), fix the docstring, and add `exclude_none` (or the agent's `exclude_defaults` render) back into the parity and round-trip tests.

| Pros | Cons |
|---|---|
| <ul><li>Real user-visible bug: an agent-written optional boolean with `value: null` is saved as default `False`</li><li>Two-line fix, verified by normal review 2 (all fixtures round-trip with `exclude_defaults` alone)</li><li>Same dump-policy family (#23888 matrix) the parity test guards</li></ul> | <ul><li>Present unchanged on `release_26.1`, so policy says to fix it there, not in a `dev` branch</li><li>Not in any file this branch touches; it is agent and lint code</li><li>Recommending it on this second evaluation parks the branch for no gain over a separate PR</li></ul> |

Not recommended here. Do it as its own `release_26.1` PR.

<details><summary>Details</summary>

Once the fix lands, the full dump (user-tool storage, `managers/tools.py:218`) and `exclude_unset` (admin `GalaxyTool`, `:156`) are the only dumps that reach the factory, so the parity test's exclusion of `exclude_none` becomes correct coverage rather than a gap. The `exclude_none` case in the Baseline `test_reference_data_loads_like_its_authoring_model` is labelled as lint's dump, so that label goes stale after the fix. The follow-up can retarget or drop that case when it merges forward. It is a nit and doesn't block this branch. Normal review 2 also found that the `exclude_defaults` render drops validator `type` and empty whens `parameters: []`, so the factory can't parse that dict directly. That is harmless because the save path re-validates. The follow-up should include it in its round-trip test.

</details>

## Scope 3: Fix the latent factory vs `to_internal()` mismatches

These are the three mismatches normal review 2 swept up:
- (a) the factory doesn't pass `area` for text (`factory.py:146`);
- (b) required text with no `value`: the factory gives `""`, `to_internal()` gives `None`;
- (c) the factory drops `no_options` on an optional select, while `to_internal()` keeps it.

Fix each one, and add fixtures so the parity test covers them.

| Pros | Cons |
|---|---|
| <ul><li>`factory.py` and `yaml_parameters.py` are touched code</li><li>Widens the drift guard toward what #23888 slice 2 needs</li><li>(a) is a one-liner</li></ul> | <ul><li>No runtime path reaches any of them: the only production `to_internal()` caller is the reference_data branch (`factory.py:281`)</li><li>(a) feeds only the `gx_area` JSON-schema extra (`parameters.py:396`), with no client or lib consumer, and it is also missing on 26.1</li><li>(b) needs a semantic decision and `model_fields_set` work, because the authoring model can't tell an omitted value from `value: null`</li><li>(c) is intentional in the factory (`test_select_optional_null_by_default`); "fixing" it means changing `to_internal()` to copy factory policy</li></ul> |

Not recommended here. These are #23888 slice-2 prerequisites. They should land with the PR that first routes text and select through `to_internal()`, and that PR's acceptance test should be the parity matrix extended with these fixtures.

## Scope 4: `extra="forbid"` on `ToolSourceBaseModel` (or mypy `init_forbid_extra`)

This is the structural guard against the bug class behind the text fix: unknown kwargs silently ignored on the internal models. One option is to forbid extras at runtime on the base model, or narrowly add `populate_by_name=True` to `TextParameterModel`. The other is to turn on `[pydantic-mypy] init_forbid_extra = True` so mypy catches it statically.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the root cause rather than the instance</li><li>The mypy flag costs nothing at runtime</li></ul> | <ul><li>Every request and runtime model inherits `ToolSourceBaseModel`, so runtime `forbid` would change validation of stored or posted dicts codebase-wide</li><li>The mypy flag is Galaxy-wide and its error count is unknown</li><li>Thermo-nuclear found no other bare `alias=` on definition models, so it would catch nothing today</li><li>`populate_by_name` is redundant now that the call passes `value=`</li></ul> |

Not recommended here. Make it a separate infrastructure PR. Try the mypy flag first, since it is the cheaper experiment.

## Scope 5: Load every canonical YAML type through its authoring model (#23888)

Give each type a model-backed input source behind `_canonical_input_source`, and have the factory return `to_internal()` for every canonical source.

| Pros | Cons |
|---|---|
| <ul><li>Closes the #23888 parser/model split</li><li>Ends reference_data's one-type asymmetry</li></ul> | <ul><li>Makes on-disk validation strict for every type, a large behavior change</li><li>Needs Scope 3 first</li><li>Overlaps `yaml_tool_model_validation_26.1` (BLOCKED), so two validation mechanisms would coexist</li><li>John's P2 3 put this in #23888's follow-up</li></ul> |

Not recommended. Unchanged from the first evaluation.

## Scope 6: Drop redundant upstream tests

Remove `test_run_with_reference_data`, which is a subset of `test_reference_data_contract[api_yaml-*]`. Optionally also remove the two upstream unit tests that the strengthened closed-table API test duplicates.

| Pros | Cons |
|---|---|
| <ul><li>Less API runtime</li><li>Finishes P2 1's "then redundant"</li></ul> | <ul><li>Removes tests the upstream author wrote; every review pass left this to John/mvdbeek</li><li>The unit tests localize failures better</li></ul> |

Not recommended here. Raise it as a PR comment.

## Scope 7: Contract back to the original scope (alt branch)

Ship `reference_data_followups_alt_original_scope` (`809d07fc8ad`): the review port only, without the fixture parity test or text fix.

| Pros | Cons |
|---|---|
| <ul><li>Stays strictly within the review findings</li></ul> | <ul><li>Leaves the verified text bug in a module the branch touches</li><li>The reference_data-only guard would trust a `to_internal()` that drops text defaults</li><li>The re-scope cost is already paid and reviewed</li></ul> |

Not recommended. If John wants the review port alone, decomposition option 3 gets the same separation without dropping the fix.

## Considered and folded or dismissed

- **Split the text fix into its own PR.** That is a decomposition, not a scope; see option 3 above.
- **Re-add `filter`** (P3 2, filter halves of P2 3 / P3 4). It would be a new public schema that upstream dropped at merge. It needs its own issue, as the first evaluation found.
- **Classless twin for the `basic.py` guard** (normal review 2 nit). Galaxy refuses class-less YAML tools before it builds parameters, and the test challenge added a classless Tool-load case.
- **`.yml`-only fixtures skipped by the old glob.** This is moot: the test challenge moved the parity test to the functional YAML fixtures.
- **`_common_param_kwargs` / `_common_internal_kwargs` near-duplicates.** Code quality, and both predate the branch. They would collapse under Scope 5.
