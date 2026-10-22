Toward 🎯 #23888 - YAML tools now load their inputs the way the tool models that validate them say they should: Boolean `value`, optionality, repeats and sections.

On 26.1, Galaxy validates a YAML tool against the `GalaxyTool`/`GalaxyUserTool` models, then loads it with a parser that speaks an older dialect. Definitions the models accept and document get silently misread or crash:

| Definition | `release_26.1` | This PR |
| --- | --- | --- |
| `{type: boolean, value: true}` | ❌ form unchecked, job runs with `false` | ✅ `true` |
| `{type: text}` / multi-select with no `optional`, on disk | ❌ optional on disk, required as an API user tool | ✅ required on every load path |
| optional Boolean with `value: null`, omitted from a request-format job | ❌ filled as `false` | ✅ `null` |
| `{type: repeat, parameters: [...]}` | ❌ HTTP 500 (`KeyError: 'blocks'`) | ✅ loads and runs |
| `{type: section, parameters: [...]}` | ❌ HTTP 500 (`Unknown Galaxy parameter type section`) | ✅ loads and runs |
| API user tool repeat (the model writes unset `min`/`max` as `null`) | ❌ HTTP 500 (`float(None)`) | ✅ unset |

The Boolean row is the headline: ***a user-defined tool cannot default a Boolean to true on 26.1***. `value: true` is ignored, and `checked: true` is rejected by the model.

***Only YAML tools that declare `class: GalaxyTool` or `class: GalaxyUserTool` change, and on disk they keep honoring legacy `checked:` and `blocks:`. XML tools and class-less YAML tools take the same code paths as before.*** The parameter-model dump over every XML tool in `test/functional/tools` is byte-identical. When both `value` and `checked` are set, `value` wins. `simple_constructs.yml` is unedited and still passes its framework test.

***This is the input-loading slice of #23888, not the whole issue.*** Scalar `GalaxyTool` outputs, unknown-field strictness on `GalaxyTool`, and converting in-tree fixtures off the legacy dialect are separate seams that the issue proposes as separate PRs.

<details><summary>What changes</summary>

- **Parsing** (`tool_util/parser/yaml.py`, `interface.py`). New `CanonicalYamlPageSource`/`CanonicalYamlInputSource` are used when `ToolSource.is_yaml_origin()` is true, meaning the class is `GalaxyTool` or `GalaxyUserTool`. Omitted `optional` and omitted Boolean `value` mean `False`, and an explicit `value` (including `false` and `null`) is used as written. `section` is a group type, and repeats and sections nest `parameters:`. Two new `InputSource` hooks, `parse_boolean_default` and `parse_text_optional`, keep XML's existing coercion and text-validator optionality inference in one place, and the runtime (`basic.py`) and parameter model (`factory.py`) both call them.
- **Request execution** (`tool_util/parameters/convert.py`, `tools/__init__.py`, `services/jobs.py`). `fill_static_defaults` and `strictify` take `yaml_origin`, so YAML tools fill an omitted Boolean with its declared default (`null` included). XML keeps `value or False`.
- **Runtime repeats** (`tools/__init__.py`). A `null` repeat `min`/`max` means unset, as it already did when the key was missing.
- **Legacy/21.01 user-tool jobs** (`tools/evaluation.py`). `__index__` and `__current_case__` no longer reach `$(inputs)`. This uses `boltons.iterutils.remap`, which already transforms the same tool state elsewhere. `$(inputs.group)` now renders `[{"count": 2, "flag": null}]` (the `gx_user_repeat` fixture) instead of carrying `__index__` on each element.

</details>

<details><summary>Test infrastructure changes (in their own leading commits)</summary>

***The fixture-scope change only affects test setup. A shared interactor's API key expired as soon as another module minted a new one.***

- **API interactor fixtures are function scoped** (`lib/galaxy_test/api/conftest.py`, documented in `writing_tests.md`). Creating an interactor mints a new API key for the test user and invalidates older ones. So any function-style module that sorted after a class-based one ran on an expired key and got HTTP 401 in CI. `test_tool_execute.py` only survived because its tests run contiguously.
- **`DescribeToolExecution` sends `use_cached_job` only when asked.** The form-encoded `"False"` was truthy, so legacy/21.01 test jobs ran with the job cache on.
- **`DescribeUserTool`** loads raw YAML/JSON authoring files, builds forms through the API and runs jobs through the existing `RequiredTool`/`DescribeToolExecution` chain, with `tool_uuid` support. It comes with a `user_tool` conftest fixture.

</details>

## Risks

This sets behavior for tool authors on a release branch, a one-way door. Existing `class: GalaxyTool` disk tools with a text or multi-select input that omits `optional` become required, and legacy/21.01 user tools stop seeing `__index__`/`__current_case__` in `$(inputs)`.

<details><summary>Risk Details</summary>

- A `GalaxyTool` disk YAML tool whose text or multi-select input omits `optional` was inferred optional (an XML-era rule) and is now required, matching what the same file already did as an API user tool. In-tree, the only one exposed is `simple_constructs.yml`'s multi-select `check_select`, which becomes required but has a `selected` option, so its framework test still passes.
- A `GalaxyTool`/`GalaxyUserTool` Boolean that sets `value: true` now defaults to true. Any tool that relied on the bug (setting `value: true` but expecting false) changes.
- A user tool that renders a whole repeat or conditional through `$(inputs.<group>)` loses the `__index__`/`__current_case__` keys. Element access is unchanged; `simple_constructs_y` still reads `$(inputs.more_files[0].nestinput['path'])`.
- An optional Boolean declared `value: null` and omitted from a request-format job now reaches the job as `null`, not `false`.
- `strictify` and `fill_static_defaults` gain a `yaml_origin=False` keyword. Existing callers keep XML behavior.

