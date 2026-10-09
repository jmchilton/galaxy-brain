# Plan: Storybook Vitest addon (pinned)

Pinned 2026-10-09 by John until FilesDialog and HistoryExportWizard are migrated to composed stories.

## Idea

`@storybook/addon-vitest` adds a second vitest project in browser mode (`@vitest/browser` + `@vitest/browser-playwright`, real Chromium). Every story becomes a test, at minimum a smoke check that it renders. A story's `play` function holds interactions and assertions (`storybook/test`: `expect`, `fn`, `userEvent`, Testing Library queries). Storybook's Interactions panel replays each step, so a test can be watched instead of held in your head.

Version 10.6.1 accepts vitest ^3, ^4 or ^5, so the client's vitest 4 fits.

## Split to aim for

- Component behavior (forms, dialogs, wizards): stories with `play`, in the browser.
- Logic, stores and composables (`upload.test.ts`, `pageEditorStore`, `terminals`): stay in happy-dom vitest.
- Edge-case-heavy component unit tests: stay in vitest, mounting composed stories as in `FormData.test.ts`.

## Experiment

1. Add the addon and browser mode on `storybook_prototype`, as a separate vitest project next to the happy-dom one.
2. Move 3–4 FormData tests to `play` functions: multiple datasets, linked/unlinked batch mode, and the drag-and-drop rejections. Use `onInput: fn()` args instead of `wrapper.emitted()`, and role/title/text queries instead of `.multiselect__*` classes.
3. Measure wall time against the happy-dom run of the same cases.
4. Check whether the compat deprecation console error fails the render smoke test for every story.
5. Capture Interactions-panel screenshots for John.

## Open questions

- With a real v-model parent, the "emits `null` on switching to Multiple" behavior differs. Assert what users see rather than port the old assertions; that needs John's OK, since it changes assertions.
- CI: the client job would need node Playwright and Chromium (Galaxy E2E uses Python Playwright, a separate install).
- Should `addon-a11y` run axe on every story in the same pass?
