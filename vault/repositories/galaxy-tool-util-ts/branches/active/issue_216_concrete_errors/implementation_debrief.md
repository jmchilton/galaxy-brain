# Implementation debrief

Issue: [#216](https://github.com/jmchilton/galaxy-tool-util-ts/issues/216). Base: `origin/main` `f5470fe5`.

**Root cause verified.** `isConcreteOk` and `concreteErrorCount` count failures that live only in `concrete.tool_state.results[]` and `concrete.connection_report`, and nothing rolled them up. `tool_state` numbers format2 `steps` positions while `connection_report` numbers the native form, where inputs come first. Reproduced with the issue's workflow through the built CLI: same step, `0` and `1`.

**What changed, as the issue proposed:**

- `ValidationStepResult.label`, optional, `outer/inner` inside a subworkflow, set in all four walkers (effect and json-schema, native and format2).
- `SingleDraftValidationReport.concrete_errors`, built in `buildSingleDraftValidationReport`. Existing fields, `summary` and exit codes are unchanged.
- `label` stays out of gxwf-web's `openapi.json`, as the issue allows.

**Decisions the issue didn't spell out:**

- Format2 walkers use `nativeStepLabel`, not `step.label`. `connection_report` gets labels through it, so a list-form step's non-numeric `id` counts as its label and `_unlabeled_*` sentinels don't. Using `step.label` would have kept the reports disagreeing.
- Any unlabelled level nulls the whole label. `inner` alone could be mistaken for a top-level step, and `outer` alone would name the wrong step.
- Connection messages are prefixed with the target input (`input_list: Incompatible types: ...`), since the validator's text doesn't say which input and a step can have several. The source isn't included because its step number is the native numbering.
- Strict-state messages read `skipped (<status>): <reason>`.
- `concrete_errors` is absent when `concrete` is, including when draft structure errors stop the concrete pass; `structure_errors` explains those. A skipped pass (`ok: null`) gives `[]`.
- `label: ""` now counts as unlabelled in `connection_report` too, from the normal review. It first went in the graph builder, which broke edge annotations; polish moved it to `report-builder.ts` (`0756cf04`).

**Local gate:** lint, format, typecheck, knip and build green. Full vitest: 3 failures, and the same 3 fail on an unmodified `origin/main` checkout (`validate_legacy_encoding_skipped_2`, `validate_iwc_repeatmasking_stale_rejected`, `disconnected-optional-runtime`). The gxwf-e2e Playwright specs also error at vitest collection; they are unrelated to this branch and not comparable under vitest. `make check` stops at `verify-test-format-schema` under Node 26, the recipe failure the #212 record notes; this branch touches no synced schema.

**Red to green:** new tests failed on the base for the missing fields. The empty-label test was confirmed red with its fix reverted.

**Open for John:**

- Entries for unlabelled steps can't be told apart, since there's no `step`. Matches the issue, but it matters for `.ga` subworkflows.
- `failures[]` in `validate-tree --json` still has only the positional step.
