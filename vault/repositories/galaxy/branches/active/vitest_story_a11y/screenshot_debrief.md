# Screenshots successfully obtained

Reviewed the Storybook tooling changes in `vitest_story_a11y` with installed Node Playwright and Chromium against `http://localhost:6017` on 2026-10-10. Used pinned Node 22.20.0. Read `GX_PROCESS_SCREENSHOTS.md` and `Component - E2E Tests - Writing.md` before recording.

This branch changes developer tooling, not the Galaxy application UI. Existing Galaxy Selenium screenshots do not cover the Storybook manager, accessibility panel, or viewport selector, so no Galaxy server, production UI tests, or inherited screenshot tests were changed. Screenshots were recorded from real Storybook browser sessions, then each image was opened with `view_image` for visual review.

| Screenshot | What was verified |
| --- | --- |
| [GButton clean accessibility scan](screenshots/gbutton-clean.png) | `BaseComponents/GButton/Default` renders the Save button, runs its interaction test, and shows **0 violations, 7 passes, 0 inconclusive** in the Accessibility panel. |
| [InstallationSettings expanded diagnostics](screenshots/installationsettings-violations.png) | `ToolShed/RepositoryDetails/InstallationSettings/With Tool Panel` renders its teleported installation modal. The Accessibility panel reports **2 violation rules, 20 passes, 0 inconclusive**: `button-name` on two icon-only buttons and `label` on one form control. Expanding Button name displays the affected button markup, missing-name explanation, and Jump to element / Copy link controls. |
| [Galaxy viewport presets](screenshots/viewport-presets-menu.png) | The Viewport size menu offers **Galaxy desktop**, **Galaxy narrow panel**, and **Galaxy mobile**. Expanded accessibility diagnostics remain available alongside the story. |
| [FilesDialog narrow panel](screenshots/filesdialog-narrow-panel.png) | Selected **Galaxy narrow panel**, verified the preview iframe width is **400 CSS pixels**, and reran the accessibility scan. Toolbar inputs show the configured **400 x 900** preset; the visible preview is constrained by the manager's addon panel. `Files/FilesDialog/Multiple Files` displays **3 violation rules, 28 passes, 0 inconclusive**: `button-name` (2 affected elements), `nested-interactive` (4), and WCAG 2.2 `target-size` (8). |

The clean result and real violations confirm the addon performs scans rather than merely displaying an empty panel. The FilesDialog target-size result also demonstrates the additional WCAG 2.2 AA checks in the configured rule set. The body-level modal in InstallationSettings is included in diagnostics, supporting the configured `context: "body"` scope for teleported components.

Screenshots show expected Storybook layout and readable diagnostics. Existing component accessibility findings are surfaced by the new tooling; this branch does not fix them. These captures are review evidence, not committed visual regression baselines or a complete accessibility audit. No screenshot blocker was encountered.

Screenshots belong in the branch's ignored `screenshots/` directory; this debrief is intended for `screenshot_debrief.md`.
