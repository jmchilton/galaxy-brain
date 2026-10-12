# Batch 54 — scope evaluation

Keep the four selected originators and their focused validation. The implemented changes reuse existing helpers and improve test setup and cleanup; source inspection of all four worker diffs confirms that only those test files changed. Integrated driver gates and independent review remain required before publication.

## Selected tests as implemented

The batch covers `client/src/components/Common/EmailReportForm.test.ts`, `client/src/components/Common/Wizard/GenericWizard.test.ts`, `client/src/components/Notifications/NotificationsList.test.ts`, and `client/src/components/CommandPalette/providers/interactiveTools.test.ts`. Retain existing behavior checks while improving fixture/model typing, native mount options, owned stores/scopes, required queries, and automatic component cleanup.

| Pros | Cons |
| --- | --- |
| Existing shared utilities replace compatibility setup and incidental lifetime leaks. | Full mounted children and async work require focused coverage and cleanup verification. |
| One test origin per commit makes each readability change reviewable and reversible. | Parent tests can report incidental child coverage changes that need source-level assessment. |

For EmailReportForm, explicit external coverage confirms real GButton/GAlert covered locations are unchanged; no exception is needed. Production, new helpers, documentation, dependencies, and supporting tests are outside this implemented batch.

## Narrow to cosmetic edits

Only rename fixtures and selectors, keeping compatibility mount options and unowned resources.

| Pros | Cons |
| --- | --- |
| Smaller source diffs. | Leaves meaningful test-lifetime and type-boundary issues behind despite available existing utilities. |

## Expand to new shared fixtures or production refactoring

Create shared setup abstractions or change application code to accommodate these tests.

| Pros | Cons |
| --- | --- |
| Could help additional consumers if concrete duplication is found later. | No present evidence justifies new exports or production edits; it enlarges this readability batch and its regression surface. |

Keep local single-use setup and established shared helpers. Supporting changes should be proposed only when there are concrete consumers and separate focused checks.

## Replace focused tests with browser or API workflows

Move these contracts into server or browser execution, or add visual screenshots.

| Pros | Cons |
| --- | --- |
| Can validate broader user journeys when product behavior changes. | Adds server/browser setup and runtime without improving precise provider, wizard-event, sanitizer-profile, or rendered-list checks in this test-only change. |

These refinements do not change product rendering or behavior. Keep focused client contracts and existing feature-level integration coverage. No additional screenshots, E2E tests, or backend/API scenarios are needed for this batch.
