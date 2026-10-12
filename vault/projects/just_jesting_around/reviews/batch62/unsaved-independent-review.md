# Independent review: visualization unsaved changes

Approve. Compared final worker commit `906b516b759` with base `4451d737bde7225529f3c476ef48299c6e921b27`, read VisualizationDisplay's unload handler and VisualizationFrame's message-source filter, saved-event handling, debounce, and unmount cleanup, and applied current README/shared review priorities.

Both original scenarios and four assertions remain unchanged: unload is initially allowed, blocked after an unsaved message from the actual mounted iframe, allowed after its saved message, and blocked after only 50 ms rather than waiting for configuration debounce. The MessageEvent source is still the actual iframe contentWindow, original message payloads and plugin/API mocks remain, and fake timers still begin only after asynchronous visualization setup.

The local mount factory now owns its wrapper, body attachment target, and testing Pinia; native props/global plugins replace legacy fields. Automatic unmount runs before pending fake timers are discarded and real timers restored, followed by test-finished store disposal and removal of only the owned target. Required iframe lookup uses get. The former legacy child stubs are removed; actual LoadingSpan now renders, as shown by the covered-location gains, without altering the iframe/unload contract.

Independent shuffled seed 620201 passes two cases. Driver coverage reports all 437 original covered locations retained across 142 files, with five additions from actual LoadingSpan setup. Existing module-loading warnings occur in the successful baseline and final runs and do not originate from a new production edit. No weakened assertion, production or supporting edit, new shared abstraction, or evidence-backed README gap was found.
