# Phase 4 review debrief

Verdict: approve with fixes. Acting on everything in the phase 5 pass: stable router-view key for `/comparisons` (generalise the `/galaxyai` precedent via route `meta`) plus an `output_labels_available` server facet; `Object.hasOwn` kind check; empty mapped-batch row detail; `redirectAnon()` on the route and anonymous gating of both entry buttons; E2E waits on the empty-state message, real transpose assertion, graph polling settle, shared helpers moved to NavigatesGalaxy, label-based step lookup, a "View all in a page" E2E step, hand-added `comparisons` interface in `navigation/schema.ts`; per-kind URL key allowlist with `satisfies`; typed state options and `never` exhaustiveness; pager wording follows `sort_desc`.

Not acted on:
- Gating "Other runs" on `showHeader` — kept; a DatasetDetails entry point is a design question for John.
- Selenium (non-Playwright) backend run — no chromedriver locally; CI covers it.

<details><summary>Full review</summary>

# Phase 4 review (raw)

This review covers commits `caa543e5b22`, `d82d88e87a6`, `22e884152a7` and `2802de613ed` in `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs`. The review was read-only: no tests were run, and line numbers are from `2802de613ed`. Phase 3 review findings are not repeated here, except where Phase 4 makes one worse.

## Verdict

**Approve with fixes.** The shape is right:
- one generic route that forwards the URL to the endpoint;
- list values repeat their key and are never comma-split;
- `BreadcrumbHeading` is used as in `HistoryInvocations`;
- the pager is extracted and shared with the step tab;
- the job action sits behind a prop;
- the `router.js` diff is minimal, and `navigation.yml` gets a new section.

There is one real UX bug (the remount), one crash on a crafted `kind`, and one wrong row-detail message. The E2E and gating need tightening. `schema.ts` drift does not break CI.

## Bugs

### 1. Every filter, page or page-size change remounts `ComparisonView` (high)

- **Cause:** `entry/analysis/modules/Analysis.vue:56` keys the centre `router-view` by `route.fullPath` (the only exception is `/galaxyai`). `comparisons` is a child of the `Analysis` route (`router.js:197` onward), so every `router.replace({ query })` in `updateUrl` destroys the component and creates a new instance.
- **Consequences:**
  - **The output-label filter is broken after the first click, not only on cold links.**
    - `seenOutputLabels` is component state, and the server drops unselected output columns (`managers/comparisons.py:174-178`).
    - Check label "a", and the remounted page offers only "a". To add "b" you must uncheck "a" first.
    - The debrief's open question 1 understates this.
  - **The table flashes on every change.** `table` starts undefined, so each change replaces the table with the "Loading runs" `LoadingSpan` (`ComparisonView.vue:255`). Expanded rows and scroll position are lost.
  - **`watch(kind, () => table.value = undefined)` is dead code**, because the instance never sees `kind` change.
  - **It compounds Phase 3 review bug #1.** That bug is the storage key taken from the response, here at `ComparisonView.vue:52`. With a remount on every click, each filter change with a stored `meta:*` display fetches twice.
- **Why tests miss it:** the vitest suite mocks `router.replace`, so nothing exercises a real query change.
- **Fix:**
  - Reuse the `1b27fe36174` precedent, which gave `/galaxyai` a stable key, but generalise it instead of adding a second path string.
    - For example, the route gets `meta: { keepMountedOnQueryChange: true }`, and `routerViewKey` uses `route.path` when it is set.
    - The component already follows `props.query` reactively, so nothing else changes.
  - Separately, consider a server facet `output_labels_available`, mirroring `tool_versions_available`. Then the filter options come from the response, and cold shared links work too.
  - **Test:** an E2E step that checks one output label and asserts that another label's checkbox is still offered. Or, in vitest, mount with the real test router and `router-view :key` semantics.

### 2. `?kind=toString` (or `constructor`, `__proto__`, `hasOwnProperty`) throws instead of showing the friendly error (medium-low)

- **Cause:** `comparisonQuery.ts:24` uses `isKind = typeof kind === "string" && kind in REQUIRED`. The `in` operator walks the prototype chain, so these names pass the check. `REQUIRED[kind].filter` then throws a TypeError, verified with node: `R["toString"].filter is not a function`. `STATE_OPTIONS[kind]` has the same problem.
- **Fix:** use `Object.hasOwn(REQUIRED, kind)`, or a `const COMPARISON_KINDS = ["step_runs", "output_runs", "tool_runs"] as const satisfies readonly ComparisonKind[]` with `.includes`. Add `{ kind: "toString" }` to the `it.each` in `ComparisonView.test.ts`.

### 3. Row detail's final `else` mislabels jobless rows that are not pause or input steps (medium-low)

