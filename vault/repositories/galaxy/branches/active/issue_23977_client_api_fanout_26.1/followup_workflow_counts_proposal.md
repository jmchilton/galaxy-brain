# Follow-up (dev): remove workflow-list `/counts` N+1

Issue: galaxyproject/galaxy#23977, row "Every workflow card fetches its own invocation count".
Target: `dev`, as a follow-up. A small client-only piece for 26.1 is suggested in the last section.
Read on release_26.1 (`b18269a10f8`) and `origin/dev` (`9fd083720a7`). The relevant backend and composable code is the same on both. On the client side, dev differs only in its Vue 3 idioms (`storedItems.value[id] = x`, not `set()`).

## Current state

### Client

- `WorkflowCard.vue` → `useWorkflowCardBadges(workflow, publishedView, filterable, hideRuns, …)`.
- `invocationCount = computed(() => invocationStore.getInvocationCountByWorkflowId(id))`. The store method is `useKeyedCache<number>(fetchInvocationCount)`. That issues `GET /api/workflows/{id}/counts` and **sums the per-state dict into one number**.
- **The badge shows only the total** ("never run" / "workflow runs: N", linking to `/workflows/{id}/invocations`). The per-state breakdown is thrown away.
- **The fetch fires even when no count badge can show.** `workflowCardBadges` builds all three count badges with `label: invocationText.value`, which reads `invocationCount.value` → `getItemById(id)` → fetch. Only `visible` short-circuits on `!hideRuns && !isAnonymous && !shared && !number_of_steps`; `label` is always evaluated. I confirmed this by reading the code, not by running it.
- Consumers:
  - `Workflow/List/WorkflowList.vue`: `loadWorkflows({… limit: 24, skipStepCounts: true})`, so `number_of_steps` is absent and the badge is shown. Up to 24 `/counts` calls per page.
    - On 26.1 the "my" list also holds workflows shared with me, because the index defaults `show_shared` to true. Their badge is hidden but still fetched.
    - The published and shared-with-me tabs fetch counts for other users' workflows, which can never show a badge.
    - Anonymous users on the published tab also fetch.
  - `Panels/WorkflowPanel.vue` (the editor and tool-panel workflow list): `WorkflowCardList :hide-runs="true"`, `skipStepCounts: false`. The badge is double-hidden, yet it still fires **one `/counts` per card, 20 per infinite-scroll page**.
  - `Workflow/WorkflowAnnotation.vue` → `WorkflowInvocationsCount.vue` (`v-if="owned"`): a single fetch per page. That is fine as is.
  - No other consumers on dev. The new curated-workflows tab doesn't use `WorkflowCard`.
- `keyedCache` never refetches a stored item, so counts go stale for the life of the pinia store. Seeding from each index load fixes that as a side effect.

### Backend

- `GET /api/workflows` (`webapps/galaxy/api/workflows.py::FastAPIWorkflows.index`) → `WorkflowsService.index` (`services/workflows.py`) → `WorkflowsManager.index_query` (`managers/workflows.py`).
- The payload is `WorkflowIndexPayload(WorkflowIndexQueryPayload)` in `schema/schema.py`. The response is untyped `list[dict[str, Any]]`; the client's `WorkflowSummary` is written by hand.
- The existing flag is `skip_step_counts` (opt-**out**, default False). `index_query` does `joinedload(latest_workflow).undefer(Workflow.step_count)`, where `Workflow.step_count` is a deferred `column_property` correlated count (`model/__init__.py` ~L13384). The service adds `item["number_of_steps"]` unless the flag skips it.
- `GET /api/workflows/{id}/counts` → `service.invocation_counts` → `get_stored_accessible_workflow` (owner, admin, importable or shared) → `StoredWorkflow.invocation_counts()`:
  ```python
  select(WorkflowInvocation.state, func.count(WorkflowInvocation.state))
    .select_from(StoredWorkflow).join(Workflow, Workflow.stored_workflow_id == StoredWorkflow.id)
    .join(WorkflowInvocation, WorkflowInvocation.workflow_id == Workflow.id)
    .group_by(WorkflowInvocation.state).where(StoredWorkflow.id == self.id)
  ```
  The result is per state, null states are dropped, and it covers every version. **There is no user filter**: it counts every user's runs of that stored workflow. Both `workflow_invocation.workflow_id` and `workflow.stored_workflow_id` are indexed.
