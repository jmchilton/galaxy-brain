# Batch 47 — AuthoringHelpPanel

Originator: `client/src/components/Tool/AuthoringHelpPanel.test.ts`.
Base: `e1570742723b0ea164652d6d40f417a53bf4de27`.
Commit: `244436c5df5` (full SHA available from the worker checkout).
No production files or supporting tests changed. The ledger entry has no downstream lane flags.

## Changes and reuse

Retained all eight scenarios, including the sequential output and validator nesting scenarios and both legitimate calls to the exposed editor hover API. The exposed API now uses `Pick<InstanceType<typeof AuthoringHelpPanel>, "openSection">`, without component/object/unknown casts. Awaiting `openSection` itself waits for its DOM update.

Reused `getLocalVue` and `withPlugins` for native VTU2 `global` mount options and a fresh test Pinia. Added local section/toggle selectors and a native cancelable link-event helper, which returns the event so navigation prevention remains asserted in each scenario. The helpers have only this concrete consumer, so no shared extraction is proposed. Persistent sections use `get` to fail clearly if missing; existence/absence assertions remain explicit.

Registered `enableAutoUnmount(afterEach)` before fixture cleanup, retained body attachment for happy-dom computed visibility, and restore the original navigator clipboard property descriptor (or remove the test property when originally absent). Auto-unmount now exercises the component's native event-listener teardown and Popper cleanup.

## Assertion preservation map

All 57 original assertions remain; the rewrite has 61 assertions. Every row below lists all original assertions, in original order. Scenario names identify their corresponding final tests.

| Original assertion numbers | Final scenario | Preserved assertions |
| --- | --- | --- |
| 1–15 | expands and collapses quick start, then renders tool definition reference content | Reference text; Common questions text; quick-start aria-expanded false; no help body; after expansion aria-expanded true; help body exists; YAML highlight class exists; highlighted attribute markup exists; Example label; after collapse aria-expanded false; body absent again; Field/Details/Required headers; container image link text; command line link text; dashed container-link decoration. |
| 16 | copies the displayed quick-start example to the clipboard | Clipboard write receives the actual displayed example code text. |
| 17–22 | opens the nested boolean parameter section from its index link | Boolean section initially invisible; index link exists; link has no target; section remains invisible after opening parameter index; native link click reveals section; nested-section class exists. Added defaultPrevented assertion. |
| 23–25 | shows defaults and shell command usage for parameter types | Field/Details/Default/Required headers; shell_command usage introduction; exact include_header substitution example. Kept programmatic openSection action and added its successful boolean result assertion. |
| 26–38 | nests output types under outputs | Data output initially invisible; format source initially invisible; outputs index has data-output link; data output has nested class; data output remains invisible with outputs open; output type reference reveals data output; from_work_dir text; result.txt text; format-source link exists; format-source section visible with data output open; margin-left 2rem; native link click shows format_source: reads example; format-source toggle expanded true. Added defaultPrevented assertion for format-source link. |
| 39–46 | nests validator types under input parameters | Validators initially invisible; regex initially invisible; opening parameters reveals validators; regex remains invisible; validators index contains regex link; regex remains invisible with validators open; validator type reference reveals regex section; expanding regex renders ^[ACGT]+$ text. |
| 47–53 | expands structured fields linked from the tool definition | Outputs link exists; outputs initially collapsed; native outputs link prevents default; outputs expanded; outputs help body exists; data output still invisible; native data-output link reveals its section. Added defaultPrevented assertion for data-output link. |
| 54–57 | opens a section programmatically for editor hover links | Data output initially collapsed; exposed openSection("output-data") resolves true; data-output toggle expanded; data-output section visible. Retains actual public API invocation rather than replacing it with clicking. |

## Verification

Baseline: 1 file / 8 tests pass, before edits. Final: 1 file / 8 tests pass. Final shuffled run with seed `470101`: 1 file / 8 tests pass, exit 0 with no unhandled errors. ESLint, Prettier, `git diff --check`, and explicit pre-commit checks pass.

Coverage artifacts:

- Baseline JSON: `/private/tmp/readability47-authoring-baseline-coverage/coverage-final.json`.
- Final shuffled JSON: `/private/tmp/readability47-authoring-final-coverage/coverage-final.json`.
- Logs: `/private/tmp/readability47-authoring-baseline.log`, `/private/tmp/readability47-authoring-final.log`, `/private/tmp/readability47-authoring-shuffled.log`, `/private/tmp/readability47-authoring-precommit.log`.

Both coverage artifacts contain the same 54 source files. No covered statement/function/branch counts decline, and no previously covered location becomes uncovered. AuthoringHelpPanel statements improve from 55/60 to 57/60, functions from 21/22 to 22/22; branches stay 23/27. Popper/usePopper statements improve from 30/67 to 36/67 and functions from 4/14 to 6/14; all other source totals are unchanged.

Worker `vue-tsc --noEmit --pretty false` exits 2 with three unrelated TS7006 diagnostics and no errors in the edited test: History/HistoryCardList.vue(212,30), parameter newName; TagsMultiselect/StatelessTags.vue(142,30), parameter x; Workflow/List/WorkflowCardList.vue(132,30), parameter newName. Full log: `/private/tmp/readability47-authoring-typecheck.log`. Parent will run the canonical batch type check.

The initial sandboxed baseline attempt failed on Vite's temporary cache in the shared node_modules symlink. An authorized escalated run produced the passing baseline before edits; final checks used the same dependency setup.

## Guidance and bugs

No new guidance proposed. Existing guidance covers local setup helpers, scenario naming, cleanup, and awaiting the public operation. Its “test through the template when possible” qualification leaves room for this explicitly exposed editor API, whose programmatic contract cannot be verified solely through clicks. No production bug found. No broad shared abstraction has a second concrete consumer here.
