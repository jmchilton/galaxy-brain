# Implementation debrief — workflow_editor_run_cancel

STATUS: READY, with two decisions for John (below). Base `release_26.2` @ `65132d40dac`; head `9a5cda91bed`; +171/−21 over 7 files. Not rebased onto the newer `origin/release_26.2`.

## Final branch

1. `a7337467234` Let workflow_run_specify_inputs fill the simplified run form (4b)
2. `f81806b03a3` Click the editor's Run activity in workflow_editor_click_run (7h)
3. `5b8de54dbdc` Name the invocation page's Cancel button in navigation.yml (7j)
4. `82b94422d2d` Test running a workflow from the editor and cancelling it. It also checks the cancel in the UI, takes 3 screenshots, and waits for the editor's loading shade before clicking Run.
5. `6adf47a8ac2` Match image input label in WORKFLOW_WITH_IMAGES_IN_REPORT_TEST_DATA (**decision 1**)
6. `b78c77d2bac` Select File inputs in workflow_run_setup_inputs. This is the scope expansion: existing callers now really select `type: File` inputs, and two existing tests are strengthened to assert it (each was red on the old helper).
7. `9a5cda91bed` Don't mark a loading workflow as changed in the editor. This is a client fix plus Vitest (**decision 2**).

## Hardening path

- Pass 1: challenge, polish, codex, thermo, baseline, scope, screenshots. The scope evaluation recommended expansion B.
- Re-scope: original kept as `workflow_editor_run_cancel_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). Expansion implemented and reviewed ([implementation_rescope_debrief.md](implementation_rescope_debrief.md)).
- Re-harden: every step rerun fresh. Codex and thermo found no issues. The baseline pass found nothing to split out. The second scope evaluation said keep as is.
- Screenshot runs exposed a cold-start flake. The editor counted a just-opened workflow as "unsaved" until its versions request returned, so the Run click hit a modal. The root cause is in `loadEditorData` (`Index.vue`). Fixed on both sides, each fix sufficient alone ([subagents/editor_unsaved_changes_flake.md](subagents/editor_unsaved_changes_flake.md)). The client fix had its own review ([subagents/client_fix_review.md](subagents/client_fix_review.md)).

## Tests

- Playwright: new test 3/3 including a cold restart. `test_execution_with_*` callers green, run one at a time.
- Selenium: new test and `custom_invocation_report` green.
- Vitest `Workflow/Editor/` 341/341, type-check clean.
- CI not yet observed.

## Decisions for John

1. **Fixture key `image_input_1` → `image_input`.** This is a test-data change. The old key never matched the workflow's input. The fixed helper now fails loudly on it. `galaxy_ui_driver` still has the old key.
2. **Client fix in this branch or split out.** It's a real 26.2 bug (dirty-on-load). The commit is last and drops cleanly; the test-side wait alone passed a cold restart. Branch title and description should mention it if kept.

## Deferred

- Shared form-mode helper.
- Canvas wait in `workflow_index_open_with_name` (owned by `workflow_open_exact_title`).
- `select_set_value` leaves the multiselect open.
- `"{hid}: "` prefix collision.
- The older `finally` reset that wipes edits made while versions are pending.
- `.markdown-component` raw selector.

## galaxy_ui_driver

4b, 7h and 7j now differ from the `galaxy_ui_driver` copies (docstring tweak). The test, fixture and helper fixes are new. Dropping these commits there on merge is not a clean drop; restack instead.
