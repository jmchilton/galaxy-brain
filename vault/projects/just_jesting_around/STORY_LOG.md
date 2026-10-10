# Story log

Append-only, one row per [TO_STORY_ITERATION.md](TO_STORY_ITERATION.md) iteration.

| Test | Decision | Reason / lessons | Test lines | Story lines |
| --- | --- | --- | --- | --- |
| `Form/Elements/FormData/FormData.test.ts` | storify | Prototype reference conversion; `FormDataWithModel` harness plays v-model parent | 611 → 352 | 158 |
| `FilesDialog/FilesDialog.test.ts` | storify | API scenarios as stories; `configurationHandler` replaced `vi.mock` of config | 495 → 402 | 101 |
| `History/Export/HistoryExportWizard.test.ts` | storify | Stories are plugin offerings; step helpers replaced repeated blocks | 469 → 180 | 69 |
| 123 non-component tests (bulk) | skip | No component mounted (stores, composables, utilities, API clients, providers, editor modules); `storybook_play: skip` too. Heuristic: no mount, wrapper, render, `.vue`, Testing Library or `defineComponent`, spot-checked | – | – |
