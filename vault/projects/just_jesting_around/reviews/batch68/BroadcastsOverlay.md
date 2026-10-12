# BroadcastsOverlay readability iteration 68

Originator `94a754b2c3f781b6c2cb5de3b767c49221e761a1`, pinned base `a716c7d6a82a497f52a1831309c67531451c35fa`.

All eight original cases/24 checks remain: empty/expired/unpublished absence, one message at a time, next dismissal, urgent→warning→info, right/left wraparound and links-profile sanitizer output. All literal fixture fields, generated-ID progression, exact dates and priority/cycling actions remain unchanged. The admin generator has materially different random/publication semantics, so its reuse would distort these inputs.

Native inferred mount options install an owned testing Pinia with withPlugins; the broadcasts store is selected explicitly. Per-test disposal and automatic wrapper unmount cover assertion failures. Unmount precedes dismissal-spy restoration and sanitizer history cleanup, retaining the sanitizer mock implementation. Required message/button get lookups replace find before content/action access; original count and presence/absence observations remain intact. The existing dismissal stand-in still updates the actual reactive broadcast array with the same asynchronous timing, isolating overlay pagination from persistent dismissal policy.

Pristine/final Node22 shuffled680101 pass eight cases. Default V835files191 covered statement/function/branch-arm source locations exact; external actual shared UI23files114 locations exact, zero loss/addition. Actual button/tooltip behavior renders; broad supplemental totals also include imported setup paths, not a claim every UI component rendered. File ESLint/Prettier and explicit absolute-config hooks pass. Driver owns integrated full client types.

Evidence: `/private/tmp/readability68-overlay-{before,after}` JSON/logs, corresponding `-ui` captures and `/private/tmp/readability68-overlay-hooks.log`. No production/support/helper changes or evidence-backed new guidance gap; existing owned native-plugin and teardown guidance applies.
