# useActiveContext: accepted

Originator: `client/src/composables/useActiveContext.test.ts`. Cases: **35 → 35**, all passing, no skips.

The tool-name mock resets before every case instead of using repeated try/finally blocks. Three tool assertions now match the discriminated context object directly, removing unsafe intersection casts and also checking the tool context type and ID. The existing small route helper and direct calls remain; the composable calculates computed values and needs no mounted component.

All original inputs and assertions remain: unknown/root/upload contexts; tool ID/name/placeholder/version; dataset, workflow editor/run and root workflow ID; job; valid and near-miss history notebook routes; invocation reports with/without page ID; standalone page editor with/without ID; all nine nonempty labels plus null label; and all seven icon mappings. No original route combination was collapsed or replaced.

Reuse: `usePageProposals.test.ts` consumes ActiveContext values rather than mocking routing and tool lookup, so this route setup has no second useful consumer. The canonical user/tool factories are irrelevant to a mocked ID-to-name function. No new helper or supporting edits.

Existing guidance covers scenario-visible inputs, direct composable calls, and cleanup; no new best-practice advice proposed.

Validation: the selected baseline is `/private/tmp/jest_readability_batch13_baseline.json`. The final assigned-suite run in `/private/tmp/jest_readability_batch13_history_final.json` passes all **75 cases across five suites**, with shuffled seed `130059`, no skips or failures. Scoped current ESLint (zero warnings) and Prettier pass. Full client typechecking and independent reviews are owned by the driver. No production changes.
