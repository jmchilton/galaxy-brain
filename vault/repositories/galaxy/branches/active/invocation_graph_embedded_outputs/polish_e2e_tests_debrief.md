Run via claude-opus-5-5 at high effort.

# Polish E2E tests debrief: invocation_graph_embedded_outputs (stage 3)

The stage 3 E2E tests now load the test workflow the way the populators do, pass run options straight through to `run_workflow`, name each preview in static-check failures, and allow for subpixel rounding in the new no-overlap check; `test_star_preferred_output` gained a screenshot. The work was folded into the two commits that own the tests, with no new commits.

| Commit | Was | What changed |
|---|---|---|
| `e98e41cf423` | `fae83c40f54` | Editor star: `test_star_preferred_output` takes a screenshot |
| `c040c68ab9a` | `b55ea312e50` | Rebased only, no change |
| `24d04827bc0` | `c9982ae30a3` | Invocation graph E2E: N7, N8 and N9 below |

`83d9c442144` (backend) is unchanged. The base is still stage 2 (`3b546b24e6f`).

## Review nits

- **N7 (workflow loading).** The test now uses `from gxformat2 import python_to_workflow` and `gxformat2.yaml.ordered_load`, as `populators.py` does, so the `yaml` import is gone.
  - `_open_invocation(workflow, labels, **run_kwds)` forwards its keywords to `run_workflow`. The `str | dict` dispatch is gone, and so is the `test_data` parameter that only applied to dicts. `_open_output_kinds_invocation` passes `test_data=` and `client_convert=False` itself.
  - **The editor-dict route was not taken.** `run_workflow` uploads and invokes in one call. Setting the field through the editor dict before invoking would mean either uploading the workflow twice, or redoing the populator's test-data staging in the test. The editor save path is already covered, by `test_star_preferred_output` and by the API round-trip and versions tests. Converting once and adding the key keeps the test at one upload.
- **N8 (failure messages).** `_assert_static` takes its previews as a dict from label to element, and failures name the label: "top_rows's preview takes the pointer" or "head_table's preview takes the pointer". The cards are keyed by `data-output-label`, as before stage 3, and the steps by their step label.
  - No DOM decoration was needed: the test already knows which step each preview belongs to.
  - The focus failure now says "in a static preview" rather than "in an embedded output", since it also covers steps.
- **N9 (no-overlap check).**
  - A comment says the check is a property of `WORKFLOW_OUTPUT_KINDS`, not of the layout. The layout keeps any overlaps the author made, and this workflow has none, so the check shows that grown steps push their neighbours clear.
  - `ClientRect.clear_of` now allows `EDGE_TOLERANCE` (2px, the file's existing subpixel allowance) on every edge. This also applies to stage 2's cards-clear-of-steps check. Cards sit 20 workflow pixels from their steps, so the allowance doesn't weaken it.
  - The cat_table comment in the test now reads "clear of it, as checked above".

## Process checklist

- **Selectors.** Every selector is in `navigation.yml`:
  - `graph_step_preferred_output` mirrors `graph_embedded_output` (`table`, `table_row`, `table_pagination`).
  - `graph_step_preferred_output_controls` mirrors `graph_embedded_output_controls`.
  - `workflow_editor.node.preferred_output_toggle` uses the star's `data-description`.
  - No selector changed. The pre-existing `workflow_output_toggle` (`.callout-terminal`) already matched several buttons, including the visibility toggle. It still resolves to the workflow-output checkbox, which comes first in the DOM, and the star (also `.callout-terminal`) comes after it. Left alone.
- **Sleeps.** None in the stage 3 tests. Waits are `wait_for_present`, `wait_for_absent`, `assert_absent_or_hidden` and the retried geometry assertion.
- **Shared abstractions.** `_assert_static`, `_assert_cards_beside_their_steps(sources)` and `_open_output_kinds_invocation(preferred_outputs)` are shared with stage 2's tests already. There is nothing new to share across files. The repeated `aria-pressed` reads in `test_star_preferred_output` match the existing pattern in the same file (`test_editor_place_comments`) and in stage 2's toggle checks, so no helper was added.
- **Screenshots.**
  - `invocation_graph_embedded_preferred_outputs` is unchanged; the screenshot pass can reuse it.
  - **New:** `workflow_editor_preferred_output_starred` in `test_star_preferred_output`, taken after starring and before saving. It shows `out_file2`'s solid star beside `out_file1`'s outline star.
- **DOM decoration and client refactoring.** None needed. The star has `data-description` and `aria-pressed`, the preview has `data-description` under the step's `node-label`, and cards have `data-output-label`.
- **Consistency with stage 2's polish.** These follow the conventions settled there:
  - presence waits before counting table rows;
  - the toggle held in a local variable;
  - `ClientRect` with named constants;
  - file-local helpers;
  - `_settle_for_screenshot` before screenshots.

## Verification

- black, isort and ruff are clean on both Selenium files. mypy on the invocation graph file reports only the file's existing `no-untyped-def` errors.
- Before the fixups were committed, `test_embed_shows_steps_as_their_preferred_output` and `test_star_preferred_output` passed together on the Playwright backend (110s). I checked both screenshots.
- After the autosquash, the whole of `test_workflow_invocation_graph.py` and `test_star_preferred_output` were run together on the Playwright backend, against the worktree's running servers. All 11 passed in 559s, including stage 1's and stage 2's tests through the refactored helpers.
- The worktree is clean. Nothing was pushed.
