# Phase 4 review fixes debrief

Acted on every item in `phase_4_review.md`'s act-on list, Phase 4 open questions Q1, Q2 and Q4, and the `ItemPopoverLink` fetch race. That is 9 new commits on `compare_runs`, `240aa487296..c574a68acdb`. Nothing was rebased or pushed, and the pre-commit hook passed on each one.

Not acted on, per the review's own list:
- the "Other runs" `showHeader` gate;
- a Selenium-backend E2E run.

Also not done:
- a router unit harness for `redirectAnon` (none exists);
- an output-label E2E step (vitest covers it);
- migrating `test_histories_list.py`'s sleep-then-URL check to the new `assert_current_url_contains` (out of scope).

No security findings.

## Commits

| SHA | Subject |
|---|---|
| `8edf2ea8a75` | Expose output label facet and compared step type in comparisons |
| `e465c3816a5` | Regenerate client API schema |
| `5b206ce79d5` | Keep the comparisons page mounted across its query changes |
| `8e102731e67` | Tighten comparisons page URL handling and filters |
| `1c78b3a2a3f` | Explain jobless comparison rows by step type and run state |
| `d6ced374a01` | Keep anonymous users out of comparisons |
| `728d0569fa2` | Drop collection summaries that land after ItemPopoverLink's item changed |
| `bbfdb427245` | Tighten comparisons E2E and share invocation graph helpers |
| `c574a68acdb` | Pin paused and resumed run states in the pause step comparison test |

## Per item

| Item | Status | Commit |
|---|---|---|
| Bug 1: remount on every query change | Done. New `entry/analysis/routerViewKey.ts` holds `centerRouterViewKey(route)`: `/galaxyai` is unchanged, and `meta.keepMountedOnQueryChange` keys by `route.path`. The `/comparisons` route sets it. Knock-on fix: `ComparisonView` now clears the table when the URL's identity changes (kind, workflow_id, instance, step_label, tool_id), not just the kind, so filter changes keep the table. | `5b206ce79d5`, `8e102731e67` |
| Q1: `output_labels_available` | Done. Labels come from all of the page's versions before the `output_labels` filter, deduped, newest version first (column order). It is `None` for the other kinds. The page builds its options from facet ∪ selected; `seenOutputLabels` is gone. | `8edf2ea8a75`, `8e102731e67` |
| Bug 2: `?kind=toString` | Done with `Object.hasOwn(PARAMS, kind)`. Tests cover `toString` and `__proto__`. | `8e102731e67` |
| Per-kind URL allowlist | Done. `PARAMS` is a per-kind `{key: "string" \| "number" \| "boolean" \| "list"}` spec. `satisfies ParamSpec<StepRunsParams>` (and the others) fails type-check on a misspelt or missing key; I checked this by mutation and got 4 TS errors. Unknown keys are **rejected** in the error alert ("A tool_runs comparison does not take state."), so `updateUrl` can't carry them. It replaces `LIST/NUMBER/BOOLEAN_KEYS`. | `8e102731e67` |
| Typed `STATE_OPTIONS`, `never` checks | Done: `JobState[]` / `InvocationState[]`, and explicit `case "tool_runs"` plus a `never` default in `fetchComparison` and `displayStorageKey`. | `8e102731e67` |
| Pager wording follows sort | Done. `ComparisonPager` takes `sortBy`/`sortDesc` from the loaded `table.query`: newest/oldest first, and recently/least recently updated first. Both containers pass them. | `8e102731e67` |
| Q4: versionless display-pref key | The server echoes `tool_id` as given, so I mirrored the rule instead. New `versionlessToolId` in `utils/tool-version.ts` mirrors `versionless_tool_id`, with the same cases as `test_tool_version.py` plus 2 that pin where it differs from `extractBaseToolId`. `displayStorageKey` applies it, so the URL path and the echoed path agree. | `8e102731e67` |
| Q2: step type and pause state | Probed first: a pause row is `scheduled` both while paused and once resumed, so the invocation step's `action` is needed. `ComparisonRow` gains `step_type: WorkflowStepModuleType \| None`, a Literal over the `module_types` keys with a unit test keeping them in sync, and `step_action: bool \| None`. Both come from columns the existing queries already read, so the statement-count tests are unchanged. The API test also pins the invocation state: a paused run is `ready` and a resumed one `completed`. Row detail's "waiting for review" depends on that. | `8edf2ea8a75`, `c574a68acdb` |
| Bug 3: row detail | Done. One `noJobMessage`, in this order: empty mapped batch ("no jobs ran", plain "Job" heading) → job/subworkflow → not scheduled ("ended before reaching this step" once scheduling ended, else "yet") → pause by `step_action` (waiting for review / continued / rejected / not reviewed before the run ended) → input steps → "ran without a job". | `1c78b3a2a3f` |
| Anonymous gating | Done. `redirect: redirectAnon()` on `/comparisons`. Compare outputs and Other runs show only when `isRegisteredUser(userStore.currentUser)`; both tests now seed the user store. | `d6ced374a01` |
| `ItemPopoverLink` race | Done. The item-change watch also resets `collectionLoading`; previously the new item never fetched. A request token guards the result, the error and the `finally`. | `728d0569fa2` |
| E2E: empty-state wait | Done. New `comparison-empty` class and `empty_message` selector; the test asserts the exact text and 0 rows. | `bbfdb427245` |
| E2E: transpose assertion | Done: `aria-pressed`, 3 `transposed_run_links`, run row absent, then back to untransposed. | `bbfdb427245` |
| E2E: polling settle, shared helpers | Done. `invocation_graph_wait_for_polling_to_stop`, `invocation_graph_click_node`, `assert_invocation_step_card_title` and `assert_current_url_contains` are on `NavigatesGalaxy`. `exception_is_assertion_or_transition` and `retry_assertion_during_transitions` moved there and are re-imported by `framework.py`, so existing `from .framework import` lines still work. `test_workflow_invocation_graph.py` uses them. | `bbfdb427245` |
| E2E: label lookup, View all, unused selectors | Done: the job is found by `workflow_step_label`; the View all step checks the URL, 3 rows and the `summary` text; `row_expand` is used together with a new `row_detail` selector. | `bbfdb427245` |
| `navigation/schema.ts` | Hand-added `Rootcomparisons`, matching the generated naming such as `Rootjob_details`, and the root member. | `bbfdb427245` |

