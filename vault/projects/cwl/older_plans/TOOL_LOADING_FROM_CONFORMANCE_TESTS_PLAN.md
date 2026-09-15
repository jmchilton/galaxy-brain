# Plan: Pilot CWL Tool Specification Loading from Conformance Tests

## Problem

`test_cwl_tool_specification_loading.py::test_conformance_cwl_tool_loads` discovers CWL tools
via blind `os.walk` over `cwl_tools/v1.{0,1,2}/`. This picks up every `.cwl` file including
intentionally invalid tools (e.g. `invalid-tool-v10.cwl`, `timelimit2.cwl` with negative value).
23 tests fail — some are real loader gaps, but 3 are tools designed to be invalid CWL that
should never be loaded.

Additionally, `conformance_tests_gen()` is duplicated:
- `lib/galaxy_test/base/populators.py:320` — handles `$import` via dir+filename split, tags entries with `directory`
- `scripts/cwl_conformance_to_test_cases.py:303` — simpler, passes `$import` path as filename

## Goal

1. Consolidate `conformance_tests_gen()` into `lib/galaxy/tool_util/unittest_utils/`
2. Replace filesystem-walk-based tool discovery with conformance-YAML-driven discovery
3. Automatically exclude `json_schema_invalid` tools
4. Keep existing parameter/custom/galactic tool tiers unchanged

## Steps

### Step 1: Move `conformance_tests_gen()` to `tool_util/unittest_utils/cwl_data.py`

Create `lib/galaxy/tool_util/unittest_utils/cwl_data.py` with the consolidated function.

Use the populators.py version as the base (it's more correct — resolves `$import` dir paths
properly and tags each entry with `directory`).

```python
# lib/galaxy/tool_util/unittest_utils/cwl_data.py

import os
import yaml

def conformance_tests_gen(directory, filename="conformance_tests.yaml"):
    """Yield conformance test entries, recursively following $import directives.

    Each yielded dict gets a 'directory' key set to the resolved directory
    of the file it was loaded from.
    """
    conformance_tests_path = os.path.join(directory, filename)
    with open(conformance_tests_path) as f:
        conformance_tests = yaml.safe_load(f)

    for conformance_test in conformance_tests:
        if "$import" in conformance_test:
            import_dir, import_filename = os.path.split(conformance_test["$import"])
            yield from conformance_tests_gen(os.path.join(directory, import_dir), import_filename)
        else:
            conformance_test["directory"] = directory
            yield conformance_test
```

**Test**: existing conformance tests (`test_cwl_conformance_v1_*.py`) and
`cwl_conformance_to_test_cases.py` still work after the import change.

### Step 2: Refactor populators.py to import from cwl_data

In `lib/galaxy_test/base/populators.py`:
- Remove the local `conformance_tests_gen()` definition (lines 320-331)
- Add `from galaxy.tool_util.unittest_utils.cwl_data import conformance_tests_gen`
- Usage at line 3025 unchanged — already passes `(directory)` with default filename

### Step 3: Refactor `scripts/cwl_conformance_to_test_cases.py` to import from cwl_data

- Remove the local `conformance_tests_gen()` definition (lines 303-313)
- Add `from galaxy.tool_util.unittest_utils.cwl_data import conformance_tests_gen`
- Note: the script's version doesn't split dir/filename for `$import`, and it doesn't
  set `directory` — but it only uses the yielded dicts for `doc`/`id`/`tags` fields,
  not `directory`. So the consolidated version is a superset that works fine here.

**Test**: `make generate-cwl-conformance-tests` still produces identical output.

### Step 4: Replace `_conformance_cwl_tools()` with YAML-driven discovery

In `test_cwl_tool_specification_loading.py`, replace `_conformance_cwl_tools()`:

```python
def _conformance_cwl_tools():
    """CWL tools from conformance test YAML entries (v1.0, v1.1, v1.2).

    Skips json_schema_invalid tools, workflows, and $graph docs.
    Only yields if conformance tests have been downloaded.
    """
    for version in ["v1.0", "v1.1", "v1.2"]:
        version_dir = os.path.join(CWL_TOOLS_DIR, version)
        conformance_path = os.path.join(version_dir, "conformance_tests.yaml")
        if not os.path.exists(conformance_path):
            continue

        seen = set()
        for entry in conformance_tests_gen(version_dir):
            tags = set(entry.get("tags", []))

            # skip intentionally invalid CWL
            if "json_schema_invalid" in tags:
                continue

            tool_rel = entry.get("tool")
            if not tool_rel:
                continue

            directory = entry.get("directory", version_dir)
            tool_path = os.path.join(directory, tool_rel)
            tool_path = os.path.normpath(tool_path)

            if tool_path in seen:
                continue
            seen.add(tool_path)

            if not os.path.exists(tool_path):
                continue

            if _is_workflow_or_graph(tool_path):
                continue

            rel_id = os.path.relpath(tool_path, CWL_TOOLS_DIR)
            yield pytest.param(tool_path, id=rel_id)
```

Remove `_cwl_tools_from_dir()` if no longer used elsewhere (it's also used by
`_parameter_cwl_tools`, `_custom_cwl_tools`, `_galactic_cwl_tools` — so keep it).

**Test (red-to-green)**:
- Before: 23 failures including 3 `json_schema_invalid` tools
- After: 20 failures — the 3 intentionally-invalid tools no longer appear
- Remaining 20 failures are real loader gaps (tmap schema_def, timelimit requirements,
  inplace update, nested types, etc.)

## Commit Strategy

1. **Commit 1**: Move `conformance_tests_gen` to `cwl_data.py`, update both importers
2. **Commit 2**: Rewrite `_conformance_cwl_tools()` to parse YAML, add xfail set
