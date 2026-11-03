Run via claude-opus-5-5 at high effort.

Screenshots successfully obtained.

## Screenshots

All captured by `TestWorkflowInvocationGraph::test_hover_previews_step_outputs` in `lib/galaxy_test/selenium/test_workflow_invocation_graph.py` (Playwright backend, 1280x1000), against the `WORKFLOW_OUTPUT_KINDS` "Output previews" invocation.

- `screenshots/01_default_graph.png` — The finished invocation graph before any hover: three named inputs (measurements, quality plot, two lines) feeding the table branch, image copy, text split and two-output step. Test screenshot `invocation_graph_output_kinds` (new).
- `screenshots/02_hover_table.png` — Hovering `head_table`'s output: popover labelled with the workflow output `top_rows`, showing the five-row table preview. `invocation_graph_output_preview_table`.
- `screenshots/03_hover_image.png` — Hovering `copy_image`'s output: the `plot` output's PNG (quality boxplot) drawn in the popover. `invocation_graph_output_preview_image`.
- `screenshots/04_hover_collection.png` — Hovering `split_text`'s output: the `lines` list collection previewed with its two elements. `invocation_graph_output_preview_collection`.
- `screenshots/05_hover_multiple_outputs.png` — Hovering the two-output `numbers` step: both outputs listed, `output_a` (by output name, not a workflow output) and `numbers_b` (workflow output label), with their text content. `invocation_graph_output_preview_multiple_outputs`.

## Test changes (folded into "E2E test for invocation graph output previews")

- The workflow has `name: Output previews`, so the header reads "Invoked Workflow: Output previews" instead of "Workflow".
- The three test_data inputs are named (`measurements`, `quality plot`, `two lines`), so input nodes and the history show those instead of `Test_Dataset`.
- New baseline screenshot `invocation_graph_output_kinds` after the graph settles (all ten steps `ok`, polling stopped).
- Before that screenshot the test moves the pointer off the Workflow Invocations activity and waits for its "Show all workflow runs" tooltip to hide (new `invocations.activity_tooltip` selector in navigation.yml). It also blurs the activity link, because the Escape presses that close each popover otherwise drew a keyboard focus ring on it in every hover screenshot.
- The commit message now mentions the graph screenshot.

No product or CSS changes. The popover looked clean at its current sizing: the table popover is narrower than the spike's and hides less of the graph, the image renders at full size, and the multi-output popover stacks labels and previews with clear spacing.

## Comparison with the spike screenshots

Same graph layout and the same four preview kinds as the spike's 01-05. Differences:

- Window is 1280 wide (the test default) instead of the spike's 1600, so the history panel sits closer and the multi-output popover overlaps its edge. Placement is GPopover's default flipping; the content is fully visible.
- The history panel lists the invocation's datasets (the test runs in the current history); the spike showed an empty, non-current history. Input datasets are readable, but tool outputs keep Galaxy's default "Concatenate datasets (for test workflows) on ..." names.
- The spike showed its unrelated "Embed Outputs" stage-2 toggle; this branch has none, as intended.

## Not captured

- A running step's "This output isn't ready yet" preview was skipped. Holding a step in `new`/`queued`/`running` long enough to hover it would need a sleep or a timing-dependent tool, which the brief ruled out.

## Problems while recording

- None blocking. The first run showed the activity tooltip in the baseline frame and the focus ring in the hover frames; both fixed as described above.
- The autosquash rebase (`git rebase -i --autosquash origin/dev`) also moved the branch onto the current `origin/dev`, which is 6 client-only commits newer (including `NodeInvocationText.vue`). Vitest and the full Selenium file were re-run on the rebased HEAD.
