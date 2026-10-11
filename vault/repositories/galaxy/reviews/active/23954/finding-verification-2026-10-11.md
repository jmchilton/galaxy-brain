# Independent finding verification — 2026-10-11

Verdict: **agree with the P2**, scoped to extraction of successfully invoked, existing saved workflows with an expression-connected conditional select discriminator. Delivery remains **unposted**.

Reviewed HEAD: `9008c8cb17c8fc4116e3afca7da707655349812d`. Exact parent control: `b18269a10f84fc520aebee84d24fb7b409c4852a`.

## Independent source validity check

The original probe directly inserted a persisted connection. That alone was insufficient to demonstrate an ordinary historical workflow. The independent [API probe](test_independent_selector_verification.py) instead uploads the connection through the normal workflow API:

```yaml
consume:
  tool_id: output_filter_exception_1
  in:
    options|options: parse/text_param
  state:
    options:
      options: default
```

During upload only, the probe skips the `ToolModule.add_dummy_datasets` call receiving `ConnectedInputName` objects. This restores the importer behavior before commit `c0d329d5cb329b18d5530c9c68ec51e11af615ac` (2026-09-28), whose actual diff adds that marker-on-import call immediately before saving the module. The normal API still parses state, constructs and persists every edge, and orders the steps. The probe performs **no database insertions or edits**. It checks that the API-persisted consumer contains the concrete selector `{"__current_case__": 0, "options": "default"}` and the actual `parse/text_param -> consume/options|options` edge.

After restoring the current importer behavior, the workflow runs through the current invocation API with the existing `allow_tool_state_corrections=true` compatibility option. `param_value_from_file` receives a dataset containing `default`. Every job finishes `ok`; the actual consumer job records the concrete selector above and retains invocation provenance pointing to the connected workflow step.

This establishes an ordinary pre-marker-import workflow representation and a successful source invocation, rather than an arbitrary database edge. It does **not** establish that newly importing a connected select discriminator works at HEAD, nor that arbitrary changes to conditional branches work during invocation. Those are separate limitations; neither is necessary for this extraction regression.

## Exact parent comparison and cause

On the **same successful invocation**, both real extraction endpoints return HTTP 500 at HEAD. The probe then loads `lib/galaxy/workflow/extract.py` directly from the exact parent Git object and temporarily substitutes its `extract_steps` and `extract_steps_by_ids` implementations. Both endpoints return HTTP 200 with those exact pre-PR implementations. The probe restores all replacements afterwards.

| Endpoint | HEAD | Exact parent extraction |
| --- | --- | --- |
| `POST /api/workflows` with `from_history_id` | 500 | 200 |
| `POST /api/workflows/extract` with `hda_ids` | 500 | 200 |

The root cause is the added `return ConnectedValue()` and subsequent traversal/serialization at `lib/galaxy/workflow/extract.py:174–177`. The visitor replaces the concrete select discriminator, recomputes `__current_case__` as `-1` because no option matches the marker, and skips the branch traversal. `Conditional.value_to_basic` then calls `get_current_case` on the marker again instead of preserving the recorded branch. Both API tracebacks end with `ValueError: ('No case matched value:', 'options', '<...ConnectedValue object ...>')`.

The current PR conditional unit fixture keeps its discriminator literal and connects only its child text parameter, so it does not cover this trigger. Preserve the recorded conditional branch while restoring the discriminator edge, and add a regression connecting the selector itself.

## Validation and limitations

Used the `jmchilton:galaxy-backend-tests` skill, the shared Galaxy virtualenv, the three prescribed configuration overrides, and the actual embedded API server. The focused probe **passed: 1 passed in 31.04s**, asserting the reproduced HEAD failures and exact parent successes. An initial probe attempt stopped after successful API upload because its assertion incorrectly treated persisted `tool_inputs['options']` as a JSON string; correcting the assertion to the actual dict representation yielded the decisive run. That first attempt supplies no regression result.

Re-run from the PR worktree:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=lib \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
/Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest \
-p galaxy_test.conftest -p no:cacheprovider \
/Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/reviews/active/23954/test_independent_selector_verification.py \
-s --tb=short --html=/tmp/galaxy-23954-independent-verification.html
```

Full local temporary logs/report: `/tmp/galaxy-23954-independent-verification.log` and `/tmp/galaxy-23954-independent-verification.html`. The sanitized comparison is [retained here](independent-verification-output.txt). `git status --short` was empty and `git diff --check` passed in the Galaxy worktree. No Galaxy source changes, commits, pushes, queue changes or GitHub posts were performed.

## Risks

The demonstrated risk is loss of extraction availability for these existing successful histories. The underlying code is reversible; workflow artifacts produced by the broader reconnection change persist beyond a rollback. This probe establishes the HTTP failure and its cause, not downstream artifact corruption or changes to original jobs.

The [single proposed comment](single-comment.md) reflects this narrow verified case.
