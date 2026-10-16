# Fresh strengthening review — invocation_completion_action_validation

Reviewed the supplied rebased diff/checklist, current PR description, registry source, implementation evidence and review debriefs. Read-only review; no Git operations or tests run.

No necessary in-scope code development identified. The pitch has a concrete invalid request, baseline HTTP 200 evidence, a distinct HTTP 400/no-history/no-invocation regression, and registered/no-hook positive controls. Additional payload validation, hook execution changes or a generalized preflight mechanism would broaden the agreed fix. No unsupported scope hedge needs a code change; “Toward #20900” accurately describes an independent partial fix.

One small prose task before finalizing: make the audience explicit in the highlighted scope sentence. Suggested replacement:

> ***For invocation API callers, this checks completion-action names before submission creates a history or invocation. Hook configuration, target URIs and execution semantics keep their existing validation.***

Misreadings checked:

- Audience: this fixes API submission feedback, rather than adding a workflow-editor feature or changing hook-author interfaces. The opener/body and request table imply the correct audience, but the existing highlighted sentence only states scope; the replacement names the API audience directly.
- Scope: this does not completely validate hook payloads or fix all invocation-validation cases. The existing highlighted “Only action names are checked here” sentence, Context and “Toward” opener already address this; the replacement retains the boundary.
- Execution: accepting a registered export configuration does not prove an export succeeds. Risk Review Advice states this explicitly; no further change needed.
- Extensions: the guard uses discovered registered names rather than only built-ins. The registry paragraph and risk details address this, supported by the unchanged discovery mechanism and shared singleton wiring.

Keep historical baseline/positive-control evidence distinct from fresh post-rebase results in the final handoff, as the existing draft already intends. No design decision required.
