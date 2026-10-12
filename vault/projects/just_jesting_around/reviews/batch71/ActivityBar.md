# ActivityBar author review

Origin: `a3dd7195ba6` from pinned base `923ac5312656dc6aafbf8f78f2701945cc2aa4b4`. Only `client/src/components/ActivityBar/ActivityBar.test.js` changes.

Five cases and all six original checks, fixture values, drag events, and visible/stored ordering remain. Native plugins replace adapter options. Each primary and interactive-tools mount owns its Pinia; required action targets use `get`/`getComponent`. Auto-unmount precedes store disposal and mock cleanup.

The real activity store schedules a 10ms VueUse debounce outside Pinia scope disposal. Test-scoped timeout timers finish that existing synchronization after assertions while wrappers remain mounted, then teardown clears pending timers and restores real timers. The original default mount in nested cases remains. No production change or shared helper proposal.

Pristine/final Node 22.20 single-worker shuffled seed 710101 each pass five cases. V8 covered statement/function/branch-arm locations: 439 files, 1,112 locations identical; actual external shared UI supplement: 23 files, 12 locations identical. The latter is setup/import coverage under shallow rendering, not evidence that all UI templates render. Logs and JSON are `/private/tmp/readability71-activity-{before,after}` and corresponding `-ui` directories/logs.

File lint, formatting, and explicit absolute sample-config pre-commit hooks pass (formatter first adjusted the long import; subsequent checks pass). Driver owns integrated full types. Existing timer/ownership guidance covers the evidenced debounce issue; no new documentation advice.
