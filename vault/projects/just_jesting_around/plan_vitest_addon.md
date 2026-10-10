# Plan: Storybook Vitest addon (pinned)

Pinned 2026-10-09 by John until FilesDialog and HistoryExportWizard were migrated to composed stories; unpinned the same day, built on `vitest_story_play`.

## Idea

`@storybook/addon-vitest` adds a second vitest project in browser mode (`@vitest/browser` + `@vitest/browser-playwright`, real Chromium). Every story becomes a test, at minimum a smoke check that it renders. A story's `play` function holds interactions and assertions (`storybook/test`: `expect`, `fn`, `userEvent`, Testing Library queries). Storybook's Interactions panel replays each step, so a test can be watched instead of held in your head.

Version 10.6.1 accepts vitest ^3, ^4 or ^5, so the client's vitest 4 fits.

## Split to aim for

- Component behavior (forms, dialogs, wizards): stories with `play`, in the browser.
- Logic, stores and composables (`upload.test.ts`, `pageEditorStore`, `terminals`): stay in happy-dom vitest.
- Edge-case-heavy component unit tests: stay in vitest, mounting composed stories as in `FormData.test.ts`.

## Test projects

Split `vitest.config.mts` with `test.projects`, selected by filename:

- `unit`: today's config unchanged, happy-dom, `*.test.ts` minus `*.browser.test.ts`, including the story-backed tests. Stays the default `pnpm test` and the existing CI job.
- `storybook`: the addon's browser project, Chromium via Playwright. Every story is a test; no test files. Its own setup, since API mocks run in a service worker instead of `setupServer`.
- `browser` (optional): hand-written `*.browser.test.ts`, opt-in per file, same environment as `storybook`.

Scripts `test` (unit) and `test:browser` (browser projects); browser CI is a separate job. For happy-dom versus plain Node, use a per-file `// @vitest-environment node` comment, not a suffix.

Mixed mode is out of scope: the existing suite depends on Node-side shims (the test-utils v1 adapter, the portal-vue mock, `setupServer`, heavy `vi.mock`). Only new or deliberately moved tests run in the browser.

## Experiment

1. Done; the infra now lives in `vitest_stories`' infra commit: the `unit`/`storybook` split, 26 stories plus one play function (HistoryExportWizard `ExportsDirectDownload`) pass in Chromium. The optional `browser` project isn't added yet. See the [branch record](../../repositories/galaxy/branches/active/vitest_story_play/index.md).
2. Move 3–4 FormData tests to `play` functions: multiple datasets, linked/unlinked batch mode, and the drag-and-drop rejections. Use `onInput: fn()` args instead of `wrapper.emitted()`, and role/title/text queries instead of `.multiselect__*` classes.
3. Measure wall time against the happy-dom run of the same cases.
4. Check whether the compat deprecation console error fails the render smoke test for every story.
5. Capture Interactions-panel screenshots for John.

## Open questions

- With a real v-model parent, the "emits `null` on switching to Multiple" behavior differs. Assert what users see rather than port the old assertions; that needs John's OK, since it changes assertions.
- CI: the client job would need node Playwright and Chromium (Galaxy E2E uses Python Playwright, a separate install).
- Suffix `.browser.test.ts` or a `__browser__/` directory?
- Should browser CI block merges, or start non-blocking?
- Should `addon-a11y` run axe on every story in the same pass?
