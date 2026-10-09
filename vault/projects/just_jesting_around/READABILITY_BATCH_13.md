# Readability batch 13

Fifteen uniterated originators selected with seed `191605832`. [Manifest](readability_batch_13.yml). The same branch/worktree holds one commit for this iteration, starting at `ba5800a26798382da706088dca0947a769b19641`.

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Tags/model | Named valid and invalid tag inputs; local ordered tag comparison. [Review](reviews/batch13/Tags-model.md). | 7 → 25 |
| HistoryArchiveWizard | Existing history/file-source fixtures and focused archival scenarios. [Review](reviews/batch13/HistoryArchiveWizard.md). | 3 → 3 |
| DatasetError | Named diagnostics options and real presence assertions. [Review](reviews/batch13/DatasetError.md). | 3 → 3 |
| SelectionDialog | Fresh local mounts and awaited selection/cancel interactions. [Review](reviews/batch13/SelectionDialog.md). | 8 → 8 |
| ServerSelection | Separate displayed choices and selected-server emission. [Review](reviews/batch13/ServerSelection.md). | 1 → 2 |
| UtcDate | Frozen elapsed clock with retained mode transitions. [Review](reviews/batch13/UtcDate.md). | 1 → 2 |
| Lint | Fresh historical steps, explicit Pinia and lint effect cleanup. [Review](reviews/batch13/Lint.md). | 3 → 3 |
| WorkflowExport | Existing workflow factory and exact reactive export-link arrays. [Review](reviews/batch13/WorkflowExport.md). | 1 → 2 |
| CollectionDescription | Thirteen named prop-update cases and existing collection fixture. [Review](reviews/batch13/CollectionDescription.md). | 2 → 13 |
| History/queries | Complete storage responses, request contracts and polling disposal. [Review](reviews/batch13/History-queries.md). | 9 → 9 |
| HistoryDatasetDisplay | Explicit datatypes Pinia and local rendered-dataset scenarios. [Review](reviews/batch13/HistoryDatasetDisplay.md). | 6 → 6 |
| WorkflowInvocationState/util | Named step-title variations and typed collection-job summaries. [Review](reviews/batch13/WorkflowInvocationState-util.md). | 11 → 15 |
| uploadItemTypes | Existing local-file factory for invalid-file variations. [Review](reviews/batch13/uploadItemTypes.md). | 12 → 12 |
| useUploadSubmission | Direct returned promises, deterministic cancellation and split signal scope. [Review](reviews/batch13/useUploadSubmission.md). | 14 → 15 |
| useActiveContext | Fresh tool-name mock and discriminated context assertions. [Review](reviews/batch13/useActiveContext.md). | 35 → 35 |

## Reuse and follow-through

Existing history, file-source, collection, workflow-summary and upload factories remove duplicated domain setup. Existing Pinia, plugins, mapper, event and storage-run helpers remain canonical. The wizard review also follows the existing history factory into [HistoryArchiveExportSelector](reviews/batch13/HistoryArchiveExportSelector.md), replacing eight sparse history casts through its fresh mount default and cleaning mounted work. Its eight cases pass unchanged; its counter stays unchanged, preserving eligibility for a full future review. No new shared helper is needed.

Short job messages, collection-job summaries and cancellation gates remain local where other consumers need different shapes. The historical lint JSON deliberately contains incomplete steps; its documented boundary cast stays rather than adding defaults that would erase missing-metadata conditions. README, LOOP_ITERATION.md and marginal advice remain unchanged because no worthwhile new guidance or unresolved reuse idea emerges. Only the fifteen originators advance counters: 135 of 396 reviewed.

## Validation and review

All 161 cases pass across 16 affected suites, shuffled with seed `130151`, with no skips. The selected baseline passes 116 cases; the separately captured supporting baseline adds eight. Thirty-seven extra executions name existing variations or separate independent behaviors, yielding 153 originator cases plus eight supporting cases. Full client typechecking, scoped current ESLint with zero warnings/errors, Prettier, whitespace checks and source commit hooks pass.

[Independent review](reviews/batch13/normal_review.md), [fresh test challenge](reviews/batch13/test_challenges_debrief.md) and [strict code quality review](reviews/batch13/thermo_nuclear_review.md) approve preservation, timing, cleanup, type boundaries and abstraction value. [Scope](reviews/batch13/scope_evaluation.md) retains fifteen originators plus the focused supporting migration. [Screenshots](reviews/batch13/screenshot_debrief.md) are irrelevant to unchanged production rendering.

Galaxy iteration13 commit: `983633ff5e3ff4da8364f9222889afde5713b42c`. [Review only this iteration](https://github.com/jmchilton/galaxy/compare/ba5800a26798382da706088dca0947a769b19641...983633ff5e3ff4da8364f9222889afde5713b42c). The existing draft PR is [#24015](https://github.com/galaxyproject/galaxy/pull/24015); upstream CI for this head is queued (29 queued checks, two skipped at handoff).
