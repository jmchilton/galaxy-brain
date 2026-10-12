# VisualizationUnsavedChanges — batch 62

Both original cases and four assertions remain: no initial unload warning, an unsaved own-iframe message blocks unload, a saved message clears the warning, and blocking begins after 50ms without waiting for the 300ms config debounce. Plugin/API/router mocks and real iframe/message/unload behavior remain.

The mount helper owns its wrapper, explicitly injected testing Pinia and dedicated DOM attachment target. Auto-unmount runs before clearing any remaining fake timers/restoring real timers; completion removes only the owned target and disposes Pinia. Required iframe lookup uses get. Native global plugins replace legacy top-level options and redundant active-Pinia setup. Real LoadingSpan now renders instead of the previous local loading stub; no covered source location is lost.

Before/after shuffled seed620101 passes two cases. Default source coverage:142files,437→442locations,zero lost; the five additions exercise real LoadingSpan rendering. Repository hooks including lint/format pass. Existing happy-dom module-script loading warnings occur at both refs while Vitest exits successfully with no unhandled test errors. Full client types belong to the integrated batch gate. No production/shared/supporting changes or new guidance needed.
