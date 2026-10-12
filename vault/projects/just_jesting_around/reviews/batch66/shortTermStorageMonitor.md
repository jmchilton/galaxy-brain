# Short-term storage monitor — batch66

Originator commit: `1d4ac8494ba2dfd15d0f72e8d2498dc3ef572d73`.

All nine original cases and31 expect source lines remain identical;32 intended successful checks include the repeated no-further-polling helper (waitFor may retry its request-count checks). Pending/ready/request-error/stored-state/final-state contracts and manual stop versus effect-scope disposal timing remain intact. Original unscoped monitors now register stopWaitingForTask cleanup, preserving the real no-current-scope branch rather than changing every consumer into a scoped one. The two original scoped monitors use owned scopes with a checked run result, replacing non-null assertions.

Canonical deferred replaces the hand-written in-flight resolver. Test-finished cleanup cancels/stops the monitor before releasing and flushing the pending response, including early assertion failures, then restores spies. The polling observation helper retains its100ms interval/1000ms observation window and limited fake timers; pending timers are discarded before real timers return. No production or supporting edits.

Pristine/final shuffled660101 pass nine cases. V8 retains25files/250covered statement/function/branch-arm locations, adding3 from actual pending-timer cancellation; zero losses. This composable suite renders no UI. File ESLint/Prettier and explicit absolute-config repository hooks pass; driver owns integrated types. Existing ownership/deferred guidance covers the change, with no evidence-backed new guidance gap. Evidence: /private/tmp/readability66-storage-{before,after} and lint/format/hooks logs.

Integrated typing identified that an expression callback returned VitestUtils from restoreAllMocks. The reviewed driver correction uses a block callback returning void, preserving the same restoration and cleanup order; it is folded into final canonical `1aefd1948d079abfc2d179f62c4d07a323b8daa0`. The originator SHA above records the author handoff; final integrated gates are rerunning.
