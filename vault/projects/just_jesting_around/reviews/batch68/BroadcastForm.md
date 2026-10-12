# BroadcastForm readability iteration 68

Originator `f2e6481d9cefcaf1ee1f56b0856337fa3f95bd3a`, pinned base `a716c7d6a82a497f52a1831309c67531451c35fa`.

All seven original cases/30 executed checks remain, including six executions of the three-check submit helper, exact router observations, loaded field values/action-link presence and published/scheduled warning states. All random-fixture generation calls, input strings, response handlers and promise waits retain their timing and semantics.

Native inferred component mounts use typed public props and withPlugins to install owned testing Pinia. Automatic unmount precedes per-test Pinia disposal, including assertion-failure paths. Required interaction/content lookups use get; original presence/absence assertions remain find/exists. Loaded subject/message values use actual input/textarea DOM types instead of casting both controls to input. The existing domain submit/create helpers remain useful across scenarios; the published-warning title typo is corrected.

Pristine/final Node22 shuffled680101 pass seven cases. Default V8 comparison349files1264 covered statement/function/branch-arm source locations exact; supplemental actual external shared UI23files238 locations exact, zero loss/addition. Actual GButton/GAlert and tooltip behavior render; supplemental totals also include transitively imported setup paths and do not imply every component renders. GDateTime, LoadingSpan and BroadcastContainer remain stubbed; FormElement remains real. File ESLint/Prettier and explicit absolute-config hooks pass. Driver owns integrated full client types.

Evidence: `/private/tmp/readability68-broadcastform-{before,after}` JSON/logs, corresponding `-ui` captures and `/private/tmp/readability68-broadcastform-hooks.log`. No production/support/shared changes. BroadcastsOverlay's generator uses distinct fixed dates/IDs and ordering fixtures; the admin generator intentionally randomizes values and publication timing, so combining them would alter scenario semantics. Existing plugin/ownership/typed-control guidance suffices; no new shared helper or evidenced guidance gap.
