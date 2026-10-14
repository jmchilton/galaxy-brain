Implemented issue [24031](https://github.com/galaxyproject/galaxy/issues/24031) on `issue_24031_badge_tooltip_html`, based on current `origin/dev` at `20f365a2654`.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24031_badge_tooltip_html`.

The badge now uses HTML tooltip mode, wraps the escaped stock sentence in a paragraph, and appends the administrator’s rendered markdown. The shared directive derives HTML accessible names from a clone of the sanitized content, inserts spaces at block and line-break boundaries, and collapses whitespace. Text-mode labels retain their original values and existing menu naming rules remain intact.

Regression tests mount the real badge and directive for ordinary text, markdown emphasis/links, no administrator message, paragraph/list/line-break labels, sanitized updates and empty labels. Existing badge assertions compare rendered text so HTML escaping does not alter their contracts. The two sanitizer-dependent suites use per-file jsdom because happy-dom 20.14.5 does not faithfully support DOMPurify 3.4.16. jsdom was already resolved transitively; declaring it directly adds one package entry and three lockfile lines.

Validation so far: before implementation, new tests reproduced the regressions (7 failures, 17 passes); after implementation and environment correction, regression and adjacent suites pass (29 tests, 4 files), with Node 22.20.0. Independent normal, quality, test-challenge, scope and screenshot reviews are required before handoff. No PR will be opened by this session.