</details>

<details><summary>Risk Review Advice</summary>

The question for 26.1 is whether the disk-optionality change belongs there. It only makes disk `GalaxyTool` files behave as they already do once created through the API, but it can make a previously optional input required. If that's too much for a release branch, the Boolean and structural fixes don't depend on it, and the alt branch below shows the split points.

In the code, check `CanonicalYamlInputSource` and the `is_yaml_origin` predicate, because they decide which tools change. Also check the `yaml_origin` branch in `_fill_default_for`, the only request-path behavior change. The `remap` visitor in `evaluation.py` drops exactly two keys. It only descends into dicts and lists, so model objects such as HDAs pass through untouched.

</details>

## Context

Alternative kept on 🌿[`yaml_boolean_defaults_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/yaml_boolean_defaults_alt_original_scope): the Boolean and optionality slice only. Canonical `repeat`/`section` still fail there, pinned by 4 strict xfails. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as is, after one expansion to canonical <code>repeat</code>/<code>section</code> loading.</summary>

- The first pass recommended finishing #23888's model→loader slice: canonical repeats and sections, plus the YAML Boolean policy inside `strictify` sections. That was done, and the original scope is kept as the alt branch.
- The second pass recommended no further change. The legacy `to_cwl` path still leaks top-level runtime keys (`__input_ext`, `chromInfo`, …) into `$(inputs)` for legacy-format user tools. That is real but sits on a deprecated path, and removing the keys could break tools that read them.
- Decompositions considered: five PRs, one per step; two PRs along the alt split; three PRs with the test-infra fix pulled out; or one PR. Each fix commit is a red→green step over one shared contract suite, so one PR reads commit by commit.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Two behavior-neutral refactors sit ahead of the fixes, with the contract suite's results identical before and after them.</summary>

- `Add InputSource hooks for Boolean default and text optionality` and `Add YAML tool source predicate and child source factory methods`.
- Not extracted, because each one changes behavior: the `strictify` `yaml_origin` flag (unused below the request-fill fix), the canonical source overrides, the null repeat `min`/`max` handling (an error becomes a success), and the `remap` visitor.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every case fails at its own behavior assertion until the commit that owns it; base production fails 47 of 64.</summary>

- With the tip's tests on base production code: 47 failed, 11 passed, 6 skipped. The skipped cases are disk repeat/section tools, which can't load at base. Red drops commit by commit: 26 → 21 → 18 → 9 → 6 → 0.
- The cases that pass at base are the ones a commit doesn't change, such as API user tools' optionality, which was already canonical.
- Strengthened three positional `inputs[0]` lookups to also assert the input name. Moved the `use_cached_job` helper fix ahead of the baseline.
- There are no unit tests. Each contract crosses parsing, the `/build` form and job rendering under three input formats, so these are API tests.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers. A hand-rolled state traversal was replaced by <code>boltons.iterutils.remap</code>.</summary>

- Kept: the child-source factory methods on the YAML sources. `type(self)` would break `CwlInputSource`, whose constructor is incompatible.
- Kept: null-tolerant repeat `min`/`max` in shared `parse_input_elem`, a source-agnostic rule that's a no-op for XML. Also kept: `strictify(..., yaml_origin=False)`, which matches `fill_static_defaults`/`runtimeify`.
- Not shared with `meta.py`'s `_remove_internal_state_keys`, because that one mutates in place and runs on aliased batch state. Changing it on a release branch isn't safe.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex reported no correctness defects. One reuse finding (the traversal above) was confirmed and fixed.</summary>

It reviewed the full diff plus the surrounding loading and execution code, and ran 96 targeted conversion and YAML-model unit tests.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Invalid user tools still get a 400 (e.g. legacy `checked:` → "Extra inputs are not permitted"). What used to be a silent wrong default or optionality, or an HTTP 500 on `repeat`/`section`, now loads as the models define.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. There are no unit tests. The API contract tests assert `/build` forms and exact job JSON across 3 load paths × 3 input formats.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. Two test-infra commits come first, then `Baseline tests for user tool authoring contracts`, which passes on `release_26.1` (1 passed, 4 strict xfail).
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test coverage</summary>

- API: `lib/galaxy_test/api/test_user_tool_contract.py` has 64 cases. Each contract runs on a toolbox YAML tool, an API user tool created from YAML, and one created from JSON, under the legacy, 21.01 and request input formats. Fixtures are in `test/functional/tools/parameters/` (registered in `sample_tool_conf.xml`), with JSON twins in `lib/galaxy_test/base/data/user_tools/`.
- At the final code, before the clean rebase onto current `release_26.1`, these pass: the contract module plus `test_unprivileged_tools.py` (81), the framework tests `simple_constructs_y`, `gx_boolean_user*`, `gx_repeat*`, `gx_section*` and `configfile` (19), and the `tool_util` and `app/tools` unit tests (1711, excluding the environment-only cwl/conda/mulled/expression cases).
- Earlier in hardening, `test_tool_execute.py` (117) passed, as did unit `workflows`, before the last two tweaks to `evaluation.py` and `yaml.py`.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
