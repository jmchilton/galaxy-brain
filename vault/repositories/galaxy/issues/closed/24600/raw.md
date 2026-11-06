# Raw: Pulsar `none` file action crashes on extra files (+ sample job_conf drift)

Found by gx_research while writing `vault/research/Component - Pulsar Input Staging.md` (bugs B15 + B8 there). Verified on Galaxy `origin/dev` 7761eeb3256 with pinned `pulsar-galaxy-lib==0.16.0`.

## Bug (B15)

`lib/galaxy/jobs/runners/pulsar.py`:

```python
def input_path_rewrite(self, dataset):            # 1430-1437
    ...
    remote_path = self.path_mapper.remote_input_path_rewrite(local_input_path)
    return remote_path                            # None for non-staging actions

def input_extra_files_rewrite(self, dataset):     # 1448-1452
    input_path_rewrite = self.input_path_rewrite(dataset)
    remote_extra_files_path_rewrite = dataset_path_to_extra_path(input_path_rewrite)   # None[0:-4] -> TypeError
    self.path_rewrites_input_extra[dataset.extra_files_path] = remote_extra_files_path_rewrite
    return remote_extra_files_path_rewrite

def output_extra_files_rewrite(self, dataset):    # 1454-1457, same shape
```

- Pulsar's `PathMapper.remote_input_path_rewrite` returns `action.path_rewrite(...)` for non-staging actions. `NoneAction.path_rewrite` returns `None` (`pulsar/client/action_mapper.py:396-397`), and `RewriteAction.path_rewrite` returns `None` when the path doesn't change (434).
- `dataset_path_to_extra_path` (`lib/galaxy/job_execution/compute_environment.py:15-17`) slices `path[0:-len(".dat")]`, which raises `TypeError: 'NoneType' object is not subscriptable`.
- Callers already treat `None` from `input_path_rewrite` as "use the local path": `tools/runtime.py:91` does `rewrite or dataset.get_file_name()`. The extra-files hooks don't.

**Triggers.** Any Pulsar destination with `rewrite_parameters: true` (the REST, MQ and embedded defaults) where inputs or outputs map to `none` or a no-op `rewrite`:
- `default_file_action: none`, as in the sample "secure" REST destination;
- a per-path `none` rule for the shared file store.

Tool constructs that crash:
- `$input.extra_files_path` / `$input.files_path` (`tools/wrappers.py:550-558`);
- the same on outputs, e.g. composite outputs;
- Directory-datatype inputs (`tools/runtime.py:84`);
- Directory-datatype outputs (`tools/runtime.py:74`, which calls the rewrite *before* its `or dataset.extra_files_path` fallback; added 2026-10-09 in 3a5adbf474d);
- data-manager bundle extra-files (`tools/wrappers.py:260`).

The job fails during command building.

**Reproduction.** Unit test against dev, building a real `PulsarComputeEnvironment` with a mocked job wrapper and client `default_file_action="none"`:

```
input_path_rewrite(none): None
input_extra_files_rewrite(none): TypeError 'NoneType' object is not subscriptable
input_extra_files_rewrite(transfer): /pulsar/1/inputs/dataset_1_files
```

(`output_extra_files_rewrite` raises the same way.)

**Test gap.** `test/integration/test_pulsar_embedded_none.py` (added for #21566, "Pulsar Job errors on setting default file action to none", closed 2026-01-20) runs only the `simple_constructs` and `job_properties` framework tools. Neither touches extra files. Adding `composite_output_tests` or a Directory-datatype tool should go red.

**Fix direction.** When the primary rewrite is `None`, return `None` from both extra-files hooks, or the local `dataset.extra_files_path`. Then make every caller fall back to the local extra-files path, the way `runtime.py:91` does for the primary path. Don't record anything in `path_rewrites_input_extra` in that case; with `none` there's nothing to stage. Also reorder the `or` fallback in `runtime.py:74`.

## Rolled in: sample job_conf file-action docs (B8)

`lib/galaxy/config/sample/job_conf.sample.yml` at dev 7761eeb:
- **:925** lists the valid `default_file_action` values and includes `http`, which doesn't exist. Pulsar raises "Unknown Pulsar default file action type". The list also omits `rewrite`, `remote_transfer_tus`, `remote_object_store_copy`, `remote_rsync_transfer` and `remote_scp_transfer` (full list: `pulsar/client/action_mapper.py` `actions` / `DICTIFIABLE_ACTION_CLASSES`).
- **:914-922** say "Uncomment the following statement to disable file staging", but `default_file_action: none` is already uncommented in that "secure" REST example. Admins copying it silently get the shared-filesystem assumption, which is exactly the configuration that hits B15.
- **:265** has the typo `galaxy_infrastructure_url1`.

These belong together: the sample config steers admins into `none`, and `none` then crashes on extra files.

## Notes

- Not a security issue.
- Labels likely: kind/bug, area/jobs (Pulsar runner), area/configuration.
