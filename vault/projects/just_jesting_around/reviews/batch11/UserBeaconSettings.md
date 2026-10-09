# Iteration11: UserBeaconSettings

Originator: `client/src/components/User/UserBeaconSettings.test.ts`.

Added a typed local beaconHistory(contentsActive) fixture so each case shows its active/hidden/deleted counts. Reused getFakeHistorySummary for history creation. Typed vi.importActual through a type-only namespace import removes any from the history-store partial mock, and response.untyped(HttpResponse.json(...)) describes the deliberately projected BeaconHistory response instead of falsely casting it to HistorySummary.

Mounts now install the explicit Pinia via existing withPlugins/getLocalVue, with the current user populated before setup requests. enableAutoUnmount and resetAllMocks isolate wrappers/actions. Button actions find the visible Enable/Disable/Create Beacon History/Switch to History text and fail clearly when absent, rather than depending on color classes.

Preserved disabled/enabled wording and negative text checks, no-history/Create state,7active datasets versus9including hidden, both toggle directions, create→annotation-update→refetch arrangement, Beacon Export presentation and exact switched history ID. Initial empty GET followed by scenario-specific create/refetch handlers remains deliberately ordered. All eight scenarios and assertions remain.

Reuse: getFakeRegisteredUser/getFakeHistorySummary/getLocalVue/withPlugins/enableAutoUnmount are existing infrastructure. A BeaconHistory is an endpoint projection whose contents_active/create_time fields are not the HistorySummary fixture schema, so the three-field factory stays local and typed; there is no concrete second consumer. Current response.untyped guidance directly covers this case, so no new best practice or marginal advice proposed.

Validation: baseline 8 passed cases; final 8 passed cases in shuffled order (seed110047). The six-originator run increased from50 to74 passed cases with no skips/failures. Reports: `/private/tmp/jest_readability_batch11_components_baseline.json` and `/private/tmp/jest_readability_batch11_components_final.json`. Scoped ESLint and Prettier run on all six owned files; root driver supplies final aggregate typecheck evidence.

Supporting source files: none. Shared factories/helpers changed: none. README/inventory/Git changes: none by this reviewer.
