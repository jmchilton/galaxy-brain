# Histories provider author review

Originator `3d954efc82ccc4fbbd7220b41befa4aa337538c3`.

Base `a454ecaea1a5798c2e556625ee18db4798d0f785`; only the assigned histories test changes. All36 original cases and100 intended executed checks remain (91 assertion lines: five additional checks from the second pagination row, four from the three-scope loop). Every original history field/literal, date, omitted owner, route, cache/filter/pagination count, API response, recent entry and event/request ordering remains.

Canonical nth/ensureDefined now make required section/item/action/provider methods explicit while retaining genuine optional secondary-action absence checks and original query predicates. The existing local history factory remains useful across many scenarios; its supplied fields and optional owner/username/overrides derive from HistorySummary/SharedHistory. Its explicit partial return type correctly gives empty tags the schema string-array type. Two deliberately incomplete cached summaries use documented HistorySummary boundaries instead of as never. Deleted/published/purged/URL defaults remain omitted; a complete factory would change fixture semantics.

Each real Pinia is captured before setup and disposed after background refresh promises flush; active Pinia, refresh timestamps, captured SSE callback, recents and mocks are reset afterward. Three manually controlled requests now use canonical deferred<void> and completion release/flush before store disposal, retaining their original in-test release positions. This ensures held requests settle even on earlier failure. These scenarios never start history polling/SSE connections: cleanup owns the captured callback and store effects without claiming Pinia cancels unstarted timers or disconnects a live stream.

Pristine/default and UI baseline runs completed before editing. Final shuffled730101 passes36 cases. Covered statement/function/branch-arm source locations: native64→66 files1192→1203, zero loss; external actual UI0files0locations exact, so no rendered UI claim. Added locations are canonical required-boundary/deferred paths. Final full client vue-tsc, native file ESLint/Prettier, explicit absolute sample-config hooks and diff check pass. Evidence `/private/tmp/readability73-histories-{before,after}` and corresponding -ui JSON/logs, -types/-eslint/-prettier/-hooks.log.

No shared/support/production/later-lane change or new evidenced guidance gap. Existing partial-fixture, native boundary and resource ownership guidance suffices.
