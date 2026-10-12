# Form help markdown author review

Originator `8f068f5c8f3d16aca960fbdf5339b72f10c74d65`.

Base `a454ecaea1a5798c2e556625ee18db4798d0f785`; only the assigned test changes. Original one case/four checks preserve the exact markdown input, markdown sanitizer profile, gxhelp link/raw-HTML escaping and rewritten `/galaxy/help/terms/dataset` destination. Native inferred mount uses global/props rather than a component object cast and legacy options. Canonical nth requires the original first sanitizer call; required anchor uses get.

Automatic unmount precedes clearing sanitizer call history after each case, while the original clear before mount remains. The sanitizer implementation is never replaced/reset, so its existing directive behavior stays available through unmount. Original shallow HelpPopover boundary is retained; no store or fabricated defaults added.

Pristine/final pinned Node22.20 shuffled730101 pass. V8 covered statement/function/branch-arm locations38files99 exact, and external actual UI23files12 exact. The shared UI supplement is imported setup under the existing shallow boundary, not rendered popover behavior. Evidence `/private/tmp/readability73-help-{before,after}` and corresponding -ui JSON/logs. File ESLint/Prettier/explicit absolute hooks pass; driver owns integrated types.

No production/support/helper/later-lane changes. Existing native inference, required observations and teardown guidance suffice; no useful new guidance gap.
