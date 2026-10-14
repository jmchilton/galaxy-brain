Screenshots successfully obtained.

Three screenshots were captured on 2026-10-10 from the actual changed `ObjectStoreBadge.vue` and `vGTooltip.ts` sources in the issue 24031 worktree. All three were visually inspected and look as expected.

| Screenshot | What it verifies |
| --- | --- |
| [badge-markdown.png](screenshots/badge-markdown.png) | Stock text is followed by a separate rendered Markdown paragraph, bold text and an Archive Tier Storage link; no literal HTML appears. |
| [badge-stock.png](screenshots/badge-stock.png) | A stock-only badge still shows readable plain text. |
| [badge-html-paragraphs.png](screenshots/badge-html-paragraphs.png) | Configured HTML displays separate paragraphs, bold text and a line break. |

Provenance and validation: a temporary Vite component harness imports the real component, directive, Font Awesome components, Bootstrap CSS and Galaxy UI theme tokens directly from `WORKING_DIRECTORY`. The surrounding three-row page is harness presentation, not a screenshot of the full Galaxy dataset-details page. Chromium 153.0.8010.12 ran with a 1100 × 800 viewport. Hover captures waited for the real tooltip to become visible. Browser assertions checked the rendered bold text and link href, stock wording, absence of literal tags, and readable markup-free `aria-label` values with paragraph/line-break boundaries preserved. No page errors occurred. `screenshots/verification.json` records those assertions and labels. Harness sources and capture script are preserved under the gitignored `screenshots/harness/` for reproducibility.

The required E2E writing notes and screenshot process were read. `test/integration_selenium/test_objectstore_selection.py` is relevant: its `test_0_tools_to_default` exercises object-store detail badges, and its MSI fixture includes a Markdown custom `backed_up` message. That test currently waits for badge presence and records no screenshot; this branch adds no E2E screenshot tests. No existing screenshot capture exercises the changed custom tooltip. To obtain relevant visual evidence without the cost and unrelated configuration of provisioning Galaxy's integration server, the authorized component-harness fallback was used. The full Galaxy integration E2E suite was not run, so these screenshots verify component rendering and tooltip behavior rather than backend object-store selection or full-page layout.

The in-app Browser runtime could not connect: selection returned “No browser is available,” and after reading its troubleshooting instructions the available-browser list was empty. Capture therefore used the installed Python Playwright package and cached Chromium. Local server listen and Chromium launch required approved sandbox escalations. No project source files were modified by this workflow. The temporary server was stopped after capture.

Generated screenshots and harness artifacts are gitignored; only this debrief is intended for the branch record.
