# VisualizationFrame author review

Originator `625c283578d6fb08710f7ad3c54ffaab1e99a0d8`, base `3533c26be42734c937d57c3fd4805e14b81da286`.

All14 original cases/26 checks remain: incoming saved/config/plugin/root fields, isolated sender routing, impostor exclusion, explicit unmount debounce cancellation/listener removal, immediate saved-state and config-only change semantics, and original failed-plugin response. Exact props/plugin data/messages, explicit manual unmounts and400ms advances stay in their original positions.

Native props replace legacy propsData. Automatic unmount replaces the mutable wrapper registry; each mount captures/removes only its owned attached div after unmount. Teardown cancels remaining timers/restores real time and window-listener spies after unmount. Required iframe/document/container lookups use get/ensureDefined. One messaging-frame arrangement and one settle helper replace identical repeated setup without moving the original flush-before-fake-timers boundary. No new plugin fields, store, helper or production change.

Pristine native/UI runs completed before edits; final Node22.20 shuffled740101 passes14 cases. Covered statement/function/branch-arm locations native14→15files84→92 zero loss; external actual UI26files80 exact. Added paths are canonical required-boundary checks; the real error alert renders alongside imported shared UI setup. Inherited happy-dom plugin script-loading diagnostics are caught, with no unhandled test failure or successful script-resource loading claim.

Native file lint/format, absolute sample-config hooks and diff check pass. Driver owns integrated full types. Evidence `/private/tmp/readability74-visualization-{before,after}` and corresponding -ui JSON/logs, -eslint/-prettier/-hooks.log. Existing ownership/native-boundary guidance suffices, with no new evidenced advice gap or shared abstraction proposal.