- The only test is a unit test in `test/unit/data/test_galaxy_mapping.py` (~L499). There is **no API test for `/counts`**.

## Recommendation: an opt-in total on the index, not a batch endpoint

### Why not a batch endpoint (`GET /api/workflows/counts?ids=…`)

- It still costs an extra request per page.
- `keyedCache` has no id coalescing or batching, so the client would need a new batching layer, either debounced id collection or a page-level fetch-then-seed.
- It duplicates the access check per id.

The index already has the exact set of ids, and `skip_step_counts` is the precedent for "extra per-row aggregate on the index".

### Backend shape

- **Query param:** `include_invocation_counts: bool = False` on `index`, `WorkflowIndexQueryPayload`, and the populator's `index()`. It is opt-in so other index callers (panel, API users, BioBlend) pay nothing. *Name to confirm; see questions.*
- **Field:** `invocation_count: int` (the total; **not** per state, since the only consumer sums). It is present only when the flag is set.
- **Computation, option (b), recommended:** one grouped query in `WorkflowsService.index` after `query.all()`:
  ```python
  select(Workflow.stored_workflow_id, func.count(WorkflowInvocation.state))
    .join(WorkflowInvocation, WorkflowInvocation.workflow_id == Workflow.id)
    .where(Workflow.stored_workflow_id.in_(page_ids))
    .group_by(Workflow.stored_workflow_id)
  ```
  - Put it in a manager or model helper, e.g. `WorkflowsManager.invocation_totals(sa_session, stored_workflow_ids) -> dict[int, int]`. Share the join with `StoredWorkflow.invocation_counts()`, for example by factoring out a statement builder, so the two cannot drift.
  - Use `count(WorkflowInvocation.state)`, not `count(id)`, to match `/counts` exactly (it drops null states).
  - **Default missing ids to 0.** Never-run workflows produce no row. An absent value would make the client fall back to fetching.
  - The cost is one extra query per index page, not per row.
- **Option (a), alternative:** a deferred `StoredWorkflow.invocation_count` `column_property` (correlated scalar subquery), undeferred behind the flag. This mirrors `Workflow.step_count` and `skip_step_counts` most closely. Its catch is that `index_query` calls `get_count(stmt)` → `select(count()).select_from(stmt.subquery())` on a `DISTINCT` statement. If the undefer option renders inside that subquery, the correlated count runs for **every matching row**, not just the page. Avoiding that means adding the option after `get_count`, and that ordering is easy to break. A column property also can't take a user filter if we ever want one (see questions). (b) is simpler to reason about.
- **Scope:** compute only for rows owned by `trans.user`, the only case where the badge shows. For other rows, leave the field out, or set it to `null` if a stable shape is preferred. This keeps the published/shared lists from doing work that is never displayed. Anonymous users get nothing.
- **Unrelated, out of scope:** `service.index` also runs one `wf.show_in_tool_panel(user_id)` query per row. That is a server-side N+1, but it is invisible to rate limits. It is a candidate for the same grouped-query treatment later.

### Client

- `api/workflows.ts`:
  - Add `includeInvocationCounts?: boolean` to `LoadWorkflowsOptions` and pass `include_invocation_counts`.
  - Add `invocation_count?: number` to `WorkflowSummary`.
  - Regenerate `api/schema/schema.ts` for the new query param (`make update-client-api-schema`).
