# ActivityBar stories review — e539c84d41d

Reviewed 2026-10-14. Independent read-only review approved against 4af958b28a5 without corrections or outstanding recommendations.

## Assertion mapping

All five cases and six original sites survive: configured count 3; exact workflow destination using OWN_WORKFLOW.id; interactive-tools disabled count 0 and enabled count 1; exact visible IDs tools/workflows before reversing; exact stored IDs workflows/tools/interactivetools afterward. Real rendered link IDs replace shallow-stub IDs. Real SortableList's update:modelValue exercises the same setter and keeps filtered activity. Inputs use actual built-ins instead of placeholders, with exact expectations recomputed.

Existing decorators/handlers are reused unchanged. Stories sign in the viewer, clone built-ins and isolate storage by scope. Reviewer checked cancellation, restoration, debounce settlement and owned Pinia disposal, finding no new lifecycle issue. Configuration loading is positively synchronized before assertions, preventing disabled-state negatives from passing prematurely. Only test and new stories changed; JavaScript language retained.

## Validation

Targeted unit 5/5, removable Chromium probes 2/2 and types passed. Probes verified enabled links and disabled omission after config loading; removed. Review was read-only and ran no additional gates. Complete gate afterward passed unit 704 tests in all 89 selected files and Chromium 339 tests in 88 files. Formatting, lint and normal hooks passed; fast-forward push completed.
