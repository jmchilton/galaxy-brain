Run via Claude Opus at high effort.

# Planemo adoption proof

Pass. Planemo's `list-param-inputs-not-collections` (`129b9a55`) drops its pop/update workaround around `psi.stage` for `parameter_input_keys=set(<parameter-input labels>)`, against galaxy-tool-util built from this branch (`a812cad3`). Its staging unit tests pass, and its Galaxy-backed `planemo run` test passes. Dropping the keyword turns both red with the planemo#1744 failure.

The proof is unconditional. Planemo's real adoption also needs a galaxy-tool-util version check (or a floor bump), and that isn't part of the proof. Against released 26.1.2, the same diff fails with `TypeError` on every `stage_in` call.

## Setup

- Scratch worktree with local branch `scratch/parameter_input_keys_proof`, made from `129b9a55`. The proof commit is `a3b60444`, local only and never pushed. The original branch and its worktree are untouched.
- Dedicated uv venv (Python 3.12):
  1. `uv pip install -e <scratch planemo> pytest pytest-mock responses flask Werkzeug`. This resolves to galaxy-tool-util 26.1.2.
  2. Swapped in all three Galaxy packages from the Galaxy worktree with `uv pip install --no-deps <gx>/packages/util <gx>/packages/tool_util_models <gx>/packages/tool_util` (all `26.2.0rc1`), plus `regex`.
- `uv pip check` flags planemo's caps: `galaxy-tool-util[...]>=25.1,<26.2`, `galaxy-tool-util-models>=25.1,<26.2` and `galaxy-util[template]>=24.1,<26.2`. Planemo can't install 26.2 until those caps are lifted.
- The build artifacts the install left under `<gx>/packages/*/{build,src/*.egg-info}` were removed. `git status --porcelain --ignored packages/` is empty, as it was before.

Loaded code:

```text
galaxy.tool_util -> <venv>/site-packages/galaxy/tool_util/__init__.py   (26.2.0rc1 from the Galaxy worktree)
planemo          -> <scratch worktree>/planemo/__init__.py
StagingInterface.stage(self, tool_or_workflow, history_id, job=None, job_path=None, use_path_paste=True,
    to_posix_lines=True, job_dir='.', resolve_data=None,
    parameter_input_keys: collections.abc.Set[str] | None = None)
```

`PlanemoStagingInterface` (`planemo/galaxy/activity.py:127`) doesn't override `stage()`, so the keyword reaches galaxy-tool-util unchanged.

## Diff

The `_has_parameter_list` gate stays (gxformat2#202 decision on the planemo branch). Only the mechanism changes.

```diff
@@ -12,6 +12,7 @@ from typing import (
     Dict,
     List,
     Optional,
+    Set,
     Tuple,
     Type,
     TYPE_CHECKING,
@@ -454,13 +455,10 @@ def stage_in(
 
     with open(job_path) as f:
         job = yaml.safe_load(f) or {}
-    # Galaxy takes workflow parameter values as they are, but staging would turn a list
-    # (for a multiple-value parameter input) into an uploaded collection, so hold them back.
-    parameter_values = {}
+    # Pass workflow parameter values through as given; staging would upload a list as a collection.
+    parameter_input_keys: Optional[Set[str]] = None
     if runnable.type == RunnableType.galaxy_workflow and _has_parameter_list(job):
-        for label in _workflow_parameter_input_labels(runnable, config):
-            if label in job:
-                parameter_values[label] = job.pop(label)
+        parameter_input_keys = set(_workflow_parameter_input_labels(runnable, config))
 
     # Create upload progress display context manager (or nullcontext if disabled)
     progress_context: Union[UploadProgressDisplay, contextlib.nullcontext]
@@ -486,10 +484,10 @@ def stage_in(
             job_dir=os.path.dirname(os.path.abspath(job_path)),
             use_path_paste=config.use_path_paste,
             to_posix_lines=to_posix_lines,
+            parameter_input_keys=parameter_input_keys,
         )
         psi.wait_for_uploads(kwds.get("check_uploads_ok", True))
 
-    job_dict.update(parameter_values)
     return job_dict, history_id
```

## Results

| Run | galaxy-tool-util | Diff | Result |
|---|---|---|---|
| `pytest tests/test_galaxy_activity.py tests/test_galaxy_workflow_utils.py` | 26.1.2 | none (baseline) | 21 passed, 1 xfailed |
| same | 26.2.0rc1 (branch) | proof | 21 passed, 1 xfailed |
| `pytest tests/test_galaxy_activity.py -k stage_in` | 26.2.0rc1 | proof | 6 passed, 1 xfailed (the expected gxformat2#202 xfail) |
| same | 26.2.0rc1 | proof without the `parameter_input_keys=` argument | **4 failed**, 2 passed |
| `pytest tests/test_run.py -k test_run_multiple_value_parameter_inputs` (real Galaxy) | 26.2.0rc1 | proof | **1 passed** (78s), not skipped |
| same | 26.2.0rc1 | proof without the `parameter_input_keys=` argument | **1 failed** (69s) |
| `pytest tests/test_galaxy_activity.py -k stage_in` | 26.1.2 (released) | proof | **6 failed**: `TypeError: StagingInterface.stage() got an unexpected keyword argument 'parameter_input_keys'` |

- In the unit red check, the local and the three remote `stage_in` tests fail with `'text_list': {'src': 'hdca', 'id': 'collection1'} != ['curated_consensus', '--ex2']`. `int_list` fails the same way. `data_list` is still an HDCA either way.
- The Galaxy-backed test ran against planemo's default `--galaxy_branch master`, which is `~/.planemo/gx_repo` at `b18269a10f8` (26.1). The server is unchanged; only the client staging is new. In the red run, staging finished, list collections were created (`POST /api/dataset_collections` 200), and then the invocation failed:

  ```text
  "POST /api/workflows/08b4b666e915b738/invocations HTTP/1.1" 400 176
  bioblend.ConnectionError: Unexpected HTTP status code: 400: {"err_msg":"text_list: workflow parameter inputs cannot be dictionaries. Pass the parameter value directly in 'inputs', without a 'parameter_value' wrapper.","err_code":400008}
  ```

- The 26.1.2 run fails even for jobs where the keyword is `None`, because the keyword is always passed. A version check has to gate passing the keyword at all, not only its value.

## Not covered

- No version check or requirement change in planemo.
- No mypy or lint run on the scratch diff.
- No Galaxy-backed run against a 26.2 server. The server side isn't changed by this branch.
