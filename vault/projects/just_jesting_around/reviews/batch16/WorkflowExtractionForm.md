# WorkflowExtractionForm

Selected originator: `client/src/components/History/WorkflowExtractionForm.test.ts`. Baseline and final: **46 tests**.

The form and card wrappers now retain their component types. API output fixtures use a type annotation instead of assertions; the duplicate input obtains its existing output through `nth`. Submitted payloads use the API mock's inferred argument type and `nth` rather than optional access followed by a broad record cast. One shared card lookup and a typed, awaited rename-action helper replace duplicated local lookups/callback casts. This keeps the card event and label visible at each interaction, including the deliberately empty output label. One-use mapped-job and absent-output-name variants sit beside the scenarios that require them; the empty summary and warnings remain visible at their use sites.

Each mount receives a fresh `getLocalVue()` context and all wrappers are automatically unmounted. API mocks reset their implementations before each form scenario and the mutable page query resets to an empty object. The real card clear-title test keeps its testing Pinia, real GCard tree, and GenericHistoryItem stub, with `withPlugins` replacing the default Pinia. No HTTP mock layer is introduced: the existing API/composable boundaries are retained.

Preserved contracts:

- Loading, failed fetch, empty history, card count, input-name initialization, warning propagation, empty/name/all-unchecked submit validation, and rename modal opening/closing.
- Exact encoded submission buckets and workflow name; starred output submission and exclusion for unchecked rows, missing workflow-visible output names, and empty labels.
- The mapped ICJ identifier, duplicate ICJ deduplication, mixed plain/mapped buckets, success toast, failed submission alert and retained list, deferred submission state, and disabled-button guard.
- Duplicate input names and rename collisions; duplicate exposed output labels and successful relabel; internal whitespace normalization and collisions after 255-character truncation, including their disabled reasons.
- Plain/mapped step-label hints, absent/cleared label omission, and collisions with input names.
- Page-summary routing; seeded versus opposite backend checked flags; exposed outputs; seeded-only ordinary/mapped payloads; page ID; warning toast; history-default endpoint routing. The seeded mapped scenario still excludes the unseeded ICJ and ordinary job bucket.
- Seed-warning badge/title presence and absence, plus the real GCard clear-title click emitting exactly one clear-step-label event.

Reuse: existing `nth`, `getLocalVue`, and `withPlugins` remove boilerplate. The extraction jobs belong to this file's specific seeded/input/output contracts; no concrete second consumer justifies a new shared extraction factory. The local card/rename/payload helpers cover repeated interactions without hiding inputs or expected results.

Validation: 52 tests pass across the three owned suites in shuffled order (seed `160063`, `NODE_OPTIONS=--no-webstorage`, two workers). Scoped ESLint, Prettier, and whitespace checks pass. A full client typecheck passed after removing the component/output/payload casts; the driver also validates the final batch together.

Guidance: the existing README already covers scenario locality, existing factories, component boundaries, async waits, and cleanup. No new best practice or unresolved marginal advice is proposed.
