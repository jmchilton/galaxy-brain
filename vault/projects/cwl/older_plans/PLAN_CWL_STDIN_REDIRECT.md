# Plan: Fix CWL stdin redirection (stdin type shortcut and general)

## Problem

CWL conformance test `stdin_shorcut` (v1.1) fails — output is empty (size 0).
The tool uses `file1: stdin` shortcut syntax, but the underlying bug affects
**all CWL stdin redirection**, not just the shortcut form.

cwltool desugars `file1: stdin` → `file1: File` + `stdin: $(inputs.file1.path)`
at load time (`load_tool.py:179-194`), so both forms are identical by the time
Galaxy sees them. The real issue is that Galaxy doesn't resolve the stdin path
to the actual staged file location.

## Test tool

```yaml
# wc-tool-shortcut.cwl (v1.1)
class: CommandLineTool
requirements:
  - class: DockerRequirement
    dockerPull: debian:stretch-slim
inputs:
  file1: stdin          # desugared to file1: File + stdin: $(inputs.file1.path)
outputs:
  output:
    type: File
    outputBinding: { glob: output }
baseCommand: [wc]
stdout: output
```

Compare with long form (`wc-tool.cwl`) which uses `stdin: $(inputs.file1.path)`
explicitly — same underlying mechanism.

## How cwltool handles stdin

### At job creation (`command_line_tool.py:1012-1022`)

```python
stdin_eval = builder.do_eval(self.tool["stdin"])  # → "/some/tmp/path/file1"
j.stdin = stdin_eval
if j.stdin:
    reffiles.append({"class": "File", "path": j.stdin})  # adds to pathmapper
```

The evaluated expression returns an absolute path to where cwltool's builder
placed the input file. This path is then added to the pathmapper's reffiles
so it gets staged.

### At execution (`job.py:286-292`)

```python
stdin_path = None
if self.stdin is not None:
    rmap = self.pathmapper.reversemap(self.stdin)  # logical → staged path
    if rmap is None:
        raise WorkflowException(f"{self.stdin} missing from pathmapper")
    else:
        stdin_path = rmap[1]  # use STAGED path, not logical path
```

**Key**: cwltool does a **pathmapper reverse lookup** to convert the logical
stdin path to the actual staged file path before using it.

## How Galaxy handles stdin (and where it breaks)

### `JobProxy.stdin` (`parser.py:576-580`)

```python
@property
def stdin(self):
    if self.is_command_line_job:
        return self.cwl_job().stdin  # raw path from expression evaluation
    else:
        return None
```

Returns whatever cwltool's expression evaluator produced — an absolute path
in cwltool's temporary space, NOT the Galaxy staging directory.

### `_cwl_build_command_line()` (`evaluation.py:1354-1366`)

```python
cwl_stdin = cwl_job_proxy.stdin
# ...
if cwl_stdin:
    command_line += f' < "{cwl_stdin}"'  # uses raw path directly!
```

Galaxy appends the **unresolved path** to the command line. This path points
to cwltool's temporary directory, not where Galaxy actually staged the input
file. At execution time, the file isn't there → empty stdin → empty output.

### Contrast with stdout/stderr

`cwl_stdout` and `cwl_stderr` work because they're just **filenames** (e.g.
`output`, `stderr.txt`), not paths requiring resolution. They're relative to
the working directory, which Galaxy sets up correctly. stdin is different —
it's an input file path that must resolve to a real file.

## Fix

### Approach: resolve stdin through pathmapper in JobProxy

The pathmapper is available on the cwl_job object. Do the same reverse lookup
cwltool does.

### Change 1: `lib/galaxy/tool_util/cwl/parser.py` — `JobProxy.stdin`

```python
@property
def stdin(self):
    if self.is_command_line_job:
        cwl_job = self.cwl_job()
        stdin_path = cwl_job.stdin
        if stdin_path and hasattr(cwl_job, "pathmapper"):
            rmap = cwl_job.pathmapper.reversemap(stdin_path)
            if rmap:
                return rmap[1]  # staged path
        return stdin_path
    else:
        return None
```

This mirrors cwltool's `job.py:286-292` logic. The `reversemap()` returns
`(type, staged_path)` — we want `[1]` (the staged path).

### Alternative: resolve in evaluation.py

Could also do the resolution in `_cwl_build_command_line()` instead of in
`JobProxy.stdin`. But resolving in the proxy keeps the abstraction cleaner —
callers of `stdin` always get a usable path.

### Change 2: verify staging includes stdin file

cwltool adds stdin to reffiles (`command_line_tool.py:1022`) which feeds into
the pathmapper. Galaxy calls `process.stage_files(cwl_job.pathmapper, ...)`
at `parser.py:719`, which should already stage pathmapper entries. Verify that
the stdin file actually appears in `cwl_job.pathmapper` entries.

If it doesn't, Galaxy may need to explicitly add it:

```python
# In stage_files(), before calling process.stage_files():
if cwl_job.stdin:
    # Ensure stdin file is in the pathmapper for staging
    ...
```

But this is likely unnecessary — cwltool adds it to reffiles before creating
the pathmapper, so it should already be there.

## Testing

Red-to-green for `stdin_shorcut` (v1.1):

```bash
# Currently in RED_TESTS, requires Docker for this specific test tool
# Run via integration test harness or directly:
source .venv/bin/activate
PYTHONPATH=lib:$PYTHONPATH pytest -s -v \
  lib/galaxy_test/api/cwl/test_cwl_conformance_v1_1.py \
  -k stdin_shorcut
```

Also verify:
- `wc-tool.cwl` tests (long-form stdin) still pass — search for conformance
  tests that use `wc-tool.cwl` across v1.0/v1.1/v1.2
- Other tests using `stdin:` field aren't broken

### Debugging approach

Add temporary logging to `JobProxy.stdin` to see:
1. What `cwl_job().stdin` returns (the raw path)
2. What `cwl_job.pathmapper.reversemap()` returns
3. Whether the stdin file exists at the staged path

```python
@property
def stdin(self):
    if self.is_command_line_job:
        cwl_job = self.cwl_job()
        stdin_path = cwl_job.stdin
        log.debug(f"CWL stdin raw path: {stdin_path}")
        if stdin_path and hasattr(cwl_job, "pathmapper"):
            rmap = cwl_job.pathmapper.reversemap(stdin_path)
            log.debug(f"CWL stdin reversemap: {rmap}")
            if rmap:
                log.debug(f"CWL stdin staged path exists: {os.path.exists(rmap[1])}")
                return rmap[1]
        return stdin_path
    else:
        return None
```

## Unresolved questions

- Does the long-form `stdin:` actually work in Galaxy today? The `wc-tool.cwl`
  tests may be passing for a different reason (or may also be producing wrong
  results but passing due to loose assertions). Need to verify.
- Does the pathmapper reverse lookup work in Galaxy's context? Galaxy's staging
  may use different paths than what cwltool's pathmapper expects. If reversemap
  returns None, we need a different approach (e.g. looking up the input file
  in Galaxy's job working directory directly).
- The test tool requires Docker (`debian:stretch-slim`) — if we fix stdin, this
  test would need to move to DOCKER_REQUIRED (it's currently in RED_TESTS).
  Or find/create a non-Docker stdin test.
