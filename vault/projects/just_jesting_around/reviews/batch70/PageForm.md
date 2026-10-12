# PageForm readability iteration 70

Originator `fa9fcfe4df2e70d1b51799f875da73c23e2e8528`, pinned base `e18fb0be8360e47ed3e682eddf0192d3589f5bf5`.

All ten original cases/30 executed checks remain, including11 request-body field assertions inside the original MSW handlers. Exact invocation/page IDs, report/template content, title/slug/annotation strings, error payloads, loading transitions, router destinations and toast messages remain. Handler registration, setValue/submit actions and promise waits keep original timing. Presence/absence assertions retain find/exists; required fields/buttons/alert text use get.

The existing mount helper has a public-props JSDoc boundary and native global stubs. Automatic unmount precedes mock call-history cleanup, including failed observations. Existing localization and canonical toast behavior remain real/unchanged. PageForm and inspected form children require no owned store fixture or new generic helper.

Coverage proved the old top-level directives.localize noop was ignored. Initially moving that noop into global directives lost11 real localization locations. Removing the ineffective override instead restores the actual previously executed getLocalVue localization boundary; final coverage matches exactly. This demonstrates why native migrations must preserve observed behavior rather than activate every legacy option. Existing source-location verification caught it; no shared adapter/helper change is needed.

Pristine/final Node22 shuffled700101 pass ten cases. Default V833files352 covered statement/function/branch-arm locations exact; supplemental actual shared UI23files137 locations exact, zero loss/addition. Real buttons/alerts/tooltips render; supplemental totals include imported setup modules and do not imply every component rendered. FontAwesome remains stubbed. File ESLint/Prettier and final explicit absolute-config hooks pass; driver owns integrated full types.

Evidence: `/private/tmp/readability70-page-{before,after}` JSON/logs, corresponding `-ui` captures and `/private/tmp/readability70-page-hooks.log`. No production/support/helper change. The ignored-option diagnosis is concrete migration evidence, but existing boundary/coverage guidance suffices; no new general fixture abstraction is justified.
