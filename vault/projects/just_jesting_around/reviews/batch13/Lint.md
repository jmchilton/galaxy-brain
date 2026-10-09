# Lint: accepted

Originator: `client/src/components/Workflow/Editor/Lint.test.ts`. Cases: **3 → 3**, all passing, no skips.

A local mount helper deep-clones the historical lint fixture for each scenario, provides an explicit testing Pinia through existing `withPlugins()`, and returns the mounted component and its real-action step store. Mount auto-unmounts; the directly called lint composable runs in an effect scope stopped after every test. Step registration uses forEach rather than an ignored map result. The count case waits for the real Pinia change to render; the removal case uses Vue nextTick directly instead of wrapper.vm. Names now describe the actual retained autofix actions.

All meaningful original checks remain: four passing sections, five warning sections, at least four autofix links, first four link texts in original order (untyped_parameter, input_label, missing annotation, output); exactly one readme attribute link; autofix link presence; one onRefactor emission containing untyped parameter extraction/name, input extraction, and unlabeled-output removal. Both original refactor scenarios remain separately, including removal of step0 before clicking in the second. The test no longer claims a connect-input action that its assertions never checked. Full mount is retained because rendered LintSection/link content is part of the original contract.

One first local validation failed because proper explicit Pinia installation makes the freshly added steps render on the next tick. Awaiting nextTick before the section counts fixes setup timing without changing expected counts or production.

Reuse: existing withPlugins/emittedArg/nth helpers applied. The historical fixture intentionally contains incomplete step data, including outputs shaped differently from current typed steps, so its documented JSON-boundary cast remains. Rebuilding it with createTestStep would silently fill missing fields relevant to linting. Other workflow tests need different metadata and warning shapes; the short mount helper stays local. No supporting edits or new best-practice advice.

Validation: the selected baseline is `/private/tmp/jest_readability_batch13_baseline.json`. The final assigned-suite run in `/private/tmp/jest_readability_batch13_history_final.json` passes all **75 cases across five suites**, with shuffled seed `130059`, no skips or failures. Scoped current ESLint (zero warnings) and Prettier pass. Full client typechecking and independent reviews are owned by the driver. No production changes.