- **Location:** `ComparisonRowDetail.vue:33,67-74`.
- **Case 1: an empty mapped-over batch.**
  - The API test `test_step_runs_mapped_over_empty_list` pins `state: "ok"` with `step_job` = ICJ, `job_count: 0` and `representative_job_id: null`.
  - `rowJob` returns `{ jobId: undefined, jobCount: 0 }`. The heading reads "Job 1 of 0", which is pre-existing, and the body now says "pause and input steps run without one". Both are wrong.
- **Case 2: an invocation that is failed or cancelled before reaching the step.**
  - Its row state is `new` (`_step_state` falls back to `"new"`), so the detail says "no job for this step **yet**" forever.
  - The server's cell reason is also `not_run_yet` for this case, so the client is at least consistent with it. The wording is still misleading once `row.run.state` is terminal.
- **Fix:**
  - Branch on `row.step_job` first. An ICJ with `job_count === 0` should read "Mapped over an empty collection: no jobs.", and the "Job 1 of N" heading should be suppressed for it.
  - Reserve the pause/input text for `step_job == null && state === "scheduled"`.
  - Optionally say "This run ended before reaching this step" when `row.run.state` is terminal.
  - The debrief's open question 2 is about exposing the step type. That would let the client stop inferring "pause" at all.
  - **Test:** add the empty-batch row to `ComparisonRowDetail.test.ts`.

## Access findings

None of substance; nothing for a private security note.
- **Anonymous users.** The API returns no runs for anonymous callers (`services/comparisons.py:71-73`), but:
  - The `/comparisons` route has no `redirect: redirectAnon()`. Nearby user-data routes such as `workflows/rerun` have it, so add it.
  - **"Other runs of this tool"** renders for an anonymous user on their own job page and leads to an empty page. Gate it on `!userStore.isAnonymous` as well as the prop.
  - The **"Compare outputs"** button on `StoredWorkflowInvocations` also shows for anonymous users, who can open a published workflow's invocations URL. `GridInvocation` already hides its list for them, so gate the button the same way.
- **Other users' jobs** (an admin, or a job page reached through sharing): the action links to *your* runs of that tool. That is OK semantically, given the "your runs only" summary. It is listed as a design question below.
- **Low nit:** a `tool_id` from the URL flows unencoded into `toolStore.fetchToolForId` → ``axios.get(`api/tools/${toolId}`)``.
  - With `?tool_id=../users/current` that becomes a same-origin GET of another API path. The result is stored as a "tool", and only `.name` is rendered as text.
  - Nothing side-effecting is reachable by GET, and `ToolLink`/`WorkflowStepTitle` already pass ids from other sources, so this is not a security issue.
  - Don't blindly `encodeURIComponent`, because Tool Shed ids contain slashes. It's fine to leave as is.

## Tests

### E2E (`lib/galaxy_test/selenium/test_comparisons.py`)

