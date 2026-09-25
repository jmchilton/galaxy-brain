# Convert update options before creating embedded subworkflows

An embedded child is created through `build_workflow_from_raw_description`, which requires `WorkflowCreateOptions` and reads its `.publish` field, but the update path was forwarding `WorkflowUpdateOptions` directly.

Type the creation boundary and thread the creation/update union through the shared workflow and subworkflow loaders. At the embedded-child boundary, retain an existing creation-options object unchanged; for update options, construct child-creation options preserving `fill_defaults`, `from_tool_form`, and `exact_tools`, while keeping child publication private by default and the existing `hidden=True` behavior.

Replace the untyped archive-source attribute probe with explicit creation-options narrowing, and correct the workflow provenance annotation to allow the `None` values already stored for optional TRS fields; neither change alters the stored provenance or requires a migration.

No casts, type-ignore suppressions, mock objects, or API tests are added. The evidence does not depend on deciding whether a particular workflow payload is valid.

## Typing red/green

With the creation/update parameter annotations but the original forwarding call, repository-configured mypy reports a single `[arg-type]` error: the embedded builder passes `WorkflowCreateOptions | WorkflowUpdateOptions` where `WorkflowCreateOptions` is required.

With the explicit conversion, focused mypy passes for the manager, ORM model, workflow API controller, WES service, and workflows service.

From `lib/`, using an environment with Galaxy's mypy requirements:

```sh
python -m mypy --follow-imports=silent \
  galaxy/managers/workflows.py \
  galaxy/model/__init__.py \
  galaxy/webapps/galaxy/api/workflows.py \
  galaxy/webapps/galaxy/services/wes.py \
  galaxy/webapps/galaxy/services/workflows.py
```

Restoring only the unsafe third argument in a temporary mypy shadow copy of the final manager also reproduces the error, keeping all the new types and the provenance correction intact; this checks that the runtime fix, not removing types or weakening checks, is what makes the path green.

Black, isort, Ruff, all commit hooks, and a real module-import smoke check pass. No API or unit tests were used as the red/green metric.

Branch: `embedded_subworkflow_update_options`, based on freshly fetched `origin/dev` at `9f5009fc4c54f28fb9e87646ddccbc6ccdef714a`, independent of the annotation-index branch for #23579.

Pushed to [jmchilton/embedded_subworkflow_update_options](https://github.com/jmchilton/galaxy/tree/embedded_subworkflow_update_options) at `aa5855d65a66e810b6a20ee6cd7aab39f308734b`; no PR opened.
