# Problems After Swapping cwltool.pack -> cwl_utils.pack

## Context

Commit `8de4e426eb` replaced `cwltool.pack` with `cwl_utils.pack` in `cwl_location_rewriter.py` to fix known cwltool packing bugs (corrupted outputs when input/output share ids, dropped $graph entries). This removed the `PACKED_WORKFLOWS_CWL_BUG` hardcoded workarounds for `conflict-wf.cwl` and `js-expr-req-wf.cwl`.

## Key Format Differences

`cwltool.pack` and `cwl_utils.pack` produce structurally different output for the same workflow:

| Aspect | cwltool.pack | cwl_utils.pack |
|--------|-------------|----------------|
| Top-level format | `$graph` array with separate tool/workflow objects | Inline (tools embedded in step `run`) |
| IDs | Prefixed with `#` (`#main/step1/file1`) | Plain (`file1`) |
| Step run refs | String reference (`"#wc-tool.cwl"`) | Full inline tool object |
| File locations | Absolute `file://` URIs | Relative paths (e.g. `whale.txt`) |
| Hints | List of dicts | Dict of dicts |

## Bug 1: TypeError in get_url (FIXED)

**Test**: `test_conformance_v1_0_step_input_default_value_noexp`
**Error**: `TypeError: argument of type 'NoneType' is not iterable`
**Location**: `cwl_location_rewriter.py:get_url()` line 34

**Root cause**: `cwl_utils.pack` produces relative paths (e.g. `"location": "whale.txt"`) instead of `file://` URIs. The old `get_url` code only handled `file://` scheme — when scheme was empty, `location` stayed `None` from the `item.pop("path", None)` fallback, and `base_dir not in location` crashed.

**Fix applied**: Added handling for relative paths (no scheme) and http/https URLs in `get_url`. The relative path is used directly and rewritten to a GitHub URL, same as for absolute paths.

## Bug 2: CompareFail — wrong output content (OPEN)

**Test**: `test_conformance_v1_0_step_input_default_value_noexp`
**Error**: Expected checksum `sha1$3596ea...` (= `"16\n"`, wc -l of 16-line whale.txt), got `sha1$9aefd4...` (= `"       1\n"`, wc -l of 1-line file)

**Observation**: After fixing Bug 1, the URL rewrite produces the correct GitHub URL (`https://raw.githubusercontent.com/.../whale.txt`). The job runs successfully — cwltool generates the correct command (`wc -l < .../whale.txt > output`). But the staged `whale.txt` contains only 1 line instead of 16.

**Hypothesis**: The structural format difference matters. Galaxy's workflow import/execution pipeline expects `$graph` format from packed workflows. The inline format from `cwl_utils.pack` may cause Galaxy to handle step input defaults differently — possibly not properly resolving the File default's `location` URL, resulting in a placeholder or incomplete file being staged.

**Key code path**: `modules.py:_resolve_cwl_default()` -> `cwl_runtime.py:raw_to_galaxy()` which has a hard assertion `assert os.path.exists(location[len("file://")])` — this assumes `file://` URIs. With an `https://` URL, `location[7]` would be `'r'` and `os.path.exists('r')` returns False. But the test didn't crash with AssertionError, so this code path may not be hit at all (the default may be handled by cwltool directly during job generation instead).

**Not yet investigated**: How cwltool handles the default File with an https URL during job binding — does it download it? Does it need special config? The 1-line output suggests the file content is wrong, not that the file is missing entirely.

## Bug 3: KeyError 'download_url' (NOT YET INVESTIGATED)

**Test**: `test_conformance_v1_0_workflow_file_array_output`
**Error**: `KeyError: 'download_url'`

Not yet investigated. Likely related to the same format differences — the inline packed format may cause Galaxy's output collection to behave differently when constructing download URLs for File array outputs.

## Approach Going Forward

The `cwl_utils.pack` output is valid CWL but Galaxy's CWL infrastructure assumes the `$graph` format in multiple places. Rather than reverting to broken `cwltool.pack`, the right fix is to make Galaxy handle the inline packed format correctly. This may involve:

1. Updating `raw_to_galaxy()` to handle non-`file://` URIs
2. Ensuring workflow import handles both `$graph` and inline packed formats
3. Verifying cwltool properly resolves default File locations with remote URLs during job binding
