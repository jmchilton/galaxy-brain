# Step validation: replace positional `service`/`checks` threading with a context object

`validate-workflow.ts` and `validate-workflow-json-schema.ts` thread per-run settings (`cache`, `service`, `expansionOpts`, and now `checks: StepStateChecks`) positionally through ~12 functions each, every one defaulting `checks = {}`. Callers that lack a service pass `undefined` positionally (lint, validate-tree, draft-validate). The two files also mirror each other's native/format2/embedded/subworkflow dispatch almost line for line.

Proposal:
- Introduce `StepValidationContext { cache, service?, checks, prefix }` and pass it as one argument through both validators; drop per-function defaults.
- Factor the shared step dispatch (subworkflow recursion, embedded vs tool_id resolution, per-step result) into one walker parameterized by a "validate state" strategy (Effect vs AJV), so the json-schema path stops duplicating it.
- Public `validateNativeSteps`/`validateFormat2Steps` take `(data, ctx, expansionOpts?)`; update gxwf-web callers.

Out of scope for #202: touches every validator signature and gxwf-web call sites; behavior unchanged.
