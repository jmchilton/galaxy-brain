- `kind/bug` — installed tool reported missing; valid workflow can't be invoked via API
- `area/workflows` — invocation pre-flight in `WorkflowsService._check_workflow_tools`
- `area/API` — only the API default (`require_exact_tool_versions=True`) hits it; UI sends `False`

`area/tool-framework` is arguable (toolbox `exact` semantics), but the proposed fix lives in the workflow service.
