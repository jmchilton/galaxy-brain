Fix full Tool Shed GUID lookup in tool panel search and the browser navigation helpers used to select tools.

Pasting an installed tool’s full ID into an `id:` search should find that tool. A GUID such as `toolshed.g2.bx.psu.edu/repos/iuc/umi_tools_extract/umi_tools_extract/1.1.2+galaxy2` currently produces no result. The same IDs also break test helpers that match URL-encoded links or build CSS ID selectors from raw GUIDs.

| Lookup | Before | With this change |
| --- | --- | --- |
| Panel `id:<full GUID>` search | No matching tool | Finds the installed tool |
| `tool_open(<full GUID>)` | Link lookup times out | Finds and clicks the panel link |
| Discover Tools card helper with a GUID | Invalid CSS selector | Finds card controls and expands help |

***The user-facing change is literal substring matching in tool search; the selector changes support browser automation against existing tool links and cards.***

![Full GUID search finds the installed Tool Shed tool](screenshots/tool_panel_search_by_tool_shed_id.png)

***The regression fixture is a special-form tool: the tests prove GUID lookup and card controls, while its existing hidden-frame form-opening behavior remains a separate issue.***

<details><summary>Implementation and coverage</summary>

Search uses literal substring comparisons consistently, so punctuation in Tool Shed IDs is preserved. Tool panel helpers match `data-tool-id`; card helpers use quoted attribute selectors.

The search unit test includes a full GUID with `.`, `/` and `+`. Two Integration Selenium tests install `iuc/compose_text_param` 0.1.1 from the main Tool Shed, then exercise panel lookup and the Discover Tools card, version and favorite buttons, and help toggle. These tests depend on Tool Shed availability and can skip when it is unavailable. The special-form fixture has no card Open button, so that selector is not directly covered by this fixture.

![Discover Tools card help reached using a full GUID selector](screenshots/tools_list_tool_shed_tool_help.png)

</details>

## Risks

Risks are low and the changes are easy to revert (a two-way door). Literal matching affects shared tool-search helpers; existing search tests cover ordinary and filtered queries as well as the added GUID case. There are no API or stored-data changes.

## Context

Extracted from [the Galaxy UI driver branch](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), where `tool_open` needs to accept installed Tool Shed IDs. The search and selector fixes are needed together for that operation.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The search and selector fixes form one small lookup change.</summary>

The original scope evaluation preferred keeping the search and panel helper fixes together and leaving special-form routing separate. The later card-selector fold-in addresses the same GUID selector problem and has its own browser regression test and follow-up review. John chose to retain the current E2E and search unit coverage during polish.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>The regression checks fail at the search result or selector lookup on the old implementation.</summary>

Recorded red/green runs cover the search unit case and panel selector; the later card test reproduces the old CSS parse error. Historical local runs passed both Integration Selenium tests and eight tool-discovery regressions. The rebased patch is identical, and the focused search suite was rerun during polish: 25 passed. The prior fork head passed client tests/lint, Integration Selenium and Playwright; fresh CI on the rebased head is pending. Browser runs were not repeated locally during polish.

</details>

### ✅ Second Frontier Model Review

<details><summary>The earlier review returned no findings for the search and panel-selector changes.</summary>

That review ran before the card-selector fold-in. The fold-in received a separate code review; the final four-file diff also passed the fresh polish checklist review.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? A full-ID search finds no matching tool; browser helpers time out or report an invalid selector.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; the GUID case asserts the returned tool.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Focused test commands</summary>

From `client/`: `pnpm exec vitest run src/components/Panels/utilities.test.ts`.

From the repository root with the browser-test environment configured: `./run_tests.sh -integration test/integration_selenium/test_tool_shed_tool_ids.py`.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
