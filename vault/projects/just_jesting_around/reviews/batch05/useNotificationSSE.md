# useNotificationSSE

Selected originator: `client/src/composables/useNotificationSSE.test.ts`.

Reviewed the project goal, loop instructions, client testing guidance, composable implementation, and neighboring composable tests. Retained all 14 cases and 27 assertion statements. The suite shrinks from 392 to 282 lines by consolidating the two identical connection lifecycle arrangements under a parent describe and removing comments that narrate the immediately following action.

## Scenario preservation

| Original scenario | Final evidence |
| --- | --- |
| First history subscriber | One POST with exactly the selected history ID; all three checks retained. |
| Duplicate history subscriber | One complete POST log entry with the selected ID, strengthening the original filtered count. |
| Last history subscriber releases | Intermediate absence of DELETE and unchanged POST count; final single DELETE with the history ID. |
| Unknown history unsubscribe | Empty request log. |
| Distinct histories | Same set of posted history IDs. |
| CLOSED error | Initial one instance, no replacement before backoff, second instance after 2 seconds. |
| CONNECTING error | Still one instance after 60 seconds. |
| Successful open resets backoff | Same five preceding failures, six instances, capped timer does not fire in 2 seconds, timer drains, successful open, subsequent failure fires within 2 seconds. |
| Forced reconnect | Immediate second instance and no third after 60 seconds. |
| Forced reconnect resets backoff | Same five-failure history and instance counts before and after immediate reconnect and subsequent failure. |
| No subscribers | No EventSource created. |
| Visible tab after disconnect | Immediate replacement after visibilitychange. |
| Healthy connection on visibilitychange | No replacement. |
| Network online after disconnect | Immediate replacement. |

The private reset hooks and Vue effect scope remain. Connection tests use `vi.stubGlobal` and an explicit visible-state getter spy, restored in teardown; manual global casts/deletion and duplicated restore branches are gone. Local `connect`, `failConnection`, and `reachCappedBackoff` helpers describe repeated lifecycle actions. The fake transport is still local, and timing comments retain the jitter bounds that explain deterministic timer advances. Subscription request bodies use MSW generics instead of casts; methods come from the handler registration.

Reuse search found this fake EventSource only in the selected file, so no cross-file fixture was introduced. No production code or polling behavior changed. Existing scenario, mock isolation, and composable guidance covers the lessons; no new README advice is proposed.

Validation: this suite and `useCreatingJob` pass together, 24 cases. Scoped ESLint and formatting pass; the full client type check passes. Root performs the final batch regression check. Evidence: `/private/tmp/batch05_composables_final.log`, `/private/tmp/batch05_events_lint_final.log`.
