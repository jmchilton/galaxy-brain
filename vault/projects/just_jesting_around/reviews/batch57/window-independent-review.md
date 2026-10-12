# Independent review: WindowManagerWindow

Approve. Compared the amended final worker file with base `5eeeb57ef4d887b72b64c71377eb72e3dc5def08`, and read the component, window-manager store, current README, and shared review priorities.

The six original scenarios and all 22 assertions remain unchanged: pointer capture during resizing and dragging, final dimensions/position after pointerup, cancellation, controls preventing a drag, second-pointer rejection, and focus remaining on the other window until its header is pressed. Required DOM targets now use `get`; their events and coordinates remain the same.

Native mount options remove legacy `localVue`/`pinia`/`propsData` fields and the component object cast. Explicit store ownership and `withPlugins` ensure the component and test use the same Pinia. Automatic unmount runs before restoring the complete original pointer-capture property descriptor; store effect disposal then runs on test completion. The initial review identified that store disposal alone leaves the native 200 ms save timer pending. The amendment enables fake timers before arranging each scenario, then discards all pending timers and restores real timers after automatic unmount. This prevents delayed persistence from escaping the scenario without invoking save callbacks or changing production code. All six cases are synchronous, so no awaited transport or framework delay is affected.

Independent shuffled seed 570201 passes six cases. Independent refreshed V8 coverage reports all 237 originally covered locations across 19 files retained, zero lost, and three added locations in `onBeforeUnmount`; inspection confirms explicit unmount now invokes the existing drag/resize cleanup. No blocking findings, new shared abstractions, or necessary README edits.
