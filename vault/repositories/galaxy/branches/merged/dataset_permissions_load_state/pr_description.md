[26.1] Show dataset permissions load errors once, for users and histories

Follow-up to #23744.

`useCallbacks` in `composables/datasetPermissions.ts` now tracks `loading` and `loadError` itself and returns them. Its two callers had each started handling load errors differently:

- **User preferences (`UserDatasetPermissions.vue`):** when loading the permissions inputs failed, the error was shown as a toast, but `loading` was never reset. "Loading permission information" stayed on screen forever. The page now shows an error alert in place of the form.
- **History (`HistoryDatasetPermissions.vue`):** a failed load showed the same message twice, as a `GAlert` and as a toast. Now it appears once, in the alert. `init()` only fetches the inputs and updates the form.

Failures when saving permissions still show a toast through `onError`. The spinner no longer flashes briefly each time the permissions are reloaded after a save.

## Tests

- `datasetPermissions.test.ts` checks `loading` and `loadError` directly for three cases: a successful load, a denied first load, and a denied reload after a save. For both denied cases it also checks that no error toast appears.
- A new `UserDatasetPermissions.test.ts` checks that a rejected request replaces the form with the alert.
- Both specs fail on #23744's head and pass with this change.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
