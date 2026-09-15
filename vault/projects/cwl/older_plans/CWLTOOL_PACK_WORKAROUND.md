# Replace cwltool's pack() with cwl-utils pack

## Problem

Galaxy's CWL conformance test infrastructure uses `cwltool.pack.pack()` to pack multi-file CWL workflows into single JSON documents before uploading to Galaxy. cwltool's pack has known bugs:

1. **`import_embed` id collision** — When a tool has input and output with the same name (same id after packing), `import_embed()` replaces the output dict with `{"$import": "<id>"}`, losing `outputBinding` and all output-specific fields. This breaks `test_conformance_v1_2_iwd_subdir` (tool `iwd-subdir-tool.cwl` has input `testdir` and output `testdir` with `outputBinding: {glob: testdir/c}`).

2. **`$graph` document handling** — cwltool's pack drops workflow entries from already-packed `$graph` documents, keeping only tool entries. This is why `PACKED_WORKFLOWS_CWL_BUG` exists in `cwl_location_rewriter.py` with hardcoded YAML workarounds for `conflict-wf.cwl` and `js-expr-req-wf.cwl`.

Upstream issue: https://github.com/common-workflow-language/cwltool/issues/1937

## Where pack() is called

Only one call site in Galaxy's codebase:

**`lib/galaxy_test/base/cwl_location_rewriter.py`** — `rewrite_locations()` function:
1. Calls `cwltool.pack.pack(loading_context, workflow_path)` to produce packed workflow
2. Rewrites file locations (local paths → GitHub raw URLs) for test data
3. Writes packed JSON to temp file for Galaxy to import

This is test infrastructure only — Galaxy proper never calls pack.

## The replacement: cwl-utils

Per [cwltool#1937 comment](https://github.com/common-workflow-language/cwltool/issues/1937), `cwl-utils` includes a pack implementation ported from [sbpack](https://github.com/rabix/sbpack) at `cwl_utils.pack`.

**cwl-utils is already a Galaxy dependency** — declared in both `pyproject.toml` (`cwl-utils>=0.13`) and `packages/app/setup.cfg`. No new dependencies needed.

### Why cwl-utils over vendoring sbpack

Original plan was to vendor ~120-150 lines from sbpack to avoid its heavy deps (`sevenbridges-python`, `nf-core`, `pillow`). cwl-utils already contains the same port with no extra deps beyond what Galaxy already has. One-line import change vs new file.

### Verified behavior

Tested `cwl_utils.pack.pack()` against the problem cases:

1. **iwd-subdir-wf.cwl** — `outputBinding: {glob: testdir/c}` preserved correctly (cwltool's pack loses it)
2. **conflict-wf.cwl** (`$graph` doc) — passed through unchanged with all entries intact (cwltool drops workflow entries)
3. **API** — `pack(cwl_path) → dict` — simpler than cwltool's `pack(loading_context, workflow_path)`

## Implementation plan

### Step 1: Modify `lib/galaxy_test/base/cwl_location_rewriter.py`

**Replace imports:**
```python
# Remove:
from cwltool.context import LoadingContext
from cwltool.load_tool import default_loader
from cwltool.pack import pack

# Add:
from cwl_utils.pack import pack
```

**Remove `PACKED_WORKFLOWS_CWL_BUG` dict** (lines 15-95) — no longer needed.

**Remove `_fix_packed_import_collisions` function** — no longer needed.

**Simplify `rewrite_locations()`:**
```python
def rewrite_locations(workflow_path: str, output_path: str):
    workflow_obj = pack(workflow_path)
    cwl_version = workflow_path.split("test/functional/tools/cwl_tools/v")[1].split("/")[0]
    cwl_tools_root = (
        workflow_path.split("test/functional/tools/cwl_tools/v")[0]
        + f"test/functional/tools/cwl_tools/v{cwl_version}/"
    )
    if cwl_version == "1.0":
        tests_root = os.path.normpath(os.path.join(cwl_tools_root, "v1.0"))
    else:
        tests_root = os.path.normpath(os.path.join(cwl_tools_root, "tests"))
    visit_field(
        workflow_obj,
        ("default"),
        functools.partial(get_url, cwl_version=cwl_version, base_dir=tests_root),
    )
    with open(output_path, "w") as output:
        json.dump(workflow_obj, output)
```

Keep `from cwltool.utils import visit_field` — cwltool remains a Galaxy dep for CWL runtime.

### Step 2: Revert parser.py debug changes

The `cwl_tool_instance.tool = copy.deepcopy(cwl_tool_instance.tool)` line and debug logging added during investigation are unnecessary — the real bug is in cwltool's pack corrupting the serialized representation before Galaxy ever loads it. Revert to clean state.

### Step 3: Testing

**Red-to-green approach:**

1. Confirm `test_conformance_v1_2_iwd_subdir` fails with current cwltool pack
2. Implement steps 1-2
3. Verify `test_conformance_v1_2_iwd_subdir` passes
4. Run broader CWL conformance suite to check for regressions — especially:
   - `conflict-wf.cwl` tests (previously needed `PACKED_WORKFLOWS_CWL_BUG` workaround)
   - `js-expr-req-wf.cwl` tests (same)
   - Other workflow tests

## Key files

| File | Role |
|------|------|
| `lib/galaxy_test/base/cwl_location_rewriter.py` | Primary file to modify — replace cwltool pack, remove workarounds |
| `lib/galaxy/tool_util/cwl/parser.py` | Revert debug changes from investigation |

## Unresolved questions

1. cwl_utils.pack writes to stderr (`sys.stderr.write(f"Packing {cwl_path}\n")` and step recursion messages) — cosmetic noise in test output, acceptable?
2. `$graph` documents pass through unchanged (no re-packing) — verify Galaxy's importer handles this format for conflict-wf.cwl and js-expr-req-wf.cwl, or does it expect the entries to be in list format vs dict format?
