Fixes #1692.

## Summary

`dockstore_init` currently derives names for repositories with multiple workflows by splitting each basename on the substring `.ga`. That leaves the complete extension on gxformat2 workflows and truncates native workflow names such as `my.gadget.ga` to `my`.

This change strips one complete, recognized Galaxy workflow suffix when generating the Dockstore name:

- `alpha.gxwf.yml` becomes `alpha`;
- `beta.gxwf.yaml` becomes `beta`; and
- `my.gadget.ga` becomes `my.gadget`.

Plain `.yml` and `.yaml` basenames are deliberately left unchanged. The single-workflow behavior is also unchanged: its Dockstore name remains `main`.

## Tests

The command test now builds a mixed multi-workflow directory and verifies the exact mapping from every `primaryDescriptorPath` to its generated name, including both gxformat2 suffixes, a `.ga` substring inside a native workflow name, and the unchanged generic YAML cases.

```text
pytest -q tests/test_cmd_dockstore_init.py
5 passed
```
