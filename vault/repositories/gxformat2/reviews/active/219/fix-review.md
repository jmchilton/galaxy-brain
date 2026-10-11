# Independent review of the local PR #219 follow-up

Current disposition after the second local review on 2026-10-11: **the finding below is resolved; no remaining blocker identified in the requested follow-up scope**. The initial finding is retained as review history.

Reviewed 2026-10-11 in `/private/tmp/gxformat2-pr219-review`, branch `fix/draft-parity-review`, relative to PR head `773a20b975704689bd716a566cc8c6ed8017b2f7`. This review covers the initially uncommitted follow-up changes, not later revisions. No code was changed by this reviewer and no review was published.

The stable-ID extraction change and shorthand input-type change address the original findings. Shared semantic checks now catch the original conflict and correctly collect independent issues in concrete and draft subworkflows. There is one new exception-handling issue to resolve before publication.

## P2 — Diagnose malformed nested input schemas before invoking shared semantic helpers

Location: `gxformat2/draft.py`, `_walk_workflow_semantics`, particularly the call to `validate_input_parameter(workflow_input)` and the `except ValueError` handler (approximately lines 455–460 in the initial follow-up).

The top-level `GalaxyWorkflowDraft.model_validate` call does not guarantee that nested `run:` dictionaries match the concrete or draft workflow schema. The generated `WorkflowStep.run` union admits a raw `dict[str, Any]` fallback. The new collector descends those raw dictionaries and passes their input declarations directly into shared semantic helpers, which assume structural validity.

A top-level draft with a nested `run:` of either `class: GalaxyWorkflow` or `class: GalaxyWorkflowDraft`, whose input is `{type: collection, collection_type: sample_sheet, column_definitions: [1]}`, now raises `AttributeError: 'int' object has no attribute 'get'`. An input `{type: collection, collection_type: 1, fields: [{name: a}]}` raises `TypeError: expected string or bytes-like object, got 'int'`. In both cases the outer structural model accepts the raw run dictionary and `structure_errors` is initially empty, so the semantic walker executes. `except ValueError` catches neither exception.

`validate_draft` promises to collect diagnostics rather than raise; malformed input encountered while building a draft must therefore produce a failed result and diagnostics instead of aborting the caller. Validate nested concrete/draft raw documents against their appropriate structural models before using the semantic helpers, or otherwise ensure structural/type failures are converted to diagnostics with the nested path. Cover both concrete and draft nested classes in a regression test.

## Verification

- All three original regression checks plus the two new extraction purity/idempotency cases pass: **5 passed, 49 deselected**.
- Four checks for malformed nested input handling fail with the exceptions above, spanning two malformed input shapes and both nested workflow classes.
- Reproduction script: `/private/tmp/gxformat2-219-fix-reproductions.py`.
- Captured output: `/private/tmp/gxformat2-219-fix-reproductions-output.txt`.
- Reviewed the added shared fixtures, expectation assertions, and purity/idempotency tests. They exercise stable anonymous IDs at both top level and nested level, distinguish shorthand TODO types from structural failures, and collect independent shared invariants with nested paths.
- No further broad tests were run; the coordinator is running the full suite with IWC.

## Second review — shared semantic shape failures are now diagnostics

Reviewed the subsequent changes in `gxformat2/_semantic_validators.py`: non-mapping values, non-string collection types, non-list column definitions, and non-list column restriction/suggestion values now raise `ValueError` that the draft semantic collector already catches. This preserves compatibility with the existing raw input shorthand/aliases while preventing the newly introduced `AttributeError`/`TypeError` cases.

Re-ran both supporting reproduction files against the updated code: **7 passed** in 0.30 seconds. This includes all three original findings and all four malformed nested-input cases. Also inspected the new shared malformed-input fixture and its two expected diagnostic paths (`draft_sub` and `concrete_sub`). No additional broad tests were run and no code was changed by this reviewer.
