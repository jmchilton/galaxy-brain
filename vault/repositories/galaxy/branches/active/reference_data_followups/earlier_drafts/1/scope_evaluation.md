Run via Claude Opus 5.5 at low effort.

**Recommendation: expand modestly (Scope 2).** Generalize the reference_data-only parity test into a drift guard for every canonical YAML parameter type. Run it across the in-tree `GalaxyTool`/`GalaxyUserTool` fixtures × dump policies, and fix the one drift it finds. `YamlTextParameter.to_internal()` passes `default_value=self.value`, but `TextParameterModel.default_value` has `alias="value"` and no `populate_by_name`, so every text default is silently dropped (also inside conditional `whens`). Today this has no production impact, since only reference_data loads through `to_internal()`. Still, it's a real bug in a module this branch touches. It turns the branch's drift guard into the reusable #23888 slice-1 piece, and it has to be fixed before any other type can follow reference_data through `to_internal()`. Also fold in a wording fix to the two YAML-only guards: a class-less YAML tool is told "reference_data is only supported in YAML tools". Everything else raised stays out of this PR. Moving all types onto `to_internal()`, re-adding `filter` and dropping upstream tests are each either a separate #23888/feature PR or John's call.

Evaluated at `809d07fc8ad` against merge-base `a73355ea2e5` (#24798 merge on `origin/dev`). `dev` is the right target: reference_data is unreleased.

## Possible Decompositions

Size: +244/−41 across 15 files, none generated. About 80 lines are production code (`lib/galaxy` minus `galaxy_test`), and the rest are tests and two JSON fixtures. Commit order (from `baseline_refactor.md`): 4× Baseline tests → refactor (`6577ac25d71`) → XML guard (`a28d86a9f35`) → authoring-model loading (`809d07fc8ad`).

1. **One PR as is.** It is small enough to review in one pass.
2. **Two PRs.**
   - (a) The four Baseline tests commits plus the refactor commit: contract harness twins, closed-table and admin API tests, parity drift guard, `reference_data_runtime_json()` and `ToolDataTable.readable_by()`. All of it is behavior-preserving.
   - (b) The XML guard plus authoring-model loading, which hold every behavior change.
   - (b) depends on (a).
3. **Three PRs.** (a) the Baseline tests, (b) the refactor, (c) the fixes.
   - The `InputSource.parse_reference_data()` hook can't land ahead of the fixes, because on its own it would be unused infrastructure (`baseline_refactor.md`).
   - The XML guard and the authoring-model loading share that hook, so they stay together.

If Scope 2 is adopted, the parity generalization adds a Baseline test (every type except text) and a small fix commit (text red→green). Both fit decomposition 2's (a) and (b) respectively.

## Scope 1: As implemented

Ports the review's P2 1-3 and P3 1, 3, 4 (admin half) onto merged `dev`, adapted to upstream's `ReferenceDataParameterModel`. P3 2 and the filter halves are dropped because `filter` is gone. reference_data now validates through its authoring model on every load path.

| Pros | Cons |
|---|---|
| <ul><li>Covers every still-applicable round 0 finding</li><li>Baseline commits first and refactor split ahead of the fixes, so it's easy to decompose</li><li>`_canonical_input_source` gives #23888 a seam to extend</li></ul> | <ul><li>The parity guard covers only reference_data, while the model it trusts (`to_internal()`) silently drops text defaults today</li><li>reference_data becomes the only type strictly validated on disk, with no signal on how far the other types are from following</li><li>A misleading guard message stays in touched code</li></ul> |

## Scope 2: Generalized parity guard + text `to_internal()` fix (recommended)

Scope 1, plus:
- a parity test over all canonical in-tree fixtures (`test/functional/tools/**/*.yml` with `class:`, `lib/galaxy_test/base/data/user_tools/*.json`) × {full, `exclude_unset`, `exclude_none`}, asserting factory output == `to_internal()` per parameter;
- the one-word fix (`value=self.value`) in `YamlTextParameter.to_internal()`;
- rewording both guards to name the class requirement, e.g. "only supported in YAML tools that declare `class: GalaxyTool` or `GalaxyUserTool`".

| Pros | Cons |
|---|---|
| <ul><li>Fixes a real, verified bug in `yaml_parameters.py`</li><li>Delivers the review's drift-guard intent for every type, not just one: the #23888 slice-1 regression matrix</li><li>Clears the way for the next type to load through `to_internal()`</li><li>Small: a single-line fix plus one parametrized test; red→green is natural</li></ul> | <ul><li>Reaches past the review findings into another type</li><li>Fixtures miss some fields (integer min/max, select defaults are covered only by unit tests). The alias grep below covers that gap.</li><li>Two in-tree fixtures (`simple_constructs.yml`, `collection_creates_pair_y.yml`) fail the model on `dev`, so they're skipped until `yaml_tool_model_validation_26.1` converts them</li></ul> |

<details><summary>Evidence</summary>

I ran a scratch script (not committed) with the worktree `.venv` at `809d07fc8ad`. For each canonical fixture, it validated the fixture, dumped it under full and `exclude_unset`, ran `input_models_for_tool_source(YamlToolSource(dumped))`, and compared each parameter with `to_internal()`.

| Type | Equal | Differ |
|---|---|---|
| boolean | 15 | 0 |
| data | 8 | 0 |
| data_collection | 13 | 0 |
| float / integer | 2 / 2 | 0 |
| reference_data | 4 | 0 |
| repeat / section | 2 / 2 | 0 |
| select | 2 | 0 |
| **text** | 0 | **3** |
| **conditional** | 0 | **2** |

The counts are per policy, and both policies matched.

Every difference is `default_value`. `to_internal()` gives `None`, and the factory gives the authored `value`. Examples: `configfile_user_defined` `hello!`, `expect_failure_invalid_inputs_y` `1`, `gx_user_boolean_conditional` whens `true branch`/`false branch`. The conditional rows are the same text bug, one level down.

Root cause: `tool_util_models/parameters.py:389`, `default_value: str | None = Field(default=None, alias="value")`. `TextParameterModel` has no `populate_by_name`, so the `default_value=` kwarg from `yaml_parameters.py:279` is ignored. I grepped every `alias=` field on the internal parameter models against the kwargs the `to_internal()` methods pass. Text is the only case: the other aliases are either `validation_alias=AliasChoices(...)`, which accepts both names, or don't appear in a `to_internal()` call. No unit test asserts a text default through `to_internal()`. The conditional test at `test_yaml_parameters.py:310` declares `value: "hi"` and doesn't check it.

Guard message: `input_models_for_tool_source` on a class-less YAML tool that declares reference_data raises `ParameterDefinitionError: reference_data is only supported in YAML tools`.

</details>

## Scope 3: Load every canonical YAML type through its authoring model

The thermo-nuclear review's suggested follow-up: give each type, or one generic discriminator-keyed source, a model-backed input source behind `_canonical_input_source`, and have the factory return `to_internal()` for any canonical source.

| Pros | Cons |
|---|---|
| <ul><li>Closes the #23888 parser/model split for parameters, rather than for one type</li><li>Removes the "only reference_data" asymmetry the module docstring now records</li></ul> | <ul><li>Makes on-disk validation strict for every type: a large behavior change on `dev`</li><li>Blocked on Scope 2: done today, disk text inputs would lose their defaults</li><li>Overlaps `yaml_tool_model_validation_26.1` (BLOCKED, targets `release_26.1`), which validates whole `GalaxyTool` dicts at construction, so two validation mechanisms would coexist until reconciled</li><li>John's own P2 3 put this in #23888's follow-up, not this PR</li></ul> |

<details><summary>Details</summary>

Once `yaml_tool_model_validation_26.1` merges forward, `GalaxyTool` disk dicts are model-validated whole. The per-parameter validation here then matters mainly for `GalaxyUserTool` historical snapshots, which that branch deliberately leaves unvalidated, and for `to_internal()` as the interpreter. Both should be sequenced in a dedicated #23888 slice-2 PR after Scope 2's guard is in place. That PR's acceptance test is the Scope 2 parity matrix going all green with the factory short-circuited.

</details>

## Scope 4: Drop redundant upstream tests

Remove `test_run_with_reference_data`, which is now a subset of `test_reference_data_contract[api_yaml-*]`. Optionally also remove the unit tests `test_user_tool_is_offered_nothing_from_a_table_admins_have_not_opened` and `test_user_tool_cannot_submit_a_value_from_a_closed_table`, which the strengthened API test mostly duplicates (verified_review P2 2 details). Keep `TOOL_WITH_REFERENCE_DATA`, which the closed-table and admin API tests still use.

| Pros | Cons |
|---|---|
| <ul><li>Less duplicated API runtime and less maintenance</li><li>Finishes P2 1's "then redundant and could go"</li></ul> | <ul><li>Removes tests the upstream author wrote; normal review, test challenge and filtered_findings all left this to John/mvdbeek</li><li>The unit tests are faster and localize failures better than the API test</li></ul> |

Not recommended here. It's John's call, and an easy follow-up comment on the PR.

## Scope 5: Re-add `filter` (and P3 2's `from_input` validator, P3 4's filter API test)

Restore `filter: {from_input, on_metadata}` on `YamlReferenceDataParameter`/`ReferenceDataConfig`, with the tool-level validator and an API test.

| Pros | Cons |
|---|---|
| <ul><li>Recovers a useful feature (genome matched to the input's dbkey)</li><li>The `DataMetaFilter` deferred-column support for uninstalled tables already merged in #24798</li></ul> | <ul><li>New public schema and runtime contract: a one-way door (`risks.md`)</li><li>Upstream dropped it at merge without discussion on the PR, so the reason should be asked first</li><li>New feature, not a review follow-up</li></ul> |

Not recommended here. If wanted, it needs its own issue and PR. The merged `DataMetaFilter` change isn't dead without it: it is a backward-compatible fix for XML `data_meta` filters on tables not configured on the instance, and `test_data_table_select_options.py` covers it.

## Considered and folded or dismissed

- **Split the refactor into its own PR.** That's a decomposition, not a scope. See above.
- **Normal review's deferred nits** (rename `trusted`, narrow the `reference_data_runtime_json` return type) and **thermo's no-action items** (duplicated guard across layers, `table_name` duplicating `options.tool_data_table_name`, parity-test `if/else`): these are code quality, not scope.
- **Retarget to `release_26.1`.** No: reference_data exists only on `dev`.
- **galaxy-brain research note updates** (`learning_galaxy_followup_issue.md`). These are vault work, outside the branch.
