# PageRevisionView — readability batch 50

Originator: `client/src/components/PageEditor/PageRevisionView.test.ts`.
Base: `15ba2c4a57710c6b0715adbda5319465cfc44cc9`.
Worker commit: `1efb634ee0ea6b3c8006e9a2061bf3917ec73335`.

## Changes and assertion audit

All 23 original cases and all 38 executed assertions remain. Six repeated assertion sites were consolidated into parameterized rows, leaving 32 written expect sites that still execute the same 38 checks. The matrices preserve all three pressed toggles, all three mode-change transitions (including Preview starting from changes_current), both Restore visibility modes, and both back-event modes. Back event cardinality remains one; exact mode/restore payloads retain their original values.

Every diff scenario remains separately readable: preview/Markdown and no diff; current additions/deletions/stats; exact +3/-2 line summary; current equality with zero added/removed lines and no stats; previous additions/deletions/stats; previous equality with no stats. Newest/oldest comparison button visibility, default preview availability, and reverting disabled attribute retain all original expectations.

Native `props` and `global` replace adapter options and `as object`. Mount overrides derive from the actual component's props rather than arbitrary records. The existing full revision fixture now uses `satisfies PageRevisionDetails`, preserving its actual non-null string content while checking the API shape. Required controls/stats use get/getComponent and awaited scheduling uses nextTick. Presence/absence queries stay as find. Auto-unmount cleans up all parent wrappers after every case. Shallow GButton events remain the public event seam; this file does not invoke private component methods or refs.

## Validation

- Ledger entry was bare, without later-lane ownership flags, before edits.
- Baseline 23 cases pass; final shuffled seed 500101 with maxWorkers=1: 23 cases pass, no skips.
- Exact baseline/final covered source-location comparison: 283 source files each, zero previously covered statement/function/branch locations lost. PageRevisionView retains 45 covered statements, 24 functions, and 55 branch arms.
- Full client typecheck passes. The first typecheck caught nullable content from the original annotated API fixture being supplied as required string currentContent; using satisfies fixed that without a cast or runtime value change.
- ESLint, Prettier, canonical explicit pre-commit and git diff check pass. Import grouping was autofixed before final validation.
- A final shuffled 23-case run after the fixture typing/hook checks also passes; coverage was collected before the type-only fixture change, whose runtime values remain identical.
- Pinned Node22.20.0 and native warning opt-out; no named project or NODE_OPTIONS. Existing imported GCard Vue migration warnings remain unrelated.

Evidence: `/private/tmp/readability50-page-{baseline,final,final-fixture}.log`, `/private/tmp/readability50-page-{baseline,final}-coverage/coverage-final.json`, `/private/tmp/readability50-page-coverage-comparison.json`, `/private/tmp/readability50-page-typecheck.log`, `/private/tmp/readability50-page-hooks.log`.

## Guidance and reuse

Existing README native mounting, scenario tables and cleanup guidance directly cover the observed issues. The default global setup needs no replacement plugin, so withPlugins is unnecessary. No new shared helper or supporting edit is warranted. The existing page factory was inspected; the already-local, complete revision fixture keeps its three distinct diff texts and original metadata visible without introducing another factory or nullable content narrowing. Its values are unchanged. The repeated mode matrices use it.each rather than another action helper, so scenario inputs and expected events remain visible.

No production, shared, supporting, ledger or downstream files changed. No new guidance, E2E screenshots or security findings.
