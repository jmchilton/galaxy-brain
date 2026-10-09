# Iteration 13 fresh test challenge

Approved. The 15 originating suites and one supporting suite retain useful client
contracts. No test removal, production refactor, or browser-test expansion is
needed for this readability change.

Reviewed the iteration-only diff against
`ba5800a26798382da706088dca0947a769b19641`, client README practices,
`doc/source/dev/writing_tests.md`, and both vault E2E writing and smart-components
references. The user's requirement to preserve meaningful existing coverage
governs the generic challenge prompt's suggestions to drop or relocate tests.

## Challenge by suite

| Suite | Contract and layer decision |
| --- | --- |
| Tags/model | Public tag coercion, normalization, autocomplete subtraction, and valid/invalid string inputs belong in direct client tests. All original strings and semantic equality checks remain. |
| HistoryArchiveWizard | Shallow rendering checks archived state and availability of simple/permanent archival modes. Real fresh seeded Pinia and canonical history/file-source data replace incidental setup. |
| HistoryArchiveExportSelector (supporting) | Eight original export-recency, permanence, error, confirmation, and button-state cases remain. Existing history factory reuse is the only data migration; the real checkbox remains for user interaction. |
| DatasetError | Real diagnostic and report-form rendering checks exact stderr/messages, common-problem indicators, and successful submission. DatasetView's stubbed child-selection test does not cover these diagnostics or form behavior. |
| SelectionDialog | Retains actual spinner/options changes, header, cancel, selected/mixed checkbox state, and one row-click event. Full mounting is justified by real GTable and checkbox interaction. |
| ServerSelection | Real dropdown text/options and chosen-server event replace inspection of the component's internal computed flag. No server integration is needed for a dropdown's emitted value. |
| UtcDate | Rendered ISO, elapsed, and pretty formats remain, including prop transitions. Fixed system time prevents the elapsed expectation from drifting with the calendar. |
| Lint | Real lint-data/store/component interaction retains warning order/count and exact refactor actions before and after input removal. Cloned incomplete fixture and stopped effects preserve isolation without replacing the lint logic with mocks. |
| WorkflowExport | Exact export URLs and the existing mounted id-change reload stay visible; canonical workflow defaults and scenario handlers replace registration-time handlers and an identity wrapper. |
| CollectionDescription | Thirteen independently named existing variations still update props after mount. Shallow mounting suffices for the leaf text formatter; parent GenericItem's child-presence tests do not cover description values. |
| History/model/queries | Tests the client payload/response/error boundary and reactive pending/terminal run status, with real MSW handlers and stopped watchers. Full response checks retain and strengthen the original sampled fields. |
| HistoryDatasetDisplay | Retains real table/header/text, embedded prop transition, expansion click, copy arguments, refresh, and success/error toasts. Explicit datatype-store ownership and mock reset improve isolation. |
| WorkflowInvocationState/util | Exact title fallback/label/name/index values and partially/all-terminal collection-job counts are public presentation contracts. Typed summaries replace double casts without changing counts. |
| uploadItemTypes | All valid and invalid upload modes remain. Existing local-file factories keep the missing/empty file inputs visible without repeating unrelated defaults. |
| useUploadSubmission | Real upload requests, copy responses, tracking/batch outcomes, rejection propagation, cancellation, and signal scope remain. Minimal lifecycle mounting and direct promise assertions remove test-only UI without mocking the composable itself. |
| useActiveContext | Route-to-context, label, icon, exclusion, and malformed-route cases remain. Narrow route/tool-name boundaries are sufficient; assertions check the discriminant and identifiers rather than casting computed output. |

## Concrete higher-layer comparisons

- `lib/galaxy_test/selenium/test_upload_activity.py` covers metadata, pasted
  content/links, deferred uploads, composite mixed sources, changing target
  history, and library uploads; `test_upload_activity_collection.py` covers
  pasted links as list and paired collections. These complement the selected
  submission tests' precise response mapping, library/API partial failure,
  tracked-state transitions, signal scope, and cancellation before response
  release. They do not duplicate those assertions.
- `lib/galaxy_test/selenium/test_workflow_editor.py::test_best_practices_input_label`
  verifies browser lint metadata changing after label/annotation edits. The
  selected Lint suite checks the exact ordered warning/action contract of an
  incomplete historical workflow. It does not add a competing browser flow.
- `lib/galaxy_test/selenium/test_workflow_sharing.py::test_export_workflow_with_login_redirect`
  checks authorization/login at the export page; `lib/galaxy_test/api/test_workflows.py`
  checks workflow download formats. WorkflowExport's private/importable links
  and reactive id reload are distinct client behavior.
- `lib/galaxy_test/api/test_histories.py::test_archive` checks persisted archival;
  related archive/restore/index tests enforce server behavior. The wizard and
  selector check client mode availability and confirmation/export eligibility.
- `test/integration/objectstore/test_bulk_storage_operations.py` covers preview
  eligibility, quota projections, execution, and pending-to-completed server
  lifecycle. Client queries test request serialization and reactive watcher
  values, without purporting to test storage migration itself.
- `lib/galaxy_test/selenium/test_history_panel.py::test_history_panel_tags_change`
  exercises the tag editor. It does not reproduce all regular-expression inputs,
  coercion, normalization, or autocomplete subtraction in Tags/model.

No new application behavior was introduced, so no new E2E scenario is required
by this diff. The review inspected the higher-layer sources; it did not run those
suites or assert comprehensive browser coverage of every existing feature.

## Evidence

Authoritative shuffled client validation passed 161 cases across 16 files with
zero skips/failures (seed 130151): 153 selected cases, eight supporting cases.
The original selected baseline was 116 passing cases; 37 additional named
executions expose existing variations. Full client typechecking, affected-file
ESLint with zero permitted warnings, and Prettier also passed. See
[independent normal review](../../../../../../../projects/just_jesting_around/reviews/batch13/normal_review.md) for the inspected artifact paths.
