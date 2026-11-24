Run via claude-opus-5-5 at high effort.

**Screenshots successfully obtained.** I captured a before/after pair for each case: before is `origin/release_26.2`'s editor code, after is the branch. The new Selenium test that records them is commit `53ba9a0284e` on top of `2885dc64873`. It is not pushed.

# Screenshot debrief: editor_subworkflow_map_over_tests

## Screenshots

All four are in `screenshots/`. Each uses the same workflow: a `paired` input and a `list:list` input next to a subworkflow step, `nested_workflow`. The subworkflow has one `list` collection input, `inner_list`, which feeds `collection_creates_list`. That tool's `list` output is exposed as `inner_output`.

| File | State | What it shows |
| --- | --- | --- |
| `before_paired_accepted.png` | base | Mid-drag of `pair` onto `inner_list`. The input terminal turns green (accepts) and no refusal tooltip appears, so the `paired` collection would connect to a `list` input. |
| `after_paired_refused.png` | branch | The same drag. The terminal turns orange and the tooltip reads "Incompatible collection type(s) for attachment." |
| `before_list_list_not_mapped.png` | base | `nested_list` connected to `inner_list`. The connector is a single line, and hovering `inner_output` shows only "output is list". No map-over. |
| `after_list_list_mapped_over.png` | branch | The same connection. The connector is drawn as the multi-line map-over noodle, the output terminal is marked mapped-over, and the tooltip reads "output is list and mapped-over to produce a list of lists dataset collection". |

## Test

`TestWorkflowEditor.test_subworkflow_collection_input_map_over` in `lib/galaxy_test/selenium/test_workflow_editor.py` sits next to `test_map_over_output_indicator` and follows `test_refused_connection_and_removed_step`.
- It uses `workflow_editor_try_connect` with `screenshot_partial` to check the refusal message, then `workflow_editor_assert_not_connected`.
- It connects the `list:list` input and checks `assert_node_output_is("nested_workflow#inner_output", "list", "list:list")`.
- It then hovers the output and records the mapped-over screenshot.

The workflow sets explicit node positions with `auto_layout=False`. Auto layout stacked all three unconnected nodes on top of each other.

- **On the branch:** passes under Playwright, alongside `test_map_over_output_indicator`.
- **Without the fix** (`terminals.ts` and `workflowStepStore.ts` reverted to `origin/release_26.2`): fails at the first assertion, `assert None == 'Incompatible collection type(s) for attachment.'`, because the editor accepts the `paired` drop.
- `ruff check`, `ruff format --check` and `black --check` are clean.

The "before" screenshots came from a temporary, uncommitted copy of the test with the assertions removed. I deleted it and restored both source files from `HEAD`, so the worktree is clean at `53ba9a0284e`.

## Problems encountered

None block the screenshots, but the local tooling needed workarounds:
- **`galaxy_e2e.sh` needs zsh, which isn't installed on this host.** I ran a bash port from the session scratchpad. It needed four fixes: the brace loop, `print`, the `(N)` glob qualifier, and the `macos` selenium-manager path.
- **pytest's `pytest_postgresql` plugin fails to import** because libpq is missing. Runs need `-p no:postgresql`.
- **Running against the Vite dev server fails.** On the first page load after login, Chromium fails hundreds of module requests with `net::ERR_INSUFFICIENT_RESOURCES`, so the page stays blank and `#masthead` or `.loggedin-only` times out. Raising the timeout multiplier didn't help. The workaround:
  - I stopped Vite, built the client (`pnpm run build`, about 2 minutes) and pointed `GALAXY_TEST_EXTERNAL` at this worktree's Galaxy directly.
  - The "before" state needed a rebuild with the reverted files.
  - I rebuilt once more after restoring them, so `static/dist` matches the branch head.
- The `(input)` suffix on the subworkflow output label ("inner_output (input)") is how the editor labels subworkflow outputs. The test doesn't cause it.

Galaxy and Vite are stopped.
