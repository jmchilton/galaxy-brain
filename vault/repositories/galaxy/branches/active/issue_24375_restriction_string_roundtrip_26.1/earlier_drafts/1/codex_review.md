Run via gpt-6.1-sol at none effort.

# Codex review

Codex reported no findings, so I made no changes.

The first run produced nothing. Codex's read-only sandbox couldn't start any command (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`), so it read no code and returned an empty, uninformative result. For the second run I put the diff (`upstream/release_26.1...c3bf15ffc76`), the whole of `workflow_parameter_input_definitions.py` and `InputParameterModule` from `modules.py` into the prompt. The brief held only the issue's description of the intended behavior.

Not acted on: nothing; there were no findings.

<details>
<summary>Full output (run 2)</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/workflow/modules.py",
      "lib/galaxy/workflow/workflow_parameter_input_definitions.py",
      "lib/galaxy_test/api/test_workflows.py",
      "test/unit/workflows/test_modules.py"
    ],
    "notes": "Reviewed the supplied diff and surrounding source only. Tests were not run because shell commands are unavailable."
  },
  "findings": []
}
```

</details>
