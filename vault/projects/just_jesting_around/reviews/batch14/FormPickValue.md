# Pick-value workflow form

Originator: `client/src/components/Workflow/Editor/Forms/FormPickValue.test.ts`. Cases: **10 → 10**.

Make the existing local Step factory satisfy Step directly, remove the component `any` cast, retain the precise `EmittedState` cast at the untyped event-payload boundary, create local plugins per mount, and auto-unmount wrappers. Keep the exact connection maps visible beside their prop update and assertions. A spare-terminal comment now states the indexing convention directly.

Preserved empty tool-state defaults, existing all_non_null/three-input mode, the_only_non_null/two-input and all_non_null/five-input mode events, last input_2 connection growth, non-last input_2 connection with unchanged emission count, compaction preserving the former input_2 source ID3 under input_1, the minimum two-input floor, undo restoring three connections, and JSON-string mode/count decoding with four connections. Stubbed FormElement input events remain the child component contract under shallowMount; no internal parent method is invoked. Every original expected value and action remains.

Reuse: retain the short pick-value-specific factory and `emittedArg` helper. Existing workflow summary factories do not model editor Steps; JSON workflow fixtures have incompatible sparse states. A shared Step factory has no proven consumer needing these pick-value defaults in this batch, so no abstraction or supporting edits are added. Existing guidance already covers typed setup, child events and cleanup; no new guidance or marginal advice proposed.

Validation: all four owned suites pass **27/27**, with zero skips under shuffled seed `140041` (`/private/tmp/batch14_graph_tests.json`). Scoped ESLint, Prettier, and whitespace checks pass. The driver performs full-client typechecking and combined batch validation.
