# Thermo-nuclear review — yaml_boolean_defaults

Reviewed `6df388987b4..f3a6eb7a05f` (base `origin/release_26.1`). Acted on 4 findings:
- unified the two "YAML tool" predicates
- replaced the `canonical_defaults` flag with canonical source subclasses
- made `yaml_origin` required on the private fill helpers
- small test-helper tightening

Each was folded into its owning commit with autosquash, so the 5-commit structure is kept. New tip `54895f8dd2e` needs a force-push.

Production code changed. For every registered tool, behavior is unchanged: the parameter model and input-source dump over all 446 tools in `test/functional/tools` is byte-identical before and after. The one deliberate narrowing: a YAML source with no `class` (none are registered) now gets base parsing instead of canonical parsing. That matches its request-fill path and closes the "Open:" note in `initial_implementation_debrief.md`.

## Not acted on

- **`parse_boolean_default(..., allow_none=)` mode flag.** It exists only to preserve XML's two coercions: `get_bool` (`string_as_bool`) in `boolean_is_checked` and `get_bool_or_none` in the model factory. The two disagree on `"1"`, so collapsing the flag changes XML behavior. The YAML overrides ignore the flag, because an explicit `value: null` must reach the form as None.
- **Dual model/dict branch in `_unprivileged_tool_request`.** It keeps the existing model callers' serialization, including `uuid: null` vs. an absent `uuid`.
- **`text_input_is_optional` vs `InputSource.parse_text_optional`.** The method looks like a wrapper, but it is the polymorphic hook YAML overrides. The util function is public `galaxy-tool-util` API, so it stays.
- **`user_tool` (conftest) / `loaded_tool` (module) fixture overlap and the three param-list builders.** Merging them would touch the baseline commit for little gain.
- **The 1k-line rule.** `populators.py` was already ~5k lines. No file crosses the threshold.
- **Latent:** `strictify`'s section branch fills defaults with the XML Boolean policy, which is pre-existing. It is now explicit (`yaml_origin=False`). YAML sections are still unsupported (strict xfail), so it can't affect YAML tools yet. Scope follow-up: thread `yaml_origin` into `strictify` once sections work.

## Changes and placement

1. **One "YAML tool" predicate** (folded into commit 4 and commit 5). New `ToolSource.is_yaml_origin()` returns False by default; `YamlToolSource` returns True for class `GalaxyTool`/`GalaxyUserTool`.
   - It drives `parse_input_pages` (canonical parsing) and `Tool.yaml_origin` (request fill and `runtimeify`). `Tool.output_labels_read_tool_state` already had the same inline class check and now uses `self.yaml_origin`.
   - This closes the debrief's open note: a class-less YAML tool got canonical parsing but XML request fill. It now gets base behavior on both paths. No registered tool is class-less (checked every YAML entry in both tool confs).
2. **`CanonicalYamlPageSource` / `CanonicalYamlInputSource` subclasses replace the `canonical_defaults` flag** (folded into commit 4).
   - This removes the flag from both constructors, the six two-flag constructor calls, and the three `if self.canonical_defaults` branches.
   - Child pages and inputs are built through `_page_source` / `_input_source` factory methods, so nesting propagates the class.
   - Plain `YamlInputSource` keeps commit 3's `value` handling. `CwlInputSource` and `get_input_source` dicts are unaffected.
3. **`_fill_defaults` / `_fill_default_for` take `yaml_origin` with no default** (folded into commit 5), so a dropped recursive call is a type error. The `strictify` section call passes `False` explicitly. Public `fill_static_defaults` keeps its default.
4. **Test helpers** (folded into the baseline commit):
   - dropped the unused `DescribeUserTool.runtime_model()` pass-through
   - `RequiredTool` asserts exactly one of `tool_id` / `tool_uuid`

   Test infrastructure at the baseline commit is identical to the tip, so the baseline still passes on base production code.

## Validation

- Model/source dump (factory models, plus `parse_optional`, `boolean_is_checked`, `parse_boolean_default`, `parse_text_optional` per input): identical across 446 tools.
- `test_user_tool_contract.py`: 46 passed, 4 strict xfailed.
- `test/unit/app/tools` + `test/unit/workflows`: 623 passed.
- `test/unit/tool_util`: 1414 passed. The 38 failures are environment only: CWL `schema_salad`, conda/mulled network, `test_watcher`.
- ruff 0.15.13, black, isort, commit hooks: pass. mypy from `lib/`: no errors in changed files (same 24 unrelated errors as the old tip).
- Rebase ran an import check after every commit.

<details>
<summary>Full review</summary>

**1. Structural: two definitions of "YAML tool" (blocker-grade).** Parsing keyed on source type: every `YamlToolSource` set `canonical_defaults=True`. Request fill and `runtimeify` keyed on `parse_class() in (GalaxyUserTool, GalaxyTool)` via `Tool.yaml_origin`, and `output_labels_read_tool_state` repeated that tuple inline. Two predicates for one concept will drift; the implementation debrief already recorded the mismatch as open. Remedy: one predicate on the tool source, used everywhere. **Done.**

**2. Code judo: mode flag threaded beside `trusted`.** `canonical_defaults` rode through `YamlPageSource` and `YamlInputSource` constructors at six call sites. Three overrides started with `if self.canonical_defaults:`. The flag encodes a type ("parameter of a YAML tool definition" vs "internally built dict"), so model it as one: subclasses plus child factory methods. The flag and all three conditionals disappear. **Done.**

**3. Boundary: silent defaults on recursive helpers.** `_fill_defaults` / `_fill_default_for` defaulted `yaml_origin=False`. `strictify` already called `_fill_defaults` without it, and any future recursive call that forgets the flag silently applies XML policy to YAML tools. Remedy: make it required on the private helpers and be explicit at the existing call site. **Done.**

**4. Mode flag `allow_none` on `parse_boolean_default`.** It is a boolean parameter whose only job is choosing between two XML coercions, and YAML overrides ignore it. A cleaner model would be one Optional return with callers coercing. But `string_as_bool("1")` is True while `string_as_bool_or_none("1")` is False, so no restructure keeps XML byte-identical. **Skipped (XML must not change).**

**5. Thin wrapper `InputSource.parse_text_optional` → `text_input_is_optional`.** It earns its keep as the override point. Moving the body into the method would orphan or duplicate public util API. **Skipped.**

**6. Test helpers.**
- `_unprivileged_tool_request` branches on model vs dict. Acceptable, because it preserves the serialization contract for existing callers.
- `DescribeUserTool.runtime_model()` was unused. **Removed.**
- `RequiredTool` gained optional `tool_id` + `tool_uuid` with no invariant. **Assert added.**
- `DescribeToolExecution` carries the same pair. Left alone: it is constructed by `RequiredTool` or the populator, and the API itself rejects a missing id/uuid.
- `loaded_tool` duplicates the two-line body of `user_tool`. Minor; **skipped**.

**7. File size.** `populators.py` was already ~5k lines. `yaml.py` is ~670 lines and `convert.py` under 1k. No threshold crossing.

**8. Orchestration.** The paired `fill_static_defaults` calls on `expanded_incoming` and `job_tool_state` in `Tool` request handling are pre-existing. No new sequencing issues.

</details>