- **The state-filter assertion passes vacuously** (`:67`).
  - `row(run_id=newest_id).wait_for_absent()` is satisfied by the remount spinner (bug 1) before the filtered response arrives. It would still pass if `states=failed` were ignored.
  - **Fix:** add an `empty_message` selector (or reuse GTable's empty-state class) and wait for "No runs match these filters." Also assert `len(comparisons.rows.all()) == 0`.
- **The transpose step asserts nothing** (`:44-47`): `table.wait_for_visible()` is true in both orientations.
  - **Fix:** assert `transpose_toggle` has `aria-pressed="true"`, or that `row(run_id=…)` is absent and a transposed row is present.
- **No polling settle before the node click.**
  - `test_workflow_invocation_graph.py:175-177` waits on `invocations.polling_indicator` being absent before clicking nodes, with a comment that the graph re-renders until polling ends.
  - The new test clicks straight after `invocation_open_latest()`. It passed under Playwright, but this is the flake that helper exists for.
- **Copied helpers.** `_assert_step_card_title`, the node click and the polling settle now exist in two test classes.
  - Per John's reuse priority, and the plan leaving it to the reviewer, move `invocation_graph_click_node(label)` and `assert_invocation_step_card_title(label)` into `NavigatesGalaxy`, beside `invocation_open_latest` (`navigates_galaxy.py:2194`).
  - The retrying `_assert_url_contains` is generic too: `test_histories_list.py` does the same after a `sleep_for`.
- **Order-dependent fixture lookup** (`:70`): `["steps"][-1]["jobs"][0]` assumes `second_cat` is last. Look the step up by `workflow_step_label`, or use `order_index`.
- **"View all in a page" has no E2E.** `view_all_link` is defined but unused, so the step_runs page is never opened in a browser.
  - **Fix:** after the step tab assertions, click `view_all_link` and assert the 3 rows plus `kind=step_runs`. It is cheap with the same fixture.
- **Unused selectors:** `summary`, `row_expand` and `view_all_link`. Use them or drop them.
- **Unverified:**
  - The Selenium backend was not run. This is low risk: `GCheckbox` renders a real, visible native `<input>` (`packages/ui/src/components/GCheckbox.vue:172`), so the opacity-parity trap doesn't apply, and the other targets are anchors and buttons.
  - No red run was shown for the E2E.

### vitest

- They are good and mostly behavioural: forwarding with repeat keys, no comma split, `kind` dropped, required-key errors, URL writes with `offset` reset, the gate on the job action, and the hrefs.
- Missing:
  - the crafted-`kind` case (bug 2);
  - the empty-batch row-detail case (bug 3);
  - a test that unknown or unsupported keys are handled; see the design note on the allowlist.
- The `JobDetails` test asserts a prop pass-through (`includeOtherRunsLink` equals `showHeader`). That is borderline trivial, but it does fail under the mutation the implementer ran. Fine to keep.

### API

- The pause assertion (`test_comparisons.py:386-392`) pins current behaviour, with a clear one-line comment. OK.

## Design and reuse

- **Blind forwarding of every URL key** (`parseComparisonQuery`).
  - A misspelt `state=error` or `output_label=x` silently does nothing. It then persists through `updateUrl`'s `{ ...props.query, ...patch }`, and `as ComparisonRequest` hides it from the types.
  - John's "reject unsupported input" priority applies.
  - **Suggestion:** a per-kind allowlist typed against the generated params, for example `const STEP_RUNS_KEYS = [...] as const satisfies readonly (keyof StepRunsParams)[]`. Show unknown keys in the error alert, or drop them with a warning.
  - This also replaces the hand-kept `LIST_KEYS`, `NUMBER_KEYS` and `BOOLEAN_KEYS` sets with one per-key spec, and removes the two `as` casts.
- **`STATE_OPTIONS` typing** (`comparisonQuery.ts:103`): type it as `JobState[]` (`@/api/jobs`) and `InvocationState[]` (`@/api/invocations`), so a typo or a removed state fails type-check.
- **`fetchComparison`** uses `default:` for `tool_runs`. Use `case "tool_runs"` plus a `never` check, so a fourth kind is a compile error.
- **Filters vs `FilterMenu`.**
  - The repo's job-list filter idiom is `FilterMenu` + `Filtering` (`admin/JobsList.vue`), which is text-syntax based.
  - Checkbox groups that map 1:1 to API list params are simpler here, and they keep URL = API. I'd keep them, but the PR description should say why `FilterMenu` wasn't used, since a reviewer will ask.
- **The Other runs gate on `showHeader`** (`JobDetails.vue:33-37`) couples "show the header" with "standalone job page". It's acceptable (one route sets it, and the comment explains), but a dedicated prop set by the route would be clearer.
- **`DatasetDetails.vue:120`** (the dataset "i" page) uses `JobInformation` directly, and is arguably the most common way users reach a job. It would be a natural second place for `include-other-runs-link`. This is a design question; it was not in the plan.
- **Breadcrumb on `StoredWorkflowInvocations`:** the middle item (workflow name) has no `to`, whereas `HistoryInvocations` links its history. There is also no obvious workflow-view URL to link, so this is fine as is.
- **The pager summary hard-codes "newest first"**, but the URL now accepts `sort_by` and `sort_desc`, which are forwarded and parsed as booleans. Either derive the text from them, or don't offer them.

## `navigation/schema.ts`

- **Not CI-blocking.**
  - No workflow diffs or regenerates it. `lint_openapi_schema.yml` checks only the API `schema.ts`.
  - `tool_form_harness.yaml` lists `navigation.yml` only as a `paths:` trigger.
  - The four `ROOT_COMPONENT` vitest users touch only `preferences`.
- **Convention is mixed.** Most recent `navigation.yml` commits on dev don't touch `schema.ts`. John's own `a363bc72e26` did hand-add the matching line.
- **Recommendation:** hand-add a `Root_comparisons` interface, about 15 lines, plus the `comparisons` member on the root, rather than the 900-line regen. Or leave it and say so in the PR.

## Selector and heading regressions

- `grep` over `lib/galaxy_test/selenium`, `lib/galaxy/selenium`, `navigation.yml` and the client finds nothing that used GridInvocation's old "Workflow Invocations for Workflow …" heading on the stored-workflow page, so there is no regression.
- `GridInvocation` is untouched: `hide-heading` is the existing prop, as `HistoryInvocations` uses it.

## Nits

- `ComparisonView.vue:131-135`: `pageSizeOptions` adds an arbitrary `limit` from the URL to the select, which is fine. But `limit=abc` shows 25 while the server returns a 422 for it. That is harmless, and the error alert shows.
- `StoredWorkflowInvocations.test.ts` stubs `GridInvocation` but not the user store. It passes, but if the anonymous gate is added, seed the user.
- The `ComparisonRowDetail.vue:33` comment is good. Update it if bug 3 changes the logic.

</details>
