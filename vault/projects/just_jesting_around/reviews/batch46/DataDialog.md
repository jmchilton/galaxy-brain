# DataDialog (abandoned)

Selected originator: `client/src/components/DataDialog/DataDialog.test.js`. Baseline **5 tests**; left unchanged.

Abandoned for a production bug. `DataDialog.vue` has `watch(() => history, ...)`, and `history` isn't declared in `<script setup>`, so it resolves to the global `window.history`. The watcher never fires, so changing the `history` prop never resets the URL tracker or reloads. A throwaway probe confirmed it: after `setProps({ history: "h2" })` axios saw only the mount's `/api/histories/h1/contents?...` request. The bug dates from the 2024 composition-API conversion (`3342bec7bed`), so upstream has it too. The fix is `() => props.history`.

When the test is picked up after a fix:
- Serve the mount's request with `useServerMock`. Today it reaches a real `localhost:80` and logs `ECONNREFUSED` after the run.
- Assert the `SelectionDialog` props for both a load and a failure.
- Drop the dead `vi.mock("app")` after the throwing-factory check.
- Drop `stubs: { Icon }`, which matches nothing under `shallowMount`, and the unused `mockOptions` argument to `Services`.
- Use `toThrow` instead of the try/catch, and remove the commented-out block.
