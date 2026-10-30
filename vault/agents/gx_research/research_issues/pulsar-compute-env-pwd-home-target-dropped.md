# PulsarComputeEnvironment drops the `pwd` home/tmp target, so non-XML tools get no HOME on Pulsar

- Area: lib/galaxy/jobs/runners/pulsar.py
- Found while: [[Component - Pulsar Input Staging]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`PulsarComputeEnvironment._target_to_directory` (`jobs/runners/pulsar.py:1526-1539`):

```python
elif target == "pwd":
    os.path.join(self.working_directory(), "working")
```

The branch computes the path and discards it, so the method returns `None`. The local equivalent, `JobWrapper._target_to_directory` (`jobs/__init__.py:2792-2793`), returns it. Commit `e7c5543c5d0` (2023, "Fix pulsar error when home_target is pwd") added the branch to stop an `Unknown target type` exception but left out the `return`.

`ToolSource.parse_home_target` defaults to `"pwd"` (`tool_util/parser/interface.py:266-268`). Only the XML parser overrides it (`xml.py:302`), so YAML/CWL-style tool sources hit this path. `ToolEvaluator` sets `HOME` only when `home_directory()` is truthy (`tools/evaluation.py:918`). Under a Pulsar destination with `rewrite_parameters: true`, those tools therefore run with whatever `HOME` the remote environment has, not `<remote job dir>/working` as on local runners. A `tmp_target` of `pwd` behaves the same way.

## Evidence / repro

- Read in code. No unit test covers `PulsarComputeEnvironment.home_directory()`/`tmp_directory()`.

## Suggested fix

Add `return`. Also check that `self.working_directory()` (the remote `working_directory`) is the intended base, since the local version joins `working` onto the job directory rather than the tool working directory. Add a unit test that checks the `pwd` target under `PulsarComputeEnvironment`.
