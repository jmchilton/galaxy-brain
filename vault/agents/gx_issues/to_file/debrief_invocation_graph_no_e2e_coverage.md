# Debrief: invocation_graph_no_e2e_coverage

Source: `to_file/invocation_graph_no_e2e_coverage.md` → `to_file/proposed_invocation_graph_no_e2e_coverage.md`. Verified read-only against dev `c63ffc2ccae` (2026-10-14). Nothing run, nothing posted.

## Verdict

Proposed, not rejected. The gap is real: no browser test asserts anything about the invocation Overview graph. No duplicate found, though the search was partial (see below).

## Verified

- **No graph E2E.** Grepped `lib/galaxy_test/selenium/`, `lib/galaxy/selenium/` and `navigation.yml`.
  - `workflow_editor.node` is used only by the editor tests and `workflow_editor_add_subworkflow`.
  - `invocations:` selectors (navigation.yml L1269–1314) cover the panel list, grid, tabs, Steps tab, Debug and Export. There are no selectors for the graph, step card or search.
  - There are no Playwright-only specs. `.github/workflows/playwright.yaml` runs `lib/galaxy_test/selenium` with `-playwright`.
- **The draft's "only E2E file for the invocation view" was too strong.** `test_workflow_rerun.py` and `test_workflow_run.py` (export tests) also open invocations. All of them land on Overview, so the graph mounts, but none assert on it. `test_workflow_invocation_details.py` has 2 tests plus the `invocation_open_latest` helper, which has a TODO about moving it to `navigates_galaxy.py`.
- **PRs.** All were merged. The only one that touched `lib/galaxy_test/selenium` or `navigation.yml` is #23861.
  - #22142 Isolate mode, 2026-03-18 (editor and invocation).
  - #22159 Show Connections toggle, 2026-03-18.
  - #22144 Step/tool form in the invocation graph, 2026-04-07.
  - #22335 Minimap state colors, 2026-04-15.
  - #22476 Search, 2026-04-15.
  - #22105 Zoom-to-fit cap, 2026-03-14.
  - #22769 Vertical scroll, 2026-06-01.
  - #23861 Terminals for error steps, 2026-10-02.
- **#23861 is not an invocation graph feature.** It fixes #7141 (missing-tool steps in the editor) and extended `test_missing_tools` in `test_workflow_editor.py`. It was dropped from the uncovered list and is now cited only as an example of editor work changing the shared `Node.vue`.
- **#21989, #22075 and #22745 are open issues, not PRs.** They are now marked 🎯.
- **Unit test files exist.** `useFocusedNodes.test.ts` moved to `client/src/components/Graph/composables/`.
- **Testable DOM hooks exist.**
  - `header-${state}` from `getHeaderClass` (useInvocationGraph.ts).
  - `node-not-in-focus` (Node.vue L287) for isolate mode.
  - `data-description="toggle step connections button"` (InvocationGraph.vue L232).
  - `.invocation-step-card`, and Previous/Next/Hide buttons with `title` only.
  - `.invocation-view-step-config`.
  - Search: `title="Search Invocation Graph"`, `placeholder="search workflow"`, `.result-button`.
  - Show Connections works by turning `isInvocation` off for the active node, so its terminals stop being `blank` (they get labels).
- **Mixed failures.** A step with any failed job resolves to `error` (`SINGLE_INSTANCE_STATES`), so `WORKFLOW_KEEP_SUCCESSFUL_DATASETS` `mixed_collection` → `header-error`.
- **Screenshots are not compared.** `context.py` `screenshot()` writes only when `GALAXY_TEST_SCREENSHOTS_DIRECTORY` is set.
- **New motivating regression.** #20334 (merged 2025-11-03) broke step icons in invocation step headers, in both the Steps tab and the graph step cards. #23778 fixed it on 2026-09-28.
  - `test_job_details` already viewed the Steps tab headers but asserted only the title text.
  - In the issue, this is framed as "shallow assertions miss regressions", not as "graph coverage would have caught it".
  - The step card test now asserts the icon, and an icon selector was added.
