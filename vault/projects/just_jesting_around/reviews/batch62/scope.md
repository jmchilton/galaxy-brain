# Batch 62 scope and screenshots

Recommendation: retain the implemented four-originator scope, including the focused download polling-error case and dataset-index prop checks backed by review evidence.

## Implemented scope

Canonical base `4451d737bde7225529f3c476ef48299c6e921b27` to `463e67451e71ef0e753cdd28a73c20279d294723` changes library-routes, VisualizationUnsavedChanges, StsDownloadButton, and DatasetIndex tests only. Existing cases/checks are retained with typed native boundaries, owned cleanup, and focused setup improvements; final totals are eighteen cases and forty-six checks versus seventeen cases and forty baseline checks.

| Pros | Cons |
| --- | --- |
| Four focused reviewable originator commits; intentional polling-failure coverage replaces diagnosed accidental leaked polling; index prop checks address evidenced blind spots | Adds one case and six focused checks beyond the original counts |

## Narrow to lifecycle/typing edits only

Remove the extra download failure case and index prop checks while retaining cleanup and typing fixes. This reduces assertion scope but drops coverage previously supplied by a proven polling leak and leaves mutation-demonstrated prop-check gaps unaddressed.

| Pros | Cons |
| --- | --- |
| Smaller final case/check count | Omits the concrete evidence-backed safeguards that complete the coverage contract |

## Expand broader behavior or shared fixtures

Add unrelated visualization authenticity/permission scenarios, routing edge cases, download APIs, or index rendering combinations, or extract additional shared mount factories. Reviews found no concrete supporting consumers or missing original contracts requiring that expansion; existing deferred, server-mock, mount, and fixture helpers suffice.

| Pros | Cons |
| --- | --- |
| Could cover additional product conditions | Broadens setup and review burden beyond the demonstrated needs |

## Screenshots

Screenshots not relevant for this change. Applied the shared screenshot workflow and vault E2E-writing guidance: all four changed canonical files are unit tests, with no production component, template, styling, E2E screenshot, or screenshot capture edits. No rendered product change requires recording or modifying browser screenshots.
