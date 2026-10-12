# HistoryExport independent review — batch 56

Approved author commit `bda2d4ac78514c00a902f87acfe48ed943ae975e` against base `883b6e0bef7`. The original single case and tab-existence assertion remain unchanged, including the loaded/writable file-source condition, history ID, shallow mounting and awaited promises. The scenario name now states the condition, and arrangement sits alongside the action and assertion.

Native `global: withPlugins(localVue, pinia)` installs the owned testing Pinia while retaining shared plugins and stubs. Automatic unmount runs before restoring the file-source mock under stacked hooks; `onTestFinished` disposes Pinia afterward. The teardown captures and restores the initial mock implementation if one exists, retaining the initial absence of an implementation otherwise. No framework-only assertion or new helper is introduced.

Independent shuffled seed 560201, one worker: one case passes, exit 0, no unhandled errors. Evidence: `/private/tmp/readability56-export-independent.log`. The author reports exact retention of 344 covered locations across 214 files. This remains a focused render smoke check; replacing it with integration/E2E testing would add setup outside this readability batch. No review fixes or guidance changes are needed.