## Red to green

- **Unit:** asserting `output_labels_available` gave an AttributeError.
- **API:** `test_step_runs_not_run_yet` failed with `KeyError: 'step_type'`.
- **Vitest:** 26 new tests failed first. They cover:
  - versionless key (7);
  - pager sort (3);
  - row detail (8);
  - `toString`, `__proto__` and 2 unknown-key cases;
  - facet;
  - identity reset;
  - sort props;
  - stored prefs keyed by the versionless id.
  - "keeps the table while only filters change" passed from the start; it is a guard.
- **Router key:** the query-change case failed.
- **Anonymous gates:** 2 tests failed.
- **ItemPopoverLink race:** failed with 1 request instead of 2. Under a mutation dropping only the token guard, it fails on "my list".
- **E2E state filter:** with `states` temporarily stripped from the request, `test_comparison_pages_from_entry_points` failed (timeout on `.comparison-empty`). It was restored and `git diff` was clean afterwards.
- **E2E transpose:** with the transpose button made a no-op, `-k across_versions` failed (`Expected transposed=True, got 'false'`). The old assertion would have passed. Restored, with a clean tree.
- **Only seen green:** the facet's newest-first ordering in the API test.

## Tests (commands, counts)

- **Unit:** `source .venv/bin/activate && PYTHONPATH=lib pytest test/unit/app/managers/test_ComparisonsManager.py` gives **17 passed**.
- **API:** `GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true ./run_tests.sh --skip-common-startup -api lib/galaxy_test/api/test_comparisons.py` gives **18 passed**. `test_step_runs_not_run_yet` was rerun on its own after the state pin: 1 passed.
- **Vitest**, from `client/`: `npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run src/components/Comparison src/components/Common/ItemPopoverLink.test.ts src/components/Common/DatasetPopoverLink.test.ts src/components/WorkflowInvocationState src/components/JobInformation src/components/Workflow/StoredWorkflowInvocations.test.ts src/utils/tool-version.test.ts src/entry/analysis` gives **40 files, 273 passed**.
- **Client lint and types:** `pnpm run type-check` reports 0 errors. Before it would pass I had to rebuild `packages/api-client` dist with `pnpm run build`, because the regenerated schema isn't seen until then. eslint and prettier are clean on the changed files; the only warning is the pre-existing Analysis multi-word one.
- **Python lint and types:** ruff, black and isort are clean. Per-file mypy shows only patterns that were there before (Model-as-Any, untyped defs in selenium tests), none on changed lines.
- **E2E (Playwright)**, on Galaxy at `127.0.0.1:8091` (`scratchpad/start_galaxy.sh`) and vite on `5174`, because 8080 and 5173 were held by another worktree:
  - `test_comparisons.py` gives **2 passed** (100s);
  - `test_workflow_invocation_graph.py` gives **7 passed** (182s).
  - Both servers were killed by PID afterwards (gunicorn, pnpm and the vite child), and both ports are free.

## Notes / design choices for John

- Unknown URL keys are **rejected**, not dropped with a warning. A shared link with a typo shows an error instead of silently doing nothing.
- `step_action` exposes the raw review decision. The pause wording is computed on the client.
- **Existing stored display preferences:** `tool_runs` prefs keyed by a versioned Tool Shed id are orphaned. This is unreleased, so it is harmless.
- `redirectAnon()` is evaluated when the router is built, as in the existing routes.