- **Isolate mode is always on.** `useFocusedNodes` dims whenever `activeNodeId` is non-null, with no toggle or localStorage gate on dev, so clicking a node is enough for the test.
- **#22476's unit test files exist on dev:** `AreaHighlight.test.ts`, `workflowSearchStore.test.ts`, `WorkflowInvocationState/util.test.ts`.

## Related search

- REST search ran into the shared rate limit (other agents were using it). One REST query ran: "invocation graph selenium" found 0 issues and 0 PRs.
- GraphQL search queries: "invocation graph test", "invocation graph playwright", "invocation view selenium", "invocation graph coverage", "WorkflowInvocationOverview selenium". No duplicates.
  - Surfaced #3241 (open umbrella "Expand Selenium Test Coverage", 2016), now cited in Context.
  - Surfaced #14067 (fail selenium on console errors), not cited.
  - Surfaced #23778 and #23194 (graph regressions/CSS fixes).
- I scanned the files of open PRs (GraphQL, up to 400). None touch the invocation selenium tests. Only #23463, #23005 and #17542 touch invocation-state or graph client code, and none add graph E2E.

## Changes from draft

- Rewritten per GX_ISSUE_DESCRIPTIONS: single-line opener, a feature → PR → unit → browser table with legend, and an existing-tests table.
- Minimap colors, zoom cap and vertical scroll are marked ➖ (canvas or layout, not a browser-test target).
- Dropped #23861 from the feature list.
- Added the #20334→#23778 icon regression as evidence.
- Selectors now reuse `workflow_editor.node` instead of a parallel `invocations.graph` node section. New selectors are only for invocation-only UI. Proposes adding `data-description` to the step card buttons and moving `invocation_open_latest` into `navigates_galaxy.py`.
- Added an isolate-mode test, since `node-not-in-focus` makes it assertable.
- The swatch and frozen-Steps-tab tests were removed. The frozen-Steps-tab one is reduced to one "a variant would also cover live updates" line, and neither unfiled sibling draft is referenced.
- The `/galaxy-playwright` reference was replaced by the real reason both backends matter (`playwright.yaml`).
- Removed local vault paths, "code-read bugs" and the "Scope" section. Added Context, Alternatives (Vitest only, extend existing tests, screenshots) and permalinks at `c63ffc2ccae`.

## Left over

- Nothing was run, so the test list is unproven. In particular, Show Connections label visibility and the isolate-mode class should be confirmed in a real browser, under both backends.
- The step card buttons may need `data-description` attributes added (client change in a "test-only" issue).
- Assignment: John's call. This came out of vault research, not a branch of theirs.
- Whether to also cite #14067. Failing on console errors would likely have caught #20334 via the existing Steps tab test (unverified).

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback. Confirmed on dev `c63ffc2ccae`: nothing in `lib/galaxy_test/selenium` / `lib/galaxy/selenium` touches the graph; `navigation.yml` `invocations:` (L1269–1314) has no graph selectors; `playwright.yaml` runs the same suite. PRs #22142/#22159/#22144/#22476/#22335/#22105/#22769 merged, titles/unit tests match, none touched selenium or navigation.yml; #23861 only `test_workflow_editor.py`; #20334 no selenium files, #23778 body confirms the icon breakage; #21989/#22075/#22745/#3241 open issues. Selectors/classes cited all exist (Prev/Next/Hide have only `title`).

Edits in place:
- Show Connections test: terminals hold only an icon — now asserts output terminals lose `blank-output` and input/output names appear.
- #23778 sentence: notes the fix shipped with an icon-component unit test.
- Helper move: `test_workflow_rerun.py` has a duplicate `_invocations_panel_open_latest_invocation` → more reason to move `invocation_open_latest` into `navigates_galaxy.py`.

Extra dup search (7 GraphQL + 1 REST): none. #21742 unrelated; #23463 (open PR) touches no selenium/graph tests.

Left over: nothing run in a browser (Show Connections / isolate assertions unproven under both backends); parameter-input nodes may get no state class → test workflow should use data inputs only; still proposes small client change (`data-description` on step card buttons).
