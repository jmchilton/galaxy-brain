# Raw: Pulsar runner drops `home_target: pwd`

Found by gx_research while writing `vault/research/Component - Pulsar Input Staging.md` (bug B6 there). Verified on Galaxy `origin/dev` 7761eeb3256.

## Bug

`lib/galaxy/jobs/runners/pulsar.py:1526-1539`:

```python
def _target_to_directory(self, target):
    ...
    elif target == "job_home":
        return "$_GALAXY_JOB_HOME_DIR"
    elif target == "pwd":
        os.path.join(self.working_directory(), "working")   # no return -> None
    else:
        raise Exception(f"Unknown target type [{target}]")
```

- `home_directory()` (1520-1521) and `tmp_directory()` (1523-1524) both go through this. `tmp_target: pwd` is also valid (`tool_util/parser/interface.py:263-265`).
- `"pwd"` is the **default `home_target` for every non-XML tool source**: `ToolSource.parse_home_target` returns `"pwd"` (`lib/galaxy/tool_util/parser/interface.py:259-261`). Only the XML parser overrides it, based on profile (`xml.py:302-308`). This covers YAML tools, CWL tools and user-defined tools.
- `tools/evaluation.py:907-909` sets `HOME` only `if home_dir := self.compute_environment.home_directory()`. On Pulsar with `rewrite_parameters: true`, those tools run with whatever `HOME` the Pulsar job inherits: the Pulsar service user's home, or unset under some batch systems. They don't get an isolated per-job home. Tools that write caches or config into `~` can collide across jobs or fail on read-only homes.
- Compare the local job wrapper, `lib/galaxy/jobs/__init__.py:2779-2793`: `elif target == "pwd": return os.path.join(working_directory, "working")`.

## History

`df3e18c72a9` (2023-04-07), "Fix pulsar error when when home_target is pwd", added the `pwd` branch to stop the `Unknown target type` exception. The `return` was missing from the start, so the "fix" turned a crash into a silent `None`. `test/integration/test_pulsar_embedded.py` got one line in that commit and presumably doesn't assert `HOME`.

## Reproduction

Unit test on dev with a real `PulsarComputeEnvironment` (mocked wrapper, `job_wrapper.home_target` set):

```
home_directory: {'pwd': None, 'job_home': '$_GALAXY_JOB_HOME_DIR'}
```

## Fix direction

Careful: adding `return` to the existing expression is probably wrong.
- Locally, `working_directory` is the **job** directory, and `working/` under it is the tool's working dir.
- In `PulsarComputeEnvironment`, `self.working_directory()` returns `remote_job_config["working_directory"]`. That is already Pulsar's tool working dir (`pulsar/managers/base/directory.py:291`: `self.job_directory(job_id).working_directory()`, and `JOB_DIRECTORY_WORKING = "working"`).
- So `os.path.join(..., "working")` would give `<job>/working/working`. The right value is most likely `return self.working_directory()`.

Add a test that asserts `HOME` for a YAML tool (or an XML tool with `home_target` resolving to `pwd`) under embedded Pulsar.

## Notes

- Not a security issue.
- Labels likely: kind/bug, area/jobs.
