# WorkflowInvocationState-util: accepted

Originator: `client/src/components/WorkflowInvocationState/util.test.ts`. Cases: **11 → 15**, all passing, no skips.

Twelve existing title assertions now appear as individually named input/output rows, with their step indices, types, labels, optional names, and literal expected titles visible. Collection-job fixtures satisfy StepJobSummary directly; adding the required populated_state ok replaces double casts without changing the terminal-state branch used by the original missing-field fixtures. The domain explanation about partially completed collection-mapped steps remains.

All original title calls and strings remain, including the intentionally repeated index0 data_input case, label precedence for tool/input, indices0/4, named/default tool and subworkflow, all three input types, and the unknown future type. Terminal assertions remain separately: two terminal jobs while one runs, not terminal while running, and three terminal jobs/terminal true once the running job is instead error. State maps and collection IDs are unchanged. Case growth only isolates the existing title combinations.

Reuse: these are short four-field collection-job fixtures. Existing getFakeCollectionSummary builds an HDCA, a different API entity; useCreatingJob's ImplicitCollectionJobs value identifies a job source rather than this summary. No common defaults or second useful consumer justify another shared factory. Existing tables and typed-fixture guidance are sufficient; no new advice or supporting edits.

Validation: the selected baseline is `/private/tmp/jest_readability_batch13_baseline.json`. The final assigned-suite run in `/private/tmp/jest_readability_batch13_history_final.json` passes all **75 cases across five suites**, with shuffled seed `130059`, no skips or failures. Scoped current ESLint (zero warnings) and Prettier pass. Full client typechecking and independent reviews are owned by the driver. No production changes.
