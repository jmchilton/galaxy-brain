# Pulsar jobs with `default_file_action: none` fail when a tool uses extra files

On a Pulsar destination with `default_file_action: none` (the shared-filesystem setup), any tool whose command line asks for a dataset's extra-files path fails while Galaxy builds that command line, with `TypeError: 'NoneType' object is not subscriptable`.

| Tool, embedded Pulsar, `default_file_action: none` | `dev` (18296103e03) |
| --- | --- |
| `simple_constructs`, `job_properties` (the existing `none` integration tests) | ✅ |
| `create_directory_index` (writes a Directory output via `from_work_dir`, never asks for its path) | ✅ |
| `composite_output_tests` (`$input.extra_files_path`, `$output.files_path`) | ❌ job errors before it runs, `exit_code: None` |
| `dataset_path`, Directory test case (`$input.path` on a `directory` input) | ❌ same |
| `composite_output_tests` with `copy` / `remote_transfer` (existing `test_pulsar_embedded*.py`) | ✅ |

Anything that asks the Pulsar compute environment for an extra-files path is affected: `$input.extra_files_path` / `$input.files_path` and the same on outputs (composite datatypes), `$input.path` / `$output.path` and YAML-tool paths for Directory datatypes, and data-manager bundle paths. A per-path `none` rule (e.g. for a shared object store) and a `rewrite` rule that leaves the path unchanged hit it too. Only destinations with `rewrite_parameters` on are affected; the REST, MQ, embedded and coexecution/Kubernetes runners turn it on by default.

<details><summary>Why</summary>

For non-staging actions Pulsar's path mapper returns no rewrite: `NoneAction.path_rewrite` returns `None`, and `RewriteAction.path_rewrite` returns `None` when the path doesn't change. `PulsarComputeEnvironment.input_path_rewrite` / `output_path_rewrite` pass that `None` through, which is fine, since callers fall back to the local path (`tools/runtime.py`: `return rewrite or dataset.get_file_name()`).

The extra-files hooks don't check for it:

```python
# lib/galaxy/jobs/runners/pulsar.py
def input_extra_files_rewrite(self, dataset):
    input_path_rewrite = self.input_path_rewrite(dataset)
    remote_extra_files_path_rewrite = dataset_path_to_extra_path(input_path_rewrite)  # None[0:-4]
    self.path_rewrites_input_extra[dataset.extra_files_path] = remote_extra_files_path_rewrite
    return remote_extra_files_path_rewrite

def output_extra_files_rewrite(self, dataset):
    output_path_rewrite = self.output_path_rewrite(dataset)
    remote_extra_files_path_rewrite = dataset_path_to_extra_path(output_path_rewrite)  # same
    return remote_extra_files_path_rewrite
```

`dataset_path_to_extra_path` (`lib/galaxy/job_execution/compute_environment.py`) slices `path[0 : -len(".dat")]`.

</details>

<details><summary>Reproduction (integration test, fails on dev)</summary>

Add to `test/integration/test_pulsar_embedded_none.py` (`integration_tool_runner` only runs each tool's first test case, so the Directory case needs its own test):

```python
test_tools = integration_util.integration_tool_runner(
    [
        "simple_constructs",
        "job_properties",
        "composite_output_tests",
    ]
)


def test_dataset_path_directory(instance):
    instance._run_tool_test("dataset_path", index=1)
```

```
FAILED test/integration/test_pulsar_embedded_none.py::test_tools[composite_output_tests]
JobOutputsError: Job in error state.. tool_id: composite_output_tests, exit_code: None, stderr: .
FAILED test/integration/test_pulsar_embedded_none.py::test_dataset_path_directory
JobOutputsError: Job in error state.. tool_id: dataset_path, exit_code: None, stderr: .
```

Handler log:

```
galaxy.jobs.runners.pulsar ERROR failure preparing job 5
Traceback (most recent call last):
  ...
  File "lib/galaxy/tools/wrappers.py", line 560, in __getattr__
    return self.compute_environment.output_extra_files_rewrite(self.unsanitized)
  File "lib/galaxy/jobs/runners/pulsar.py", line 1456, in output_extra_files_rewrite
    remote_extra_files_path_rewrite = dataset_path_to_extra_path(output_path_rewrite)
  File "lib/galaxy/job_execution/compute_environment.py", line 16, in dataset_path_to_extra_path
    base_path = path[0 : -len(".dat")]
TypeError: 'NoneType' object is not subscriptable
```

The Directory case fails the same way via `wrappers.py` `path` → `runtime.py` `dataset_path` → `input_extra_files_rewrite`. Calling both hooks directly on a `PulsarComputeEnvironment` (`pulsar-galaxy-lib` 0.16.0):

```
transfer  input_path_rewrite: '/pulsar/1/inputs/dataset_1.dat'
transfer  input_extra_files_rewrite: '/pulsar/1/inputs/dataset_1_files'
transfer  output_extra_files_rewrite: '/pulsar/1/outputs/dataset_1_files'
none      input_path_rewrite: None
none      input_extra_files_rewrite: TypeError: 'NoneType' object is not subscriptable
none      output_extra_files_rewrite: TypeError: 'NoneType' object is not subscriptable
```

</details>

<details><summary>Related: the sample job conf points admins at <code>none</code></summary>

`lib/galaxy/config/sample/job_conf.sample.yml`, `secure_pulsar_rest_dest`:

- The comment says "Uncomment the following statement to disable file staging", but `default_file_action: none` is already uncommented, so anyone copying the example gets the shared-filesystem assumption.
- The list of per-path actions, `none|copy|http|remote_transfer|remote_copy`, includes `http`, which isn't a Pulsar action (as `default_file_action` it fails with "Unknown Pulsar default file action type"), and omits `transfer`, `rewrite`, `remote_transfer_tus`, `remote_object_store_copy`, `remote_rsync_transfer` and `remote_scp_transfer`.
- Unrelated typo nearby: `` `galaxy_infrastructure_url1 `` (stray `1`, missing closing backtick).

</details>

## Context

Bug related to 🎯 #21566 - same `default_file_action: none` setup; its fix, 🔀 #21578, added `test_pulsar_embedded_none.py`, which only runs tools that don't ask for extra-files paths.

## Proposed Approach

When the primary path has no rewrite, have both extra-files hooks return `None` and record nothing in `path_rewrites_input_extra` (with `none` there's nothing to stage). Callers then fall back to the local `dataset.extra_files_path`, as they already do for the primary path. Add the two tests above to `test_pulsar_embedded_none.py`, and fix the sample job conf comments.

<details><summary>Caller fallbacks</summary>

- `tools/wrappers.py` `DatasetFilenameWrapper.__getattr__` (`extra_files_path` / `files_path`) needs an `or self.unsanitized.extra_files_path` fallback; the data-manager `_bundle_path_rewrite` should return `None` (no rewrite) when the hook does.
- `tools/runtime.py` Directory outputs already do `output_extra_files_rewrite(dataset) or dataset.extra_files_path`; once the hook returns `None` that works.
- `tools/runtime.py` Directory inputs pass the result to `datatype.content_path(dataset, extra_files_path)`, which already treats `None` as the local path.

</details>

## Alternative Approaches

The hooks could return the local `dataset.extra_files_path` themselves instead of `None`. That needs no caller changes, but it breaks the convention the Pulsar primary-path hooks and their callers already follow: `None` means "no rewrite". Returning `None` keeps the hooks consistent and makes the fallback explicit at each call site.
