# Iteration 13 independent review

Approved. No actionable findings remain. Reviewed only the changes from
`ba5800a26798382da706088dca0947a769b19641` to the working tree: 15 selected
originators and the supporting `HistoryArchiveExportSelector.test.ts`. No source
edits were needed during review.

The review used `REVIEW_FOCUS.md`, the client README testing practices, and the
current source implementations and shared fixtures. The user requested a
readability iteration with meaningful assertions retained; existing tests were
not deleted merely because they exercise a small public function or because a
broader workflow has browser coverage.

## Details

- Existing history, file-source, collection, workflow, and upload-item factories
  replace sparse casts and repeated default fields. The selector migration is a
  concrete second history consumer, preserves all eight cases, and does not
  count as another originator. No duplicate shared factory was introduced.
- `withPlugins` replaces the helper's default Pinia with the explicitly seeded
  instance. This fixes ownership of the stores used by DatasetError, the archive
  wizard, dataset display, upload submission, and Lint. Mounts now clean up
  between cases rather than retaining suite-level wrappers.
- Lint clones the deliberately incomplete historical JSON fixture per mount.
  Its cast remains at that documented fixture boundary; completing its steps
  with a factory would remove the defects the lint scenarios exercise. The
  explicit effect scope is stopped after each test, including failures. Exact
  warning counts, link order, event payloads, and the post-removal action case
  remain intact.
- The upload harness retains a real mounted lifecycle context for `useConfig`
  while removing the invented button, result serialization, and error display.
  Tests await the public submission promise and assert returned objects or
  rejection messages. Existing state, batching, library-copy, object-store,
  fallback-size, and cancellation contracts are retained. Standalone and
  collection signal cases are separate, with real AbortSignal checks.
- Cancellation waits for the request to start, holds its response behind a
  promise, cancels the tracked item, and verifies the submission resolves with
  no datasets while that response remains held. The response is released in
  `finally`. This replaces a wall-clock delay and ambiguous empty harness text
  with evidence of the behavior the original test name promised.
- CollectionDescription still changes props after mounting in every named row.
  All 13 original collection type, datatype, count, and description combinations
  remain. WorkflowExport preserves the same mounted wrapper when its id changes;
  UtcDate retains ISO-to-elapsed-to-pretty transitions with a fixed clock.
- Tag inputs and coercion/equality checks, selection state transitions and exact
  single-click emission, server choice, invocation titles and mapped-job counts,
  diagnostic text/report submission, dataset table/text/expansion/copy outcomes,
  route contexts/labels/icons, and storage-query success/failure inputs remain.
  Full response equality and request-body assertions strengthen storage tests;
  watcher cleanup stops pending polling after each case.
- No README guidance gap merits another rule. These changes apply existing
  advice about visible scenarios, reusable defaults, correct component contexts,
  and awaiting public operations. No unresolved marginal advice was manufactured.

## Validation

Verified the driver's authoritative artifacts directly:
`/private/tmp/jest_readability_batch13_final_client.json` records 161 passing
cases in 16 affected files, zero skipped or failed cases; the shuffled run uses
seed 130151. The selected originators contribute 153 cases and the supporting
selector contributes its original eight. The baseline selected files had 116
passing cases; the additional 37 executions come from naming existing variations
and separating scenarios.

`/private/tmp/jest_readability_batch13_validation_status.json` records exit zero
for the affected tests, full client typecheck, scoped ESLint with zero permitted
warnings, and Prettier. The driver also reports a clean source diff check. Browser
suites and CI were not run by this review; approval does not claim those results.
