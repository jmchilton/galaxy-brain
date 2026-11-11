Run via Claude Opus 5.5 at low effort.

# Normal review 1: reference_data_followups

Reviewed `git diff origin/dev...HEAD` (6 commits, 14 files, +207/-28) at `f59856b47a5`.

## Verdict

Ready. No real bugs. The port is clean, with no filter-era leftovers, and the six findings it ports are each addressed. Three cheap nits are worth taking (N1-N3); the rest are optional.

Checks run:

- Unit tests: `test_reference_data.py` and `test_yaml_parameters.py`, 122 passed.
- ruff, black and isort on the changed files: clean.
- mypy: no errors on changed lines. The errors it does report are on untyped `def`s that already exist on dev.
- Ran the parity-test logic against an extracted `origin/dev` lib: it holds on dev too (see T1).

## Domain concerns

1. **Filter-era leftovers / dead code.** None. Grepping the diff for `filter`, `on_metadata` and `from_input` turns up only the test that expects a leftover `filter` key to be rejected. `YamlReferenceDataOptions` takes only `table`. `requires_user_accessible_table` has no remaining references.
2. **`parse_reference_data()` seam.** This is the right seam. It sits beside `parse_dynamic_options`/`parse_validators` on `InputSource`, defaults to `None` (so XML and CWL sources inherit "not YAML"), and only `CanonicalYamlInputSource` validates. That matches #23888's caveat that plain `YamlInputSource` dicts (workflow forms) must not be validated as tools.
   - It does re-validate. Each tool load calls `model_validate` three times per reference_data param: the factory via `input_models_for_pages`, `ReferenceDataToolParameter.__init__`, and `SelectToolParameter.__init__` → `parse_dynamic_options`. `verify/parse.py:549` and the YAML `_parse_parameters` add more. Each call validates a dict of 3-7 keys, and only at load time, so it doesn't matter. Memoizing on the input source isn't worth the state.
   - The migration is partial. `ReferenceDataToolParameter` reads `table` from the model, but `SelectToolParameter.__init__` still reads `multiple`/`optional`/`label` from the raw dict. The validation has already passed, and pydantic's bool coercion and `get_bool` agree on the usual spellings, so this is acceptable for this scope.
