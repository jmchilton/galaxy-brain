Fix 🎯 #24093 - every collection element dropped into a "Multiple datasets" input now gets the server's `<hid>: (state) name` label, not just the first.

Put a tool's data input in batch ("Multiple datasets") mode, open a paired collection and drag its `forward` element in, then do the same from a second pair. The first chip gets the server's label with hid and state; the second keeps the client's placeholder.

| `release_26.1` (from the issue) | This branch |
| --- | --- |
| <img width="600" alt="Two dropped forward elements: the first labelled with its file name, the second labelled forward" src="https://github.com/user-attachments/assets/513978de-adc2-42a9-a8cf-38f8098cb231" /> | <img width="600" alt="cat1 in Multiple datasets mode with two chips, 2: (hidden) forward and 5: (hidden) forward" src="screenshots/tool_form_batch_dropped_collection_elements.png" /> |
| New test on `release_26.1`: `2: (hidden) forward`, `Selected: forward` | New test here: `2: (hidden) forward`, `5: (hidden) forward` |

The cause is in tool form build (`POST /api/tools/{id}/build`), not the client. The form state keeps only the first value of a batch selection on a single-dataset input. So the build response only has an option entry for that one, and the client falls back to its `Selected: <name>` placeholder for the rest. This branch has build read the raw request value as well, and send an option entry for every value in the batch.

***The client already shows whatever label build sends, so the fix belongs there: relabelling in the client would mean copying the server's label format, and the next build would still overwrite only the first value.***

***Only labels change. The form state, dependent parameters and the jobs a batch creates are the same as before: the extra values are read only to build option entries.***

***It's a server fix, so it covers more than drag-and-drop: any batch value the history list doesn't show, such as a hidden dataset, now gets its `<hid>: (state) name` label, like the first already did.***

<details><summary>Implementation</summary>

- `Tool.to_json` passes the flat request state (`params.__dict__`) to `populate_model` as `incoming`.
- `populate_model` threads `incoming` through repeats, conditionals and sections, keyed by the same `full_name` (`cond|input1`, `rep_0|input1`) as `options_pagination`, and passes `incoming_value` to `data` parameters. The duplicated paginated and unpaginated `to_dict` calls become one call.
- `DataToolParameter._selected_values` returns the state value plus each later batch value, resolved through `from_json` like the first. Values that fail to resolve (deleted, errored, unknown or malformed id) are skipped, so a bad later value can't fail the whole form. The result goes through the existing page, pin and carry path from #22643.
- `data_collection` inputs aren't changed. The tool form never sends them a batch of more than one value: they're single-select with batch disabled, and collection elements drag one at a time.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The build response gains option entries for selections it already partly described; no new fields, and nothing about execution changes.

<details><summary>Risk Review Advice</summary>

Check the `full_name` keying of `incoming` in `populate_model.py` for data inputs nested in conditionals and repeats; it mirrors `options_pagination`. The new test only drives a top-level input; the unit test calls `to_dict` directly.

Forward-merging into `release_26.2`/`dev`: expect mechanical conflicts in the `basic.py` and `tools/__init__.py` signatures (`Optional` vs `| None`) and next to new tests in `test_tool_form.py`. `populate_model.py` uses `| None` on purpose so it auto-merges cleanly there.

</details>

## Context

Builds on 🔀 #22643, whose pin/carry path labels selected values the history page doesn't list; this feeds it every batch value. ***Targets `release_26.1`, where it was reported. The fix extends #22643's paginated pin/carry code, which `release_26.0` predates.***

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope: a server-only build labelling fix for batch data inputs on 26.1.</summary>

Every possible expansion was weighed and left out. Collection-input parity isn't reachable from any client (probed in Playwright). A client relabel alone wouldn't fix the bug, and changes a drag helper other drop targets rely on. Selenium-backend drag parity is test-infra work for `dev`. 26.1 is the oldest branch with the pin/carry machinery. The forward-merge hazard it flagged (`Optional` left unimported in `populate_model.py`) is fixed.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approved the design; three small cleanups applied.</summary>

It found the build-only side channel, keyed like pagination, the least invasive option. Changing `to_python` would alter execution and dependent-param state. The merge-and-dedup loop moved into a single `_selected_values` helper, which copies the state list rather than mutating it. A redundant pagination guard and an issue reference in the test docstring were removed. File size and the `Tool.populate_model` pass-through were left alone as out of scope for a release branch.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the E2E test; its setup now reuses the paired-collection populator helpers.</summary>

The bug only shows as a client drop followed by a build round-trip, so an E2E test is needed. It asserts the exact chip texts, which fails on the issue's symptom, on a missing chip, or on the wrong element being dragged. `@playwright_only` stays because the Selenium drag helper never dispatches `dragenter`. A later unit test covers the backend path directly.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex returned no findings.</summary>

Read-only review of the fix, E2E test and selectors, with only the issue and house style as brief.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A later batch value that can't be resolved (deleted, errored, malformed id) is skipped and keeps the label the client gave it, as every later value did before; the form still loads.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The unit test checks the option labels `to_dict` returns for a batch of two hidden datasets plus a malformed id. It fails on the missing second label with the batch path disabled, and on `MalformedId` without the skip.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The E2E test is the first commit and failed with `['2: (hidden) forward', 'Selected: forward']`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- `lib/galaxy_test/selenium/test_tool_form.py::TestToolForm::test_batch_input_labels_dropped_collection_elements` (Playwright) creates two paired collections, switches `cat1` to Multiple datasets, drags each `forward` element in, and asserts both chips read `<hid>: (hidden) forward`.
- `test/unit/app/tools/test_data_parameters.py::TestDataToolParameter::test_field_display_every_batch_value` builds the field for a batch of two hidden datasets and a malformed id, and asserts both datasets get `(hidden)` labels.
- Manually: follow the issue's steps. Open a tool with a single-dataset input, switch to Multiple datasets, and drag `forward` from two different paired collections. Both chips should show `<hid>: (hidden) forward`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
