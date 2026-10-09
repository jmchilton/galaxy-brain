# Markdown composable readability review

Reviewed `client/src/composables/markdown.test.js` against the complete client-side testing guidance in `client/README.md`. Applied a small refactor in the isolated `jest_readability_batch_01` worktree. All three existing cases remain, with stronger rendering assertions.

## Changes applied

- Used the adjacent `./markdown` import, making the relationship to the implementation clear.
- Named the cases after their observable behavior: heading text, same-page links by default, and new-page links when requested.
- Strengthened the heading assertion from an opening `<h1>` tag to `<h1>Title</h1>`.
- Verified that both link cases render an anchor with the expected destination and label. The default case's existing negative `_blank` assertion alone would also accept empty output; it now follows a positive rendering assertion.
- Kept the explicit target checks and a blank line before assertions so each case reads as setup, action, and result.

## Best practices applied thoughtfully

The tests remain focused on the public `renderMarkdown` result. They do not access `markdownEngine`, mock MarkdownIt, or mount unrelated components. Each case constructs its own composable instance, so renderer options cannot leak between cases. There are no asynchronous operations or mocks to reset.

The client entrypoint reexports `useMarkdown` from `client/packages/ui/src/composables/markdown.ts`. That implementation creates a MarkdownIt renderer and exposes a synchronous render function; it has no lifecycle hook, injected dependency, component instance, or reactive input. Calling it directly is appropriate even though the README's generic composable example mounts a component.

## Reuse investigation

Read `client/tests/vitest/helpers.js` and the renderer-facing tests in `MarkdownDefault.test.ts`, `ToolHelpMarkdown.test.ts`, `FormElementHelpMarkdown.test.ts`, `GTip.test.ts`, `ToolHelpRst.test.js`, `schemaMarkdown.test.ts`, and `utils.test.js`. Also searched the client and UI package tests for `useMarkdown`, `openLinksInNewPage`, `target="_blank"`, DOM parsing, and detached DOM containers.

Several component tests assert HTML strings passed to the sanitizer, and `utils.test.js` asserts linkify output. Those consumers exercise different public boundaries and need different component or API setup. No existing shared helper simplifies this three-case composable suite. A global renderer factory or HTML assertion helper would hide a one-line operation and very short expectations; no new helper was introduced or recommended. The inline Markdown inputs and expected HTML remain visible at the assertion site.

## Guidance that emerged

1. Mount composables when they depend on lifecycle, injection, or component context. Call a synchronous composable directly when its public result needs none of those facilities. Evidence: this composable needs only renderer construction and a string input.
2. Pair negative assertions with a positive assertion that the expected result exists. Evidence: the original same-page test passed for empty HTML because it checked only that `_blank` was absent.
3. Share setup when it removes meaningful duplication. Repeating a simple public API call in three short tests can be easier to read than introducing factories, parameter tables, or component harnesses.

These are recommendations for the parent agent to integrate into shared guidance; this agent did not edit the README or shared helpers.

## Validation

The parent reported a passing baseline for the five selected suites before edits (88 tests). After this file changed:

- `pnpm exec vitest run src/composables/markdown.test.js`: all 3 tests passed.
- `pnpm exec prettier --check src/composables/markdown.test.js`: passed.
- `pnpm exec eslint -c .eslintrc.js src/composables/markdown.test.js`: passed.

The runner emitted Vue compatibility compiler warnings from unrelated UI package components; ESLint emitted the existing outdated Browserslist data warning. Neither check failed. No production source, shared helper, or test case count changed.
