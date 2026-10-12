# ActivityBar independent review — batch71

Approve `a3dd7195ba6cf7d62f1c2595ddd3a5b2c70fa89e` against base `923ac5312656dc6aafbf8f78f2701945cc2aa4b4`. No blocking finding or edit.

All five original cases/six checks retain configured activities, workflow drag destination, interactive-tool visibility and visible/stored reorder behavior. Exact fixtures, config values, events, nextTick order, original primary mount and nested secondary mounts are unchanged. Native global plugins replace legacy options while keeping the same draggable stub. Explicit active Pinia selection is required by the scoped activity-store API; eventStore explicitly selects its matching instance. Required action targets use get/getComponent.

All primary/secondary testing Pinia instances are captured immediately and disposed after automatic unmount. Inspected the real activity store's10ms debounced synchronization: timeout-only fake timers finish that original work after assertions while mounts remain alive, then teardown unmounts, disposes stores, clears remaining timers, restores real timers and clears mock/config state. This is test-owned cleanup of a timer outside Pinia disposal; it does not claim scope disposal cancels it. No original assertion timing is moved and no production workaround is added.

Independent Node22.20 shuffled710201 passes five cases (/private/tmp/readability71-activity-independent.log). Independently reran covered statement/function/branch-arm comparisons:439files1112 native and23files12 external UI exact, zero loss/addition. The shallow UI supplement covers imported setup rather than rendered children. Author lint/format/absolute hooks passed; integrated types are driver-owned. Existing ownership/dependent timer guidance suffices, with no new evidenced gap.
