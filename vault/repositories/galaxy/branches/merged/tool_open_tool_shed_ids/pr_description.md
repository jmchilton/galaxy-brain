Fix full Tool Shed GUID lookup in tool panel search and the browser navigation helpers used to select tools.

Pasting an installed tool’s full ID into an `id:` or `tool_id:` search should find that tool; both prefixes are supported aliases. A GUID such as `toolshed.g2.bx.psu.edu/repos/iuc/umi_tools_extract/umi_tools_extract/1.1.2+galaxy2` currently produces no result. The same IDs also break test helpers that match URL-encoded links or build CSS ID selectors from raw GUIDs.

| Lookup | Before | With this change |
| --- | --- | --- |
| Panel `id:<full GUID>` or `tool_id:<full GUID>` search | No matching tool | Finds the installed tool |
| `tool_open(<full GUID>)` | Link lookup times out | Opens the tool form |
| Discover Tools card helper with a GUID | Invalid CSS selector | Finds card controls, expands help and opens the tool form |

***The user-facing change is literal substring matching in tool search; the selector changes support browser automation against existing tool links and cards.***

<details><summary>Implementation and coverage</summary>

Search uses literal substring comparisons consistently, so punctuation in Tool Shed IDs is preserved. Tool panel helpers match `data-tool-id`; card helpers use quoted attribute selectors.

The search unit tests cover a full GUID with `.`, `/` and `+` using both `id:` and `tool_id:`. Two Integration Selenium tests install the standard command tool `devteam/fastqc` 0.73+galaxy0 (revision `3d0c7bdf12f5`) from the main Tool Shed. They assert that panel lookup opens the expected tool form, and exercise the Discover Tools card, version and favorite buttons, help toggle and Open button, then verify the expected form version. These tests depend on Tool Shed availability and can skip when it is unavailable.

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

Both full-GUID search aliases fail against the original search implementation and pass with the fix. The focused search suite passes all 27 tests. Both revised FastQC Integration Selenium tests pass locally with the Playwright backend, including form opening from the panel and the card. Fresh CI for this test revision is pending.

</details>

### ✅ Second Frontier Model Review

<details><summary>The earlier review returned no findings for the search and panel-selector changes.</summary>

That review ran before the card-selector fold-in. The fold-in received a separate code review; the four-file implementation diff also passed the polish checklist review. The subsequent FastQC test revision has local test evidence and still needs a fresh human read.

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