- `stores/invocationStore.ts`: destructure `storedItems` from the count `useKeyedCache` too. Add `saveInvocationCounts(workflows: WorkflowSummary[])` that sets `storedItems.value[w.id] = w.invocation_count` when that value is a number. This follows the existing `datasetStore.saveDatasets` precedent (dev style is plain assignment; 26.1 would need `set()`).
- `WorkflowList.vue::load`: pass `includeInvocationCounts: true` (only for the "my" list, or for all lists since the server scopes to owned), then call `invocationStore.saveInvocationCounts(data)` **before** `workflowsFetched.value = data`. Cards mount on that assignment, so seeding afterwards races and the fetches still go out.
- The keyed cache stays as the fallback. An older server (field absent) or an un-seeded card still fetches lazily, so the change is backward compatible.
- `WorkflowPanel` needs no backend flag once the gating change below lands.

## Test plan (red → green)

- **API** (`lib/galaxy_test/api/test_workflows.py`, beside `test_index_skip_step_counts`):
  - `test_index_include_invocation_counts`: set up one workflow with `_run_workflow_once_get_invocation(...)` and one never-run `simple_workflow(...)`.
  - Call `workflow_populator.index(include_invocation_counts=True)` and assert `invocation_count` is `1` and `0`.
  - Assert each equals `sum(GET workflows/{id}/counts values)`, the parity check.
  - Without the flag, assert the key is absent.
  - Optional: a workflow shared from `_different_user()` has no `invocation_count`, which pins down the owned-only scope.
  - Extend `WorkflowPopulator.index()` with the kwarg.
- **Optional unit test** in `test_galaxy_mapping.py` for the shared statement helper: run it over two stored workflows and check that a missing id defaults to 0.
- **Vitest:**
  - `WorkflowList.test.ts` already registers a `/api/workflows/{workflow_id}/counts` handler. Make it count calls. Have the mocked `loadWorkflows` return rows with `invocation_count`, then assert the handler hit count is **0** and that the badge renders `workflow runs: N`.
  - Red first: before the seeding change, the count equals the number of cards.
  - A second case with rows lacking `invocation_count` shows the fallback still fetches.
- **Gating test** for the 26.1 piece, in `WorkflowCardList.test.ts` or a new `useWorkflowCardBadges.test.ts`: mount with `hideRuns: true`, and separately with a non-owned workflow, and assert zero `/counts` hits.

## 26.1: a tiny client-only change that is worth it

**Gate the fetch on visibility conditions, not on viewport.** In `useWorkflowCardBadges`:

```ts
const showRuns = computed(() => !hideRuns && !isAnonymous.value && !shared.value && !workflow.value.number_of_steps);
const invocationCount = computed(() =>
    showRuns.value ? invocationStore.getInvocationCountByWorkflowId(workflow.value.id) : null,
);
```

This is about a 3-line change. It removes:
- all `/counts` calls from `WorkflowPanel` (20 per scroll page, every time the editor's workflow panel opens),
- the calls for shared-with-me rows in the "my" list,
- the calls on the published and shared tabs for others' workflows,
- the calls from anonymous users.

The owned cards on "My workflows" still fetch (≤24); the dev follow-up removes those. `shared` is reactive on `currentUser`, so while the user is still loading the card waits rather than fetching. The vitest above covers it. **Suggest this to the session working on the 26.1 client fixes. It was not applied here.**

Not worth it: IntersectionObserver / lazy-on-visible. About 24 grid cards are mostly in the first viewport anyway, and it adds complexity for little gain.

## Unresolved questions

- Flag name `include_invocation_counts` and field name `invocation_count`, or match the existing style more closely (opt-out `skip_*` vs opt-in `include_*`)?
- Should the count be scoped to the current user's runs? `/counts` counts every user's runs of the stored workflow, but the badge's link (`/workflows/{id}/invocations`) lists only your own runs (`test_only_own_invocations_indexed_and_accessible`). Keep parity for now?
- Owned-only: omit the field, or send `null` for non-owned rows?
- Pass the flag on every WorkflowList tab, or only "my"?
- Is the 26.1 gating change in scope for the other session's branch, or a separate small PR?
