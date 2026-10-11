# Recommendation: retain the implemented 27-file iteration

The 20 selected originators are the requested review batch. Four supporting suites and three shared helpers complete concrete reuse across collection summaries, file sources, and metadata-viewer stubs; this is useful follow-through authorized by `LOOP_ITERATION.md`. Keep the work in one iteration commit on the existing branch and advance counters only for the 20 originators.

Scope audited against `2dbcc3703c61c058598fe50d14fba2623bd3329f`: 24 modified test files plus three new test helpers. No production component, application logic, README, configuration, dependency, backend, E2E, or screenshot changes are included. This is a scope review; correctness and assertion preservation belong to the independent normal review and validation report.

## As implemented: 20 originators, four supporting suites, three helpers

Retain full readability reviews of the selected tests and the focused migrations into `datasetCollectionStore.test.ts`, `RDMDestinationSelector.test.ts`, `HistoryExportWizard.test.ts`, and ToolShed `OverviewTab.test.ts`. The collection summary factory has two concrete consumers, the file-source factory has three, and the metadata JSON-viewer stub has three; original consumer-specific inputs stay visible.

| Pros | Cons |
| --- | --- |
| • Completes shared abstractions across actual consumers rather than recording proposals. | • Spans Galaxy client, its API-client package, and ToolShed frontend validation environments. |
| • Supporting changes have identifiable originating reviews and do not consume inventory review counters. | • Reviewers must distinguish complete selected-file reviews from focused supporting migrations. |

## Narrow to the 20 selected suites

Remove supporting migrations and shared helpers, keeping the selected tests' fixtures and mocks local. This makes the changed-file count match the sampling count, but leaves repeated full payloads and JSON-viewer mock implementations in neighboring suites.

| Pros | Cons |
| --- | --- |
| • Smaller file list and fewer supporting suites to validate. | • Loses the cross-file abstraction work expressly requested by the loop. |
| • Each selected refactor can be read in isolation. | • Full collection summary duplication and metadata mock duplication remain unresolved despite concrete consumers. |

## Expand the new fixtures across every potential consumer

Migrate sparse collection fixtures in `uploadDatasetMonitorStore` and `datasetListStore`, and replace the already-shared file fixtures in `FilesDialog/testingData.ts`. Agent searches identified these as possible neighbors, not evidence that the new factories simplify their distinct scenarios.

| Pros | Cons |
| --- | --- |
| • Could unify more default payloads if a later full consumer review shows a benefit. | • Existing FilesDialog fixtures already provide reuse; replacing them alone adds migration churn. |
| • A larger consumer review might reveal additional useful factory overrides. | • Sparse lifecycle scenarios may become harder to read when wrapped in full summary defaults. |

Keep this out of the current iteration. The selected collection and file-source originators already establish useful shared abstractions with their direct duplicate consumers; other tests remain eligible for later independent review.

## Expand into general workflow/form factories or production typing

Generalize the two sparse workflow step fixtures into the existing `createTestStep` factory, extract a configurable Form conditional builder, or repair ToolSection's production section-label typing. The originating reviews explain why these would require changing defaults, relocating scenario-defining branch inputs, or touching application contracts.

| Pros | Cons |
| --- | --- |
| • A broader domain review could eventually standardize step inputs and section types. | • Workflow fixtures intentionally preserve omitted ids or duplicated ids and empty outputs; generic defaults would change those conditions. |
| • A production type repair could remove a remaining documented ToolSection structural assertion. | • That application contract change needs its own purpose and validation, beyond a unit-test readability loop. |

Existing Pinia setup, Tool factories, action mock data, and raw-proxy utilities already cover the useful reuse here. Leave unrelated domain generalization and production typing out of this iteration. No reviewer supplied a concrete missing README rule that warrants adding documentation to this batch.
