# Thermo-nuclear review — yaml_boolean_defaults (second pass)

Reviewed `6df388987b4..975b9157f50` (base `origin/release_26.1`). This pass was done fresh and concentrated on the re-scope additions, which the first pass never saw. First-pass findings are in `earlier_drafts/1/thermo_nuclear_review.md`.

**Acted on 1 finding:** the confirmed Codex reuse finding. The branch's bespoke recursive `_strip_group_state_keys` traversal in `lib/galaxy/tools/evaluation.py` is replaced by `boltons.iterutils.remap`, the canonical tool-state transformer, with a one-line visit predicate over `_GROUP_STATE_KEYS`. `remap` already runs over the same legacy state shapes in `galaxy/tools/parameters/__init__.py` (`update_dataset_ids`, `_runtime_values_to_json`) and in `tools/execute.py`. After this change the branch adds no traversal of its own.

The change was folded into its owning commits by editing each one during the rebase:
- `6029ff27032` (was `87006435b1d`) uses the single-key `__index__` predicate.
- `58f9664c617` (was `975b9157f50`) widens it to `__index__`/`__current_case__`.

The structure is unchanged at 11 commits. New tip `58f9664c617` needs a force-push. The baseline commit is untouched.

**Production behavior: unchanged.** `remap` keeps the old helper's copy semantics. It rebuilds containers, shares leaves and never mutates `incoming`. It has two theoretical differences:
- It rebuilds Mapping/Sequence subclasses as their own class instead of as plain dicts.
- It descends into tuples and sets.

Neither occurs in legacy `params_from_strings` state, which holds plain dicts and lists with model-object leaves. Model objects are not `Mapping`/`Sequence` subclasses, so `remap` treats them as leaves. List items carry int keys, which the predicate always keeps. `__class__`, `__input_ext` and other `__` runtime keys survive exactly as before.

## Not acted on

- **Sharing a traversal with `_remove_internal_state_keys` in `tools/parameters/meta.py`.**
  - One traversal can have only one mutation semantics. Meta's in-place strip is base behavior on a release branch. It also cleans batch `values` lists that `classifier_from_value` aliases into `matched_multi_inputs`/`multiplied_multi_inputs` before `to_decoded_json` and `extra='forbid'` validation, so moving it to copy semantics could change behavior. `test_tool_execute.py` would not reliably catch that change.
  - A unit test (`test/unit/app/tools/test_parameter_parsing.py`) imports the private name.
  - Moving the evaluation path to in-place mutation instead would make `build_param_dict` mutate its argument. That is unobservable today, because only YAML tools reach `UserToolEvaluator` and they have no code hooks, but it is fragile.
  - Reusing `remap` removes the duplication without either risk. meta.py is byte-identical to the base.
  - Follow-up idea, not this branch: move meta to `remap` once that aliasing has been checked.
- **Four `_page_source`/`_input_source` factory methods across plain and canonical YAML sources.** Collapsing them to `type(self)` would break `CwlInputSource(YamlInputSource)`, whose constructor is incompatible and which today builds nested children as plain `YamlInputSource`. Passing a class parameter into the page constructor saves a few lines and costs a new constructor argument. Kept.
- **Null-tolerant repeat `min`/`max` in `Tool.parse_input_elem`.** The coercion is source-agnostic ("null means unset"), not a YAML branch. For XML, `get("min")` returns None only when the attribute is absent, which is exactly the old default path. Moving it behind a new `InputSource` hook would add an API for two lines.
- **`strictify(..., yaml_origin=False)` public flag.** It matches the existing convention on `fill_static_defaults` and `runtimeify`. The private recursive helpers already require it with no default.
- **Carried over from pass 1:** the `parse_boolean_default(allow_none=)` flag, needed to keep XML's two coercions; the `parse_text_optional` hook; the `loaded_tool`/`user_tool` overlap; and the model-vs-dict branch in `_unprivileged_tool_request`. The reasons are unchanged.
- **File size.** No file crosses 1k lines because of the branch. `populators.py` and `tools/__init__.py` were already far over.

## Validation

- `test_user_tool_contract.py` at the tip: 64 passed.
- With `evaluation.py` checked out at `6029ff27032` (single-key predicate), the repeat and section cases gave 18 passed.
- Unit `test/unit/tool_util`, `test/unit/app/tools`, `test/unit/workflows`: 2039 passed, 6 skipped, 2 xpassed. The 38 failures are the known environment ones: cwl ×27, conda ×4, mulled ×6, watcher ×1.
- The meta.py request-format API tests were not run, because meta.py was not touched.
- ruff 0.15.13, black, isort, and commit hooks pass. mypy from `lib/` shows no errors in `galaxy/tools/evaluation.py`; the 24 unrelated errors are pre-existing.
- `git diff 975b9157f50 HEAD` touches only `lib/galaxy/tools/evaluation.py` (+5/−8). Parsing is untouched, so no model dump was needed.

<details>
<summary>Full review</summary>

**1. Copy-pasted traversal (Codex P3, confirmed).** `_strip_group_state_keys` hand-rolled a dict/list recursion. That is the same shape as meta's `_remove_internal_state_keys`, and the codebase already has a canonical tool-state transformer, `boltons.iterutils.remap`, imported by the module that injects these keys (`visit_input_values`). Remedy: reuse the canonical helper and delete the bespoke recursion. **Done.**

**2. Factory-method quartet on YAML sources.** `YamlPageSource._input_source`, `YamlInputSource._page_source`/`_input_source`, and the canonical overrides of each. It looks like ceremony, but each override is the polymorphic seam that replaced pass 1's `canonical_defaults` flag, and `type(self)` is unsafe because of `CwlInputSource`. **Skipped.**

**3. Repeat `min`/`max` null handling in shared `parse_input_elem`.** Not a feature check: null-as-unset is a general, XML-neutral rule. **Skipped.**

**4. `strictify` flag.** Consistent with sibling APIs, and recursion requires it explicitly. **Skipped.**

**5. Test infrastructure (`populators.py`, `conftest.py`, contract module).** Raw/convenience pairs share one `_unprivileged_tool_request`. `DescribeUserTool` composes `RequiredTool` instead of duplicating execution. The contract module makes no raw HTTP calls. No structural issues.

**6. File size / orchestration.** No threshold crossings. No new sequencing or partial-update concerns.

</details>
