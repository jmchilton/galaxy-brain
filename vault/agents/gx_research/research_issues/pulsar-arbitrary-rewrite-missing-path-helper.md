# Pulsar `PathMapper.check_for_arbitrary_rewrite` calls `unstructured_map()` without its required argument

- Area: Pulsar `pulsar/client/path_mapper.py` (consumed by Galaxy's `PulsarComputeEnvironment.unstructured_path_rewrite`)
- Found while: [[Component - Pulsar Input Staging]]
- Galaxy SHA: 65e6daff (pins `pulsar-galaxy-lib==0.16.0`); Pulsar `master` @ 827ece21 also affected
- Severity: low (fires only with a staging rule for `unstructured` paths)

## Problem

`PathMapper.check_for_arbitrary_rewrite` (`pulsar/client/path_mapper.py:66-74`, 0.16.0):

```python
action = self.action_mapper.action({"path": path}, path_type.UNSTRUCTURED)
if not action.staging_needed:
    return action.path_rewrite(self.path_helper), []
unique_names = action.unstructured_map()
```

`BaseAction.unstructured_map(self, path_helper)` (`action_mapper.py:323`) requires `path_helper`. The only other caller, `FileStager.__initialize_referenced_arbitrary_files` (`staging/up.py:238`), passes it. The staging branch therefore raises `TypeError`.

Galaxy reaches it with `rewrite_parameters: true`. `SelectToolParameterWrapper` path attributes (data-table/`.loc` paths, `tools/wrappers.py:242`) call `PulsarComputeEnvironment.unstructured_path_rewrite` → `check_for_arbitrary_rewrite`. Any `file_actions` rule whose `path_types` includes `unstructured` (or `*any*`) with a staging action (`transfer`, `remote_transfer`, ...) takes the broken branch. Job preparation then fails.

The non-staging branch also returns `[]` as the "new rewrites" value where a dict is expected. That works only because `dict.update([])` is a no-op.

## Evidence / repro

- Read in code at 0.16.0 and on Pulsar `master` (827ece21). Galaxy's tests use a fake compute environment for unstructured rewrites (`test/unit/app/tools/test_evaluation.py:286`), and Pulsar has no test of `check_for_arbitrary_rewrite` with a staging action.

## Suggested fix

Pass `self.path_helper`, return `{}` in the non-staging branch, and add a Pulsar unit test with an `unstructured` `transfer` rule. Fix it in Pulsar, then bump Galaxy's pin.