3. **`ReferenceDataToolParameter.trusted`.** No collision. Neither `ToolParameter` nor `SelectToolParameter` defines `trusted`, and dict serialization uses explicit key lists. The name matches `InputSource.trusted` / `ToolSource.trusted`, and the job-time check uses `tool_source.trusted`, which comes from the same root. A slight downside is that a param-level `trusted` could be misread as "value is trusted". Optional rename: `tool_trusted`. Not required.
4. **Disk-tool rejection.** Nothing real is affected:
   - `gx_reference_data` is unreleased (dev only, from #24798).
   - API-created `GalaxyTool`/`GalaxyUserTool` already go through the same `extra="forbid"` model, so stored rows conform.
   - Legacy class-less YAML tools use plain `YamlInputSource` and were already refused on dev, because `parse_dynamic_options` returns `None` for them.

   A side effect is that reference_data is now the only YAML param type validated strictly on disk; other types stay lax there. That is #23888's direction, but it's worth one line in the PR body.
5. **Test strength.** The assertions are strong, with no OR-checks. Details are under T1-T3.
6. **Imports and comments.** The new imports are at the top of their modules. The `interface.py` import is under `TYPE_CHECKING`, which is fine. Docstrings are one line. N2 covers one stale lazy import that this branch makes removable.

## Real bugs

None.

## Nits (cheap, recommend taking)

### N1: Module docstring now wrong about `to_internal()` (`lib/galaxy/tool_util_models/yaml_parameters.py:8-13`)

The docstring still says `to_internal()` "is not load-bearing for execution today". The factory now returns `YamlReferenceDataParameter.to_internal()` directly.

```diff
-``YamlToolSource``. The primary production path still builds internal models via
-``input_models_for_tool_source`` from the raw validated dict, so ``to_internal()``
-is not load-bearing for execution today.
+``YamlToolSource``. The primary production path still builds internal models via
+``input_models_for_tool_source`` from the raw validated dict; only ``reference_data``
+loads through ``to_internal()`` (via ``InputSource.parse_reference_data()``).
```

### N2: Lazy `runtimeify` import is now redundant (`lib/galaxy/tools/evaluation.py:1160`)

The branch adds a top-level `from galaxy.tool_util.parameters.convert import reference_data_runtime_json` at line 46. That shows the module imports cleanly at top level, so the in-method `from galaxy.tool_util.parameters.convert import runtimeify` (already on dev) has no reason left to be lazy.

```diff
-from galaxy.tool_util.parameters.convert import reference_data_runtime_json
+from galaxy.tool_util.parameters.convert import (
+    reference_data_runtime_json,
+    runtimeify,
+)
@@
         if validated_tool_state is not None:
-            from galaxy.tool_util.parameters.convert import runtimeify
             cwl_style_inputs = job_runtime_state.input_state
```

(The `to_cwl` lazy import from `galaxy.workflow.modules` should stay. It's likely circular.)

### N3: Positional bool on `readable_by` (`lib/galaxy/tool_util/data/__init__.py:386`)

As written, the calls read `table.readable_by(self.trusted)` and `table.readable_by(trusted)`. Making the argument keyword-only makes the meaning visible at the call sites:

```diff
-    def readable_by(self, trusted: bool) -> bool:
+    def readable_by(self, *, trusted: bool) -> bool:
```

Then use `readable_by(trusted=...)` in `basic.py:1893` and `runtime.py:136`.

## Optional nits

- `reference_data_runtime_json` (`convert.py:788`) is typed `value: Any -> Any`. It could return `dict[str, Any] | list[dict[str, Any]]`, but the callers feed visitor returns, so the gain is small.
- `ParameterDefinitionError` (factory) and `ParameterValueError` (basic.py) for the same "only supported in YAML tools" condition. Each is the local convention, so this is fine.
- The parity test's `dump_kwargs` parametrize has no `ids`, so pytest prints `dump_kwargs0/1/2`. Use `ids=["full", "exclude_unset", "exclude_none"]`.

## Tests

### T1: The parity test passes on dev, and its main assertion is now near-tautological (`test/unit/tool_util/test_yaml_parameters.py:124-154`)

I ran the same {single, multiple_optional} × {GalaxyUserTool, GalaxyTool} × {full, exclude_unset, exclude_none} matrix against an extracted `origin/dev` lib, and `parsed == to_internal()` holds there. On this branch the factory *returns* `to_internal()`, so the assertion mainly guards the dump policies flowing through `model_validate`. It is still a reasonable drift guard if someone reintroduces a hand-built factory branch.

It isn't red-to-green, though. Either move it into a `Baseline tests:` commit, since it passes on dev, or keep it and note in the commit message that it's a guard. The actual red-to-green for P2 3 is `test_definitions_the_authoring_model_rejects_fail_to_load`.

### T2: `pytest.raises(ValidationError)` has no `match` (`test/unit/app/tools/test_reference_data.py:222`)

The fixture is otherwise valid, so a stray `ValidationError` is unlikely. Still, matching the offending field tightens it cheaply. For example, parametrize an expected substring: `"filter"`, `"options"`, `"multiple"`, which pydantic includes in the error loc.

### T3: The multiple contract test doesn't check the offered options (`lib/galaxy_test/api/test_user_tool_contract.py:197-204`)

The single test asserts the option values; the multiple one only checks `multiple is True`. Mirror the options assertion:

```diff
     assert parameter["multiple"] is True
+    assert [option[1] for option in parameter["options"]] == ["hg19_value", "hg18_value", "mm10_value"]
```

### Other test notes (no action)

- The closed-table API test now checks that the build offers nothing and that the 400 names the parameter. The closed-after-submit unit test is parametrized over both state modes and matches "no legal values". Both are what P2 2 asked for.
- The job-time `readable_by` check is still covered directly by the `setup_for_reference_data` tests ("not available to user-defined tools").
- `TOOL_WITH_REFERENCE_DATA` / `test_run_with_reference_data` are now mostly redundant with the contract twins. The verified review left them on purpose; the admin test reuses `TOOL_WITH_REFERENCE_DATA`.
- Commit layout is right. The three `Baseline tests:` commits come first. The XML `with_options` case and the reject-on-load cases are in the implementation commits, where they belong, since they're red on dev.
