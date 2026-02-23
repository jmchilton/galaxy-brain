# CWL `$graph` Document Support — Research & Plan

Branch: `cwl_on_tool_request_api_2`

---

## What is a `$graph` Document?

A packed CWL format bundling multiple process objects (tools + workflows) in one file:

```yaml
cwlVersion: v1.1
$graph:
- id: echo
  class: CommandLineTool
  baseCommand: echo
  ...
- id: main
  class: Workflow
  steps:
    step1:
      run: "#echo"   # fragment reference to tool in same file
```

Individual objects addressed via fragment URIs: `revsort-packed.cwl#main`, `conflict-wf.cwl#collision`.

Per CWL spec, when no fragment is specified, the runner **must** default to the object with `id: main` (or `id: '#main'`). This is tested by two `required` conformance tests:

```yaml
- tool: tests/echo-tool-packed.cwl       # id: main
  id: any_input_param_graph_no_default
  doc: Test use of $graph without specifying which process to run
  tags: [ required, command_line_tool ]

- tool: tests/echo-tool-packed2.cwl      # id: '#main'
  id: any_input_param_graph_no_default_hashmain
  doc: Test use of $graph without specifying which process to run, hash-prefixed "main"
  tags: [ required, command_line_tool ]
```

cwltool implements this default. If no `main`/`#main` exists and no fragment provided, cwltool errors — but that's an invalid document per spec.

---

## Research: Current State of `$graph` Support

### What Already Works

| Component | Fragment Support | `$graph` Detection | Notes |
|-----------|-----------------|-------------------|-------|
| **schema.py:52-71** | ✓ | — | `raw_process_reference()` splits `#fragment` from path, re-attaches to URI, passes to cwltool |
| **cwltool (upstream)** | ✓ | ✓ | `fetch_document()` + `make_tool()` handle `$graph` natively, default to `#main` |
| **cwl/util.py:695-720** | ✓ | ✓ | `guess_artifact_type()` has full `$graph` support |
| **managers/executables.py:14-49** | ✓ | ✓ | `artifact_class()` has full `$graph` support for dynamic tool/workflow creation |

**The critical loading path works end-to-end for fragment URIs:**

```
get_tool_source("file.cwl#fragment")
  → CwlToolSource("file.cwl#fragment")
    → tool_proxy("file.cwl#fragment")
      → _to_cwl_tool_object(tool_path="file.cwl#fragment")
        → schema_loader.raw_process_reference("file.cwl#fragment")
          → splits path/fragment, builds file:// URI with #fragment
          → cwltool.load_tool.fetch_document(uri)  # handles $graph natively
```

And for bare `$graph` paths where `#main` is a tool, cwltool defaults to `#main` — no fragment needed.

### What Breaks — The "file = tool" Assumption

**1. Directory scanning — `loader_directory.py:192-250`**

`looks_like_a_tool_cwl()` → `as_dict_if_looks_like_yaml_or_cwl_with_class()` regex-searches first 5KB for `^class: CommandLineTool`. `$graph` docs have no root `class` field → **rejected, tools inside `$graph` invisible to scanning**.

**2. Test infrastructure — `test_cwl_tool_specification_loading.py:29-38`**

`_is_workflow()` checks `doc.get("class") == "Workflow"`. `$graph` docs have no root `class` → returns `False` → file not filtered → passes to `get_tool_source()` as bare path → cwltool defaults to `#main` → if `#main` is a Workflow, `_cwl_tool_object_to_proxy()` raises "File not a CWL CommandLineTool."

**3. `sample_tool_conf.xml`**

`<tool file="revsort-packed.cwl" />` syntax has no fragment attribute. Can only reference one object per file entry. No mechanism to register individual tools from a `$graph` doc.

**4. `_find_tool_files()` in loader_directory.py**

Returns one path per file. No expansion of `$graph` files into multiple `path#fragment` entries.

### Key Insight

