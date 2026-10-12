# Batch 57 scope and screenshots

Recommendation: retain the implemented scope of four originating test rewrites, with no production or supporting-test changes.

## Implemented scope

Reviewed canonical diff from `5eeeb57ef4d887b72b64c71377eb72e3dc5def08` to `a08db72f897`: ConfirmDialog, SavedRulesSelector, WindowManagerWindow, and history.services tests only. The reviewed timer amendment remains confined to WindowManagerWindow test setup/teardown, discarding delayed save callbacks after unmount. Shared existing mount, Pinia, server-mock, and teardown infrastructure is reused; scenario inputs and original assertions remain visible.

| Pros | Cons |
| --- | --- |
| Focused reviewable originator commits; stronger request/event precision; owned component cleanup | Does not add new production feature coverage outside the original scenarios |

## Contract scope only

Restrict the batch to formatting and naming, retaining original mocks and mount ownership. This would reduce changes further but leave unsafe Axios fixtures, obsolete mount options, and component cleanup gaps that current guidance directly addresses.

| Pros | Cons |
| --- | --- |
| Smaller edits | Leaves the concrete readability and lifecycle problems unresolved |

## Expand behavior coverage or shared helpers

Add scenarios such as empty history responses, window clamp boundaries, or more saved-rule preview conditions, or extract a new shared fixture layer. No review evidence establishes that these additions are required for the four rewrites; existing helpers already cover the repeated infrastructure.

| Pros | Cons |
| --- | --- |
| Could cover additional behaviors | Broadens the batch beyond the selected loop and increases review burden without a demonstrated reusable need |

## Screenshots

Screenshots not relevant for this change. Read the shared screenshot workflow and the vault E2E-writing guidance; the four-file canonical diff changes unit-test arrangement/assertions only, with no Vue template, styling, production behavior, E2E test, or screenshot capture edits. No rendered product change requires recording or modifying browser screenshots.
