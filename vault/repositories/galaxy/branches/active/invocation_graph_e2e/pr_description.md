Toward 🎯 #3241 - browser tests for the workflow invocation Overview graph.

One test per interactive feature of the graph:

| Overview graph feature | Added in | Test |
| --- | --- | --- |
| Node state colours (a step with any failed job is red) | before 2026 | `test_failed_step_is_marked` |
| Step card title, step icon, **Prev / Next / Hide** | before 2026 | `test_step_card_navigation` |
| Isolate mode: other branches dim | 🔀 #22142 | `test_isolate_selected_step_lineage` |
| **Show Connections** toggle | 🔀 #22159 | `test_show_connections` |
| Read-only **Step Config** tab | 🔀 #22144 | `test_step_config_is_read_only` |
| Graph search | 🔀 #22476 | `test_search_selects_step` |

![Isolate mode: left_cat selected, right branch dimmed](screenshots/invocation_graph_isolated_step.png)

***This PR adds tests and test helpers only. The client changes are `data-description` attributes and one tab class, with no behaviour change.*** All 6 tests pass under both the Selenium and Playwright backends. Under Playwright, I broke each covered feature in the client (10 mutations), and every mutation turned the matching test red.

***These tests open the invocation after its jobs finish and wait for polling to stop, so they don't depend on live updates.*** A variant that opens the invocation mid-run failed once in 6 local Selenium runs on `dev`: nodes stayed at "1 job running" after the jobs finished. The likely cause is the Overview's own poll loop, which the fix branch for 🎯 #24138 removes. That variant is parked until the fix merges forward.

<details><summary>What changed</summary>

- **`test_workflow_invocation_graph.py`** (new): 6 tests. Five use one inline two-branch workflow (`input → cat` twice, explicit positions). Setup waits for every node to show `header-ok` and for job polling to stop, so tests click and screenshot a settled graph. The failed-step test reuses `WORKFLOW_KEEP_SUCCESSFUL_DATASETS`.
- **`navigation.yml`**: 16 `invocations` selectors (`graph_*`, `step_card_*`, `polling_indicator`). Nodes are found with the editor's existing `workflow_editor.node` selectors, which match the same `Node.vue` markup. Step Config reuses `workflow_editor.label_input`.
- **Client test hooks** (attributes only): `data-description` on the step card Previous/Next/Hide buttons, the search toggle and the "Polling for updates" badge, plus an `invocation-step-config-tab` title class.
- **`NavigatesGalaxy.invocation_open_latest`**: replaces the copies in `test_workflow_invocation_details.py` and `test_workflow_rerun.py`, resolving the TODO there. It shares a new `_ensure_panel_open` with `open_toolbox`. That method retries an activity click that lands while the activity bar is still settling, a race that left the Tools panel open once under Selenium.
- **`WORKFLOW_KEEP_SUCCESSFUL_DATASETS`**: gains node positions. Without them every node is stacked at the origin. Execution is unchanged for its other users.

</details>

<details><summary>Screenshots from the other tests</summary>

| | |
| --- | --- |
| ![Failed step](screenshots/invocation_graph_failed_step.png) | ![Step card](screenshots/invocation_graph_step_card.png) |
| `mixed_collection` red, downstream steps green | Step card for `left_cat` with wrench icon and Prev/Next/Hide |
| ![Show Connections](screenshots/invocation_graph_show_connections.png) | ![Step Config](screenshots/invocation_graph_step_config.png) |
| Show Connections draws only the active node's terminals | Step Config shows `left_cat`'s label, read-only |
| ![Search](screenshots/invocation_graph_search.png) | |
| Search for `right_cat` finds one result | |

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Adds about 2.5 minutes to the Playwright and Selenium suites (one workflow run per test, about 25 s each).
- Merging 🎯 #24138's fix forward from `release_26.2` will need a small merge in `navigation.yml`'s `invocations` block and `test_workflow_invocation_details.py`. Drop that branch's class-local `invocation_open_latest` in favour of the `NavigatesGalaxy` one.

</details>

## Context

Covers the 2026 invocation graph work (🔀 #22142, #22159, #22144, #22476). Upcoming work on this view (🎯 #21989, #22075, #22745) will run against these tests.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented: it covers every untested graph feature except Steps-tab search.</summary>

- Expanding to the live-update test was rejected for now: it's red 1 in 6 on `dev` until #24138's fix merges forward.
- Steps-tab search is a small optional follow-up.
- Contractions were rejected: folding the failed-step check into a Steps/Debug test, skipping the helper move (a third copy), and running the workflow once per class (the tests change graph UI state, so they'd depend on order).
- Canvas details (minimap colours, zoom cap) are left to unit tests and manual checks.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Two simplifications applied; `framework.py` dropped out of the diff.</summary>

- `invocation_open_latest` now uses the retrying `wait_for_and_click` instead of a row-count closure. That made moving `retry_assertion_during_transitions` unnecessary, so the move was reverted.
- The search test clicks its result through a retrying wait instead of reusing a stale element.
- Splitting the 3346-line `navigates_galaxy.py` was declined as out of scope.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>10 client mutations, each turned the matching test red under Playwright; no test changes needed.</summary>

- Mutations covered: Node dimming off, upstream lineage skipped, Next/Hide no-ops, step icon removed, Show Connections stuck off or on for every node, error state reclassified, Step Config fieldset enabled, and search click not selecting the step.
- Not acted on: Prev/Next disabled state at the ends (already guarded in code), and `managed_history` or shared setup for the two-branch tests.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex review of the diff returned no findings.</summary>

It reviewed an earlier head (`73fcf359e6c`, before the thermo-nuclear simplifications) read-only across 25 files (the diff plus the surrounding graph components, Playwright adapter and fixtures). It assessed both-backend compatibility statically.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A wait timeout naming the selector, or an assertion with the values (`Expected step card for right_cat, found 'Step 3: left_cat'`), plus the failure screenshot.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. These are browser tests of what users see, and each turned red under a client mutation.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The fixture change adds only node positions.
- [x] Who hits this in practice and what is the evidence? Galaxy developers changing the invocation view or the editor's graph components, which the graph draws read-only.
- [x] Were simpler or existing approaches considered? Yes. Vitest component tests already cover the pieces, but not the graph, step card and search working together against a real invocation. Folding checks into the existing tab tests would report graph failures under the wrong test.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Run locally</summary>

`lib/galaxy_test/selenium/test_workflow_invocation_graph.py` passes 6/6 locally under Playwright and Selenium. `test_workflow_invocation_details.py` and `test_workflow_rerun.py` now use the shared `invocation_open_latest`. They passed locally under both backends at earlier heads, and in Playwright CI at this head.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