**The file=tool assumption is less broken than feared.** The core loading pipeline (`schema.py` → cwltool) already supports fragment URIs fully. The assumption exists in:
- Directory scanning (won't auto-discover `$graph` tools) — acceptable since `$graph` is a packing format
- `sample_tool_conf.xml` — could support `file="packed.cwl#fragment"` if needed
- Test infrastructure — needs fixing

The main work is test infrastructure and validation, not core loading.

### `$graph` Files in Test Suite

**v1.0:** `revsort-packed.cwl`, `import_schema-def_packed.cwl`

**v1.1/v1.2:** `revsort-packed.cwl`, `echo-tool-packed.cwl`, `echo-tool-packed2.cwl`, `import_schema-def_packed.cwl`, `conflict-wf.cwl`, `js-expr-req-wf.cwl`, `scatter-wf3.cwl`, `search.cwl`

**No `$graph` docs in:** `parameters/`, `v1.0_custom/`, galactic tools.

---

## Plan

### Step 1: Fix `_is_workflow()` and `_cwl_tools_from_dir()` for `$graph`

Current `_is_workflow()` misclassifies `$graph` docs. Replace with logic that:

1. Detects `$graph` key in document
2. For `$graph` docs, **expands** into per-object test cases with `path#fragment` for each `CommandLineTool`/`ExpressionTool`
3. Skips `$graph` objects that are Workflows

```python
def _expand_graph_tools(path, doc):
    """For $graph docs, yield fragment paths for each tool object."""
    for obj in doc["$graph"]:
        cls = obj.get("class")
        if cls in ("CommandLineTool", "ExpressionTool"):
            obj_id = obj["id"].lstrip("#")
            yield f"{path}#{obj_id}"
```

Also test the "default to `#main`" behavior: if `#main` is a tool, yield a bare-path test case too.

### Step 2: Verify fragment URIs pass through `get_tool_source()`

Write a focused test: `get_tool_source("echo-tool-packed.cwl#main")` → assert `CwlToolSource` created, `input_models_for_tool_source()` succeeds. This validates the end-to-end path already works — no code changes expected, just verification.

Also test: `get_tool_source("conflict-wf.cwl#echo")` → loads the echo CommandLineTool from a `$graph` where `#main` is a workflow.

### Step 3: Add `$graph` test tier to specification loading tests

New test cases in `test_cwl_tool_specification_loading.py`:

- **`$graph` with tool as `#main`**: `echo-tool-packed.cwl` (bare path, cwltool defaults to `#main`) → assert parameter model succeeds
- **`$graph` with explicit fragment**: `conflict-wf.cwl#echo`, `conflict-wf.cwl#cat` → assert parameter models
- **`$graph` with `#main` as workflow + explicit tool fragment**: `revsort-packed.cwl#revtool.cwl` → assert parameter model

These only run if conformance tools are downloaded.

### Step 4: Improve error message in `_cwl_tool_object_to_proxy()`

Current: `"File not a CWL CommandLineTool."` — misleading for `$graph` docs where the issue is that the resolved object is a Workflow.

Change to include resolved class and URI for debuggability.

### Step 5: (Deferred) `looks_like_a_tool_cwl()` for `$graph`

Auto-discovery of `$graph` tools via directory scanning. Low priority — `$graph` is a packing format for portability, not a tool authoring format. Tools in `$graph` are embedded for workflow self-containment; they aren't typically registered standalone.

If needed later: detect `$graph` key, check if any objects are CommandLineTool/ExpressionTool, return True. Caller would also need expansion logic to yield `path#fragment` entries — larger change spanning `_find_tool_files()`, `load_tool_elements_from_path()`, and potentially `sample_tool_conf.xml`.

### Step 6: (Deferred) `sample_tool_conf.xml` fragment support

Allow `<tool file="packed.cwl#fragment" />`. Would need `get_tool_source()` to handle this — which it already does since the path passes through to `schema.py`. May already work with zero changes. Verify if needed.

---

## File Changes Summary

| File | Change | Priority |
|------|--------|----------|
| `test/unit/tool_util/test_cwl_tool_specification_loading.py` | `$graph` expansion in tool discovery, new test cases for fragment loading | High |
| `lib/galaxy/tool_util/cwl/parser.py:875` | Better error message with class + URI | Low |
| `lib/galaxy/tool_util/loader_directory.py` | Detect `$graph` in `looks_like_a_tool_cwl()` | Deferred |
| `schema.py`, `factory.py` | No changes needed — fragment handling already works | — |

## Testing Strategy

- **Conformance-tools-required tests**: `$graph` expansion + fragment loading tests only run when `update_cwl_conformance_tests.sh` has been run
- **Red-to-green**: any factory failures from newly-discovered `$graph` tools feed back into the `_from_input_source_cwl()` improvement work
- **Verification tests**: confirm fragment URIs work end-to-end through existing pipeline (expect green immediately)

## Unresolved Questions

1. Should `sample_tool_conf.xml` support `file="packed.cwl#fragment"` syntax, or is dynamic tool loading sufficient?
2. For conformance tests that reference `$graph` workflows, should those be tested through the workflow loading path or stay filtered?
3. Is there value in auto-discovery (Step 5) for any current Galaxy deployment, or is explicit fragment reference sufficient?
