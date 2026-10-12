# Batch 58 scope and screenshots

Recommendation: retain the implemented four-test scope with existing infrastructure reuse and no production or supporting-test changes.

## Implemented scope

Canonical diff `59f471a92924266a30e4aa849b7b15e9539c16e7` to `ee56ad6a371` contains only portableImports, DiskUsageSummary, QuotaUsageBar, and useWorkflowCardActions tests. Edits address typed imports/mounts/fixtures, owned component/store/effect teardown, and visible scenario setup while preserving the existing contracts.

| Pros | Cons |
| --- | --- |
| Four reviewable originator commits; existing helpers reused; no new abstraction or product behavior | Does not extend coverage to untested product conditions beyond the original scenarios |

## Narrow to cosmetic edits

Retain existing casts, implicit Pinia ownership, and mount options, changing only names and formatting. This reduces the diff but leaves the concrete typing and cleanup issues identified by the loop.

| Pros | Cons |
| --- | --- |
| Smaller diff | Defers the demonstrated improvements covered by current guidance |

## Expand coverage or helper scope

Add quota threshold and compact/embedded combinations, workflow action handlers, or a package import parser, or introduce new shared factories. These are possible separate tasks, but the current reviews found no missing contract or concrete helper consumers that require them in this batch; the static portability guard intentionally retains its existing regex scope.

| Pros | Cons |
| --- | --- |
| Could cover additional product conditions | Adds behavior and review scope without a demonstrated need for completing these four rewrites |

## Screenshots

Screenshots not relevant for this change. Applied the shared screenshot workflow and vault E2E-writing guidance: all four changed files are unit tests, with no template, styling, production behavior, E2E screenshot test, or screenshot capture changes. There is no rendered product change requiring screenshot recording or browser-test modification.
