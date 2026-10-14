# Thermo-nuclear code-quality review — issue 24031

The review found no blocking structural or maintainability problems. No implementation changes were requested: the shared directive owns HTML label extraction, and the badge opts into that existing presentation mode. Existing label ownership, plain-text behavior, and tooltip lifecycle remain direct. The reviewer did not edit implementation code or commit changes.

Not acted on:

- A general HTML-to-text utility was considered and rejected: the repository has no existing equivalent, this policy currently has one owner, and exporting a new abstraction would add indirection without reducing complexity.
- A recursive DOM walker was considered and rejected: cloning the sanitized tooltip DOM and inserting separators at a bounded set of HTML boundaries is shorter and easier to audit, without altering displayed content.
- Additional tests for nested/table boundaries and already-named menus specifically in HTML mode would be useful optional coverage. Existing paragraph, break, list, inline-formatting, entity, update, empty-label, plain-mode, and named-menu tests substantiate the current behavior. The separate challenge-test review can decide whether to broaden cases.

## Details

Reviewed the complete working diff against `origin/dev`, the issue description, the local review focus, and the thermo-nuclear prompt on 2026-10-10.

### Architecture and simplification

The badge's responsibility is presentation: escape the stock sentence, put it in a paragraph, append the existing markdown renderer's result, and request HTML tooltip mode. No badge-specific interpretation is introduced into the UI package.

The shared directive derives the HTML accessible label from the same DOM used for the visible tooltip. This keeps both consumers on one interpretation path rather than separately parsing the raw string. The extracted `getHtmlLabel` helper earns its abstraction by naming the whitespace policy and keeping it out of the existing label-target ownership logic.

No additional mode, nullable state, dispatch layer, generic traversal framework, or scattered source-specific condition was introduced. Text mode remains a direct assignment of the original content. The existing rules protecting a menu toggle with visible text or an explicit label remain unchanged.

### Boundaries and readability

Adding separators around block and break elements preserves inline text and punctuation while preventing adjacent paragraphs, list entries, and table cells from merging. Only the clone is mutated, so extraction cannot introduce extra nodes into the rendered tooltip. Entity decoding follows ordinary DOM text semantics. Whitespace normalization applies exclusively to HTML labels.

The existing lodash escaping helper is reused for the stock sentence. The existing markdown helper and directive rendering path remain canonical. No unnecessary optionality or loosely typed model is added. The clone cast reflects the known HTMLElement input rather than hiding an uncertain boundary.

### File size and scope

No file approaches or crosses 1,000 lines: the largest changed production file is the directive at 494 lines. Production changes are 18 added lines and four removed lines across two files. Dependency changes make jsdom 28.1.0, already resolved in the workspace lockfile, explicitly available to two tests using the per-file Vitest environment directive. This is a targeted test-environment change; it does not alter production dependencies or the global test environment.

### Validation

`pnpm exec vitest run src/directives/vGTooltip.test.ts src/components/ObjectStore/ObjectStoreBadge.test.ts` passed: two files and 24 tests. This reviewer run used the available system Node 25.6.1, not the repository-pinned Node 22.20.0; the coordinator owns the final supported-runtime validation. Existing named-menu-label tests pass unchanged. `git diff --check` also passed.

The tests exercise the real tooltip directive mounted with the badge, check visible paragraph structure and retained emphasis/link markup, compare exact accessible labels, verify update and empty-content behavior, and preserve literal content in text mode. Original badge message/stock assertions are preserved, with their mock helper adapted to the new HTML title contract.

Approval recommendation: acceptable for human review after the coordinator's required validation and remaining handoff steps. No high-conviction code-quality changes are needed.
