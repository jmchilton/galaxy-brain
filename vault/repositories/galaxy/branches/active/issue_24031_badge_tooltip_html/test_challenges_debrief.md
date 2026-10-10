All added tests are meaningful and pass; no test removals or source changes were warranted. The regression is covered through the real Vue component, tooltip directive and sanitizer, with independent Chromium rendering evidence. The full Galaxy integration Selenium suite was not run.

Reviewed issue #24031, `doc/source/dev/writing_tests.md`, client unit-testing guidance in `client/README.md`, and both vault E2E writing/smart-component notes. WORKING_DIRECTORY: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24031_badge_tooltip_html`.

The badge cases check observable rendered text, retained Markdown emphasis/link formatting, separate paragraphs, stock-only behavior, hover activation and the accessible label. The paragraph-count check supports the requirement to keep stock and custom messages visually separate. These assertions are independent of the title-computation helper and would catch omission of `.html` or failure to name the sanitized content.

The directive cases test the public binding contract through a minimal Vue component: paragraphs, line breaks including the existing JobInformation spelling, list-item boundaries, decoded entities, reactive updates, empty-content cleanup and unchanged literal text-mode content. They do not call the new label helper. Real DOMPurify is exercised; it is not mocked. The updates case verifies that the accessible name and displayed DOM use the same sanitized content. Existing hover-delay/menu/controlled-show and badge wording assertions are preserved.

Using `mount` is justified for these narrowly focused directive/component interaction cases; replacing the real directive with a stub would reproduce the blind spot that permitted this bug. No API fixtures, ad hoc service mocks or SimpleNamespace-style objects were introduced. Shared LocalVue and tooltip-delay helpers are reused. The small existing direct-hook harness remains appropriate for directive lifecycle contracts.

The two affected suites use per-file jsdom because the currently resolved DOMPurify 3.4.16 does not sanitize correctly with the current happy-dom environment. This preserves real sanitizer behavior rather than mocking it; the project-wide Vitest environment is unchanged. The dependency and importer lockfile additions are limited to exposing the already resolved jsdom package.

E2E challenge: `test/integration_selenium/test_objectstore_selection.py` already configures both sample badges and checks their presence in dataset details. Extending its first two cases could verify the complete server/config-to-browser flow, but no compiled client or prepared runtime exists in this worktree. Running a base server would not validate the patched client. A full build/server setup adds substantial unrelated work for a component rendering defect with no backend change. Consequently no unvalidated Selenium additions were made, and none of the existing assertions were removed. The completed actual-source Chromium harness checks tooltip formatting and accessible labels in a real browser; provenance and limits are recorded in `screenshot_debrief.md`. It does not validate server object-store selection or full-page layout.

Independent validation used pinned Node 22.20.0:

```sh
cd client
PATH=/Users/jxc755/Library/pnpm/nodejs/22.20.0/bin:$PATH pnpm exec vitest run src/components/ObjectStore/ObjectStoreBadge.test.ts src/directives/vGTooltip.test.ts src/components/ObjectStore/ObjectStoreBadges.test.ts src/components/ObjectStore/configurationMarkdown.test.ts
```

Result: 4 files, 30 tests passed; exit 0. Existing Vue migration warnings appeared. `git diff --check` also passed. The first sandboxed attempt failed before collecting tests because Vite could not write its temporary config; the authorized rerun succeeded. The initial implementation run recorded seven failing regression cases before the fix; this challenge independently confirmed the final green result.
