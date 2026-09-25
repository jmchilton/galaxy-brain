Fixes #1693.

## Summary

`workflow_lint --iwc --fail_level error` currently succeeds when Planemo cannot discover any tests for a workflow because the missing-test diagnostic is only a warning. This is weaker than the other IWC repository checks and allows an untested workflow to pass the IWC profile.

This change makes `Workflow missing test cases.` an error when the IWC profile is active. Outside `--iwc`, the diagnostic remains a warning and the existing default behavior is unchanged.

## Tests

The fail-level test now verifies all three relevant outcomes:

- missing tests fail at the default warning fail level;
- missing tests still pass at `--fail_level error` outside the IWC profile; and
- missing tests fail as an error under `--iwc --fail_level error`.

```text
pytest -q tests/test_cmd_workflow_lint.py
22 passed
```
