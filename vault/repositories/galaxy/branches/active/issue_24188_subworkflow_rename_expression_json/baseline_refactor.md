# Baseline refactor

I moved the `expression_json_hda` unit-test helper from `test_modules.py` into `test/unit/workflows/workflow_support.py`, as the first commit on the base.

History, rebuilt from 5 commits to 3. The final tree is identical to the old head `6d93b8450ed`:
1. `ef6b194298e` Move expression.json HDA unit test helper to workflow_support. Pure test refactor; the base unit suite still passes (121 passed).
2. `6995d1f0c6f` Resolve expression.json values used as subworkflow replacement parameters. The one-line `set_outputs_for_input` fix, the framework workflow test and both API tests, including the `_invocation_output_collection` helper. The helper has no other callers yet, so it stays with the tests.
3. `5ce3acf579c` Delay subworkflow step until expression.json parameter inputs are readable. The `subworkflow_progress` pre-read plus two unit tests (123 passed).

Done directly, not by subagent, given the size.
