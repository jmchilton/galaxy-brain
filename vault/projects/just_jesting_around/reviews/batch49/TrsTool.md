# TrsTool — readability batch 49

Originating file: `client/src/components/Workflow/Import/TrsTool.test.ts`.
Base: `e1f3ed5dce2da8ccd93324fd6b536db3269a8810`.

## Changes and assertion audit

Named the complete registry-tool fixture and checked it with `satisfies TrsTool`. Removed the component's `as object` cast and replaced legacy `localVue`/`propsData` mounting with native `global`/`props`. Kept full mounting so the original production coverage remains. Used the existing `nth` helper to inspect the last sanitizer call with a clear missing-call failure, replacing the non-null assertion.

All four original assertions remain: the links profile, the markdown link with its target, escaped raw markup, and rendered sanitizer marker. Added an explicit single-call assertion so the existing HTML/profile checks cannot silently inspect an unrelated extra call.

The original test modified the shared sanitizer mock implementation and left its wrapper mounted. Setup now clears previous calls and installs the marker implementation; teardown resets calls and restores the implementation captured before the suite. Auto-unmount is registered after the restoration hook because Vitest runs afterEach hooks in reverse order, so the wrapper unmounts while its sanitizer remains installed even after a failed assertion.

## Validation

- Baseline and final: 1 test, no skips. Final shuffled seed 490101, maxWorkers 1, pinned node.
- V8 coverage: 15 source files at both revisions; no previously covered statement, function, or branch location lost. TrsTool covered counts remain 19 statements, 5 functions, 14 branches.
- ESLint, Prettier, whitespace diff check, and explicit canonical pre-commit configuration passed.
- Logs: `/private/tmp/readability49-trs-{baseline,final}.log`; coverage directories use the same prefix with `-coverage`; comparison `/private/tmp/readability49-trs-coverage-comparison.json`.

## Guidance and reuse evidence

README guidance covers native mounting and generic mock cleanup. A possible marginal addition is sanitizer lifecycle guidance: preserve/restore the globally mocked sanitizer's original implementation and register cleanup hooks so unmount happens before restoring it. `WorkflowHelpDisplay.test.ts` and `NodeInvocationText.test.ts` also override this shared sanitizer with marker HTML without wrapper or implementation cleanup. `LibraryEditField.test.js` preserves its original implementation, but registers auto-unmount before its restore hook, so reverse hook order restores before unmount. These are evidence for advice, not supporting edits in this originating-file commit. Existing VTU and mock APIs suffice; no shared helper is needed.

No production, shared, supporting, or later-lane files changed. No security findings.

Driver-authorized follow-through applies this same lifecycle to three eligible supporting consumers: WorkflowHelpDisplay, NodeInvocationText, and LibraryEditField. The first two gain failure-safe restoration and auto-unmount; Library's restoration moves to the same hook scope as auto-unmount and registers before it. Supporting assertion sets remain unchanged, no helper is introduced, and no supporting ledger counters advance. See `SanitizerLifecycle.md` for independent validation and commit evidence.
