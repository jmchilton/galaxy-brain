# PR 23316 — Fix three CI failures on dev: minikube setup, subworkflow test race, GalaxyAI new-chat race

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23316 |
| **Author** | itisAliRH (Alireza Heidari) |
| **Base branch** | `dev` |
| **Head reviewed** | `f816a867c252568840f5b59ab079d8e5fd415320` (merge-base `0ce4ee0c76`) |
| **Size** | 4 files, +195 / -0 |
| **State** | OPEN, 0 reviews, 0 comments at time of writing; opened 2026-08-18 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23316` |
| **Verdict** | **Approve with comments.** All three fixes are correct and none of them weakens a test. The subworkflow wait is a legitimate race fix, not masking — I traced the race to the exact commit that introduced it. The comments are one durable-fix suggestion (pin the minikube action) and two reuse points; none blocks merge. |

---

## What it does

Three unrelated `dev` CI failures, one commit each.

1. `7b7240e0e5` — `.github/workflows/integration.yaml:108-112`, `sudo mkdir -p /etc/cni/net.d` before `medyagh/setup-minikube@latest`.
2. `44b6d87f1c` — `lib/galaxy_test/api/test_workflows.py:7077-7079`, wait on the subworkflow invocation before asserting its state.
3. `f816a867c2` — `client/src/components/GalaxyAI.vue:530-535`, staleness guard in the `currentChatId` watcher, plus `client/src/components/GalaxyAI.routesync.test.ts` (180 lines, new).

---

## Is fix (2) masking a server bug?

**No. It is a legitimate test-side race fix, and it is the missing half of a January refactor.**

This is the question I was asked to settle, so here is the whole chain.

### The race is real and intrinsic to how completion is recorded

`WorkflowCompletionMonitor._monitor_step` (`lib/galaxy/workflow/completion_monitor.py:74-96`) does:

```python
pending_ids = self.completion_manager.poll_pending_completions(handler=handler)
for invocation_id in pending_ids:
    self._check_invocation(invocation_id)
```

`poll_pending_completions` (`lib/galaxy/managers/workflow_completion.py:84-111`) selects **every** `WorkflowInvocation` in state `SCHEDULED` with no completion record — parent and subworkflow invocations alike, since a subworkflow invocation is an ordinary `WorkflowInvocation` row. There is no `ORDER BY` and no parent/child relationship in the query. `check_and_record_completion` (`:39-82`) then flips one invocation at a time to `COMPLETED`, with **no cascade to children**.

Crucially, the parent's completion predicate does *not* require the child to have been marked. `WorkflowInvocationStep._is_subworkflow_step_complete` (`lib/galaxy/model/__init__.py:10799-10822`):

```python
# Leverage subworkflow's completion state if available
if sub_invocation.state == InvocationState.COMPLETED.value:
    return True

# Otherwise check the subworkflow
return sub_invocation.is_complete
```

The `state == COMPLETED` branch is a fast path; the fallthrough recomputes completeness from job terminality. So the parent is `is_complete` as soon as all descendant jobs are terminal, entirely independently of whether the monitor has got round to stamping the child's own `state`. **"Parent is `completed`" therefore carries no guarantee about the child's `state` field, by construction.** Whichever of the two the loop reaches first wins; the other lands microseconds-to-one-monitor-tick later (`workflow_completion_monitor_sleep`, default 5.0s).

Handler assignment is not the problem: `lib/galaxy/workflow/run.py:747` copies `subworkflow_invocation.handler = self.workflow_invocation.handler`, so the child is polled by the same monitor. I checked this specifically, because if children were unhandled the added wait would hang for the full 60s `DEFAULT_TIMEOUT` rather than fix anything.

### The race was introduced by a specific commit, and this PR completes it

`git blame` on the test region tells the story cleanly:

- `f34b5e37ab` (mvdbeek, 2025-12-13, "Add failing test") wrote the test asserting `subworkflow_invocation["state"] == "scheduled"`. No race — `scheduled` is set by the scheduler, synchronously with the parent's own scheduling.
- `f611d7357b5` (mvdbeek, 2026-01-20, "Use wait_for_invocation_and_completion instead of asking for state to be scheduled or completed") tightened that assertion to `== "completed"` (`test_workflows.py:7086`) and added a completion wait — **but only for the parent** (`:7065`). The child assertion was tightened without the corresponding child wait. That is the defect, and it has been latent on `dev` ever since.

So the PR is not adding a wait to paper over a newly-misbehaving server; it is adding the wait that `f611d7357b5` should have added when it changed what the assertion means.

Corroborating detail: in that same January series, `de57d2169a` hit the **sibling** test (`test_run_subworkflow_with_optional_input_and_when_condition`, now at `test_workflows.py:7007`) with the identical problem and resolved it by **deleting the subworkflow state assertion entirely**:

```
-            # The subworkflow should have succeeded
-            assert (
-                subworkflow_invocation["state"] == "scheduled"
-            ), f"Expected subworkflow to succeed, got state: {subworkflow_invocation['state']}"
```

That sibling test today asserts only `messages == []`. Measured against that precedent, this PR does the *better* thing: it keeps the assertion and fixes the wait. Worth saying out loud given the standing "never weaken a test" rule — this PR moves in the opposite direction from the precedent it could have cited.

### The wait cannot hide a failure

- `wait_for_invocation_and_completion` (`lib/galaxy_test/base/populators.py:3249-3276`) raises `AssertionError` if the invocation reaches `failed` or `cancelled`, and times out at `DEFAULT_TIMEOUT = 60` (`populators.py:172`) otherwise. A subworkflow genuinely stuck at `scheduled` still fails the test — 60s later, with a `wait_on` timeout instead of the nicer `Expected subworkflow to succeed, got state: scheduled`. Slower and slightly less legible on genuine breakage; not silent.
- Every original assertion is retained: `state == "completed"`, `messages == []`, and the skipped-conditional-step checks below. Diff is +3/-0 in this file.
- The right helper was chosen. The established in-file idiom for this is `wait_for_invocation_and_jobs(history_id=..., workflow_id="whatever", invocation_id=sub_id)` (`test_workflows.py:3855, 3910, 3983, 3988`) — but that helper is explicitly deprecated in its own docstring (`populators.py:3226-3230`: *"Use wait_for_invocation_and_completion for new tests"*). The PR uses the non-deprecated successor, which needs neither the `history_id` nor the fake `workflow_id="whatever"`. That is the correct reuse call.

### Empirically a race, not deterministic

`gh run list --repo galaxyproject/galaxy --branch dev --workflow "API tests"` over the last 8 runs on `dev`: 7 success, 1 failure (2026-08-18T00:19Z). Intermittent, consistent with a scheduling race rather than a regression. (Integration, by contrast, is 6-for-6 red — see P2-1.)

### Verdict on the question

**Legitimate test-side race fix.** No server bug is being papered over: the parent-before-child ordering is what the code as written is designed to permit. There *is* a design improvement available on the server side (P3-1), but it is a follow-up, not a precondition for this PR.

---

## P2 findings

### P2-1 — `medyagh/setup-minikube@latest` is the only unpinned action in the repo; pinning is the durable fix

The workaround itself is correct. The action runs `sudo chmod 755 /etc/cni/net.d` without creating the directory, current runner images no longer ship it, and `sudo mkdir -p` creates it root-owned `0755` so the subsequent `chmod` succeeds. Both cited references check out — I verified via the API that `medyagh/setup-minikube#835` is the issue (correct for the code comment) and `#836` is the fix PR (correct for the PR body), both opened 2026-07-30 and both still open. No number confusion.

But the reason this fire happened at all is the pin:

```
$ grep -rn "uses: .*@latest\|uses: .*@main\|uses: .*@master" .github/workflows/
.github/workflows/integration.yaml:114:        uses: medyagh/setup-minikube@latest
```

**One hit in the entire workflows directory.** Everything else in `integration.yaml` is version-pinned (`actions/checkout@v7.0.1`, `astral-sh/setup-uv@v9.0.0`, `actions/cache/restore@v6.1.0`, `codecov/codecov-action@v7.0.0`), and `zizmor.yaml:28` pins its own action to a full SHA. `integration.yaml` is the only workflow that touches minikube at all, so this is a single line.

Why zizmor didn't catch it: `zizmor.yml` sets `unpinned-uses` policy `'*': ref-pin`, and `latest` is a real *tag* upstream (`refs/tags/latest`, confirmed via the API — there is no `latest` branch), so the rule is nominally satisfied. It is a floating tag the maintainer re-points, which is the worst of both worlds — it satisfies the linter while re-resolving on every run, and `.github/dependabot.yml:9-15` (weekly `github-actions` ecosystem, grouped) cannot bump it because there is no version to bump.

Suggestion, not a defect: pin to a released version in this same PR. That brings the action under dependabot management like every other one, makes the build reproducible, and closes an unreviewed-third-party-code-on-every-run supply chain surface. Keep the `mkdir` — a pinned old version still needs the workaround until #836 lands — but the pin is what stops the next surprise. Raising it here specifically because this is a CI-hygiene PR: it is the natural place, and there won't be a better one.

### P2-2 — `GalaxyAI.routesync.test.ts` is a ~120-line clone of `GalaxyAI.newchat.test.ts`

The two files' preambles differ by **four lines**:

```
$ diff <(sed -n 1,120p GalaxyAI.newchat.test.ts) <(sed -n 1,120p GalaxyAI.routesync.test.ts)
12c12  ... routerMock added to vi.hoisted
42,45  useRoute path "/" -> "/galaxyai"; useRouter () => ({...}) -> () => routerMock
```

Everything else — the two `@/api` mocks, `@/app`, the two child-component module mocks, five composable mocks, `getLocalVue`, `mountChat`, `messageTexts`, `sendMessage`, `deferredResponse`, the `scrollTo` shim — is byte-identical. `GalaxyAI.newchat.test.ts` was itself added recently (`2500382a6c`, "Add tests for starting a new GalaxyAI chat while one is in flight") and exercises the *same watcher*; the two files are testing two halves of one mechanism.

Two ways to collapse this, either fine:

- Make the route mutable and merge the files: `const routeMock = { path: "/" }` inside `vi.hoisted`, `useRoute: () => routeMock`, then set `routeMock.path = "/galaxyai"` in the route-sync `describe`'s `beforeEach`. One file, one `describe` per concern.
- Extract the preamble + `mountChat`/`sendMessage`/`deferredResponse` helpers to a `GalaxyAI/testHelpers.ts` (the `vi.mock` calls have to stay in the test file — they're hoisted per-module — but the helper functions and stub definitions can move).

The first is smaller and I'd do that. Left as-is, the next GalaxyAI concern gets a fourth 180-line file and any change to the component's dependency surface has to be applied three times.

Related nit, and evidence for the clone: the new file carries `// jsdom does not implement Element.scrollTo` (`:88`), copied verbatim from `GalaxyAI.newchat.test.ts:88`. `vitest.config.mts:29` sets `environment: "happy-dom"`. The shim is still needed; the comment names the wrong environment.

---

## P3 findings

### P3-1 — Server-side follow-up: completion could cascade to subworkflow invocations

Not blocking, and explicitly *not* a reason to hold this PR. But the invariant a reader would expect — "a parent invocation reported as `completed` has no descendant still reported as `scheduled`" — does not hold, and nothing enforces it.

It could, cheaply. By the time `check_and_record_completion(parent)` returns a completion, every descendant is already `is_complete` (that is literally what `_is_subworkflow_step_complete` just recursed through). Recording the descendants' completions in the same transaction, children first, would make the invariant true and retire this entire class of test race rather than one instance of it. Today it is not just a test concern: the invocation API serializes `state` for nested invocations, so a user can legitimately observe a parent `completed` above a child `scheduled` in the invocation view.

Two smaller notes in the same area, in case someone picks this up:
- `poll_pending_completions` has `limit=100` and no `ORDER BY`. Under a busy API-test run the child can be starved across iterations; a cascade removes the dependence on polling order entirely.
- `test_workflow_completion.py` has no test asserting anything about *nested* invocation completion. That's the coverage gap that let `f611d7357b5` ship half a change.

### P3-2 — The parent wait at `test_workflows.py:7065` is now redundant

`_run_workflow(..., wait=True, assert_ok=True)` already routes to `wait_for_invocation_and_completion(invocation_id)` (`populators.py:3115`), so the explicit parent wait one line later is a no-op. Pre-existing (added by `f611d7357b5` before `de57d2169a` moved the wait into `run_workflow`), not introduced here — but this is the commit touching those exact lines, and deleting it would make the remaining child wait read as the deliberate thing it is rather than as one of two identical calls.

### P3-3 — Reuse: `wait_for_workflow` already encodes the "walk steps, wait on each subworkflow" loop

`populators.py:2697-2711`:

```python
self.wait_for_invocation(workflow_id, invocation_id, timeout=timeout, assert_ok=assert_ok)
for step in self.get_invocation(invocation_id)["steps"]:
    if step["subworkflow_invocation_id"]:
        self.wait_for_invocation(None, step["subworkflow_invocation_id"], ...)
```

That is the abstraction the new test line is a hand-rolled instance of — except it uses `wait_for_invocation` (scheduling state), so it can't serve a `state == "completed"` assertion, and `run_workflow` only reaches it on the `assert_ok=False` branch. This PR is right not to touch it for a CI unblock; the observation is that the reusable version of "wait for an invocation tree to complete" is one `_and_completion` away and would be worth having before the third test needs it. Purely additive suggestion.

### P3-4 — The GalaxyAI guard is the right seam, but the file now has two staleness idioms

To answer the request-token question directly: **the identity guard is correct here, and a request-token/generation counter would be strictly worse.** The action being guarded (push the route to reflect the current chat) depends only on the *current* value, not on which handler is newest. Under A → B → A, a generation counter would suppress the resumed A handler's push even though `/galaxyai/A` is exactly the right destination; `currentChatId.value !== newId` correctly lets it through. `currentChatId` *is* the token.

Placement is right: `await chatStore.loadHistory(pageId)` (`GalaxyAI.vue:520-527`) is the only `await` in the watcher, and the guard sits between it and the route push. Nothing before the await is stale-sensitive — `chatStore.setActiveChatId(newId)` and `pageEditorStore.setCurrentChatExchangeId` run synchronously on entry.

Two observations rather than defects:

- There is no shared stale-async composable in `client/src/composables/` to reuse — I looked. `SelectionDialog.vue:90,142,152` (`providerRequestId`) is a hand-rolled local counter, one instance, not an abstraction. So "should have reused X" has no X. Worth knowing.
- But **the same file already has one**: `fetchConversation` uses a `conversationGeneration` counter (`GalaxyAI.vue:383-395`) with a comment saying the same thing. The file now guards stale async two different ways within 150 lines. Both are right for their respective jobs (see above), but a half-line in the new comment — "identity rather than a generation counter, because the route depends only on the current id" — would stop the next reader from treating the inconsistency as an oversight.
- Alternative one-liner, if the early return feels heavy: drop the captured `newId` from the route branch and read `currentChatId.value` at push time. Equivalent behaviour (`route.path !== targetPath` makes the stale case a no-op), one fewer branch. I'd keep the explicit guard — it's more legible — but noting it.

### P3-5 — Sibling awaits in the same file have the same hazard and are untouched

Not this PR's job, but naming them since the PR is establishing the pattern here:

- `watch(activeContext, ...)` (`GalaxyAI.vue:56-95`) awaits `fetchConversation` / `chatStore.loadHistory(pageId)` and then calls `fetchConversation(latestChat.id)` or `startNewChat()` with no check that `activeContext.value` is still `newCtx`.
- `onMounted` (`GalaxyAI.vue:137-186`) awaits through several branches and then does `if (!hasLoadedInitialChat.value) { showWelcome(); }`.

Both are downstream-protected in part by `fetchConversation`'s own generation counter, which is presumably why they haven't surfaced. Follow-up territory.

### P3-6 — Comments and Python style

Comments explain *why*, not *what*, in all three fixes — the minikube one names the upstream issue and the runner-image change, the test one names the ordering, the Vue one names the resume-after-await and the downstream `exchangeId` re-fetch. That's the right register. No new Python imports (function-local or otherwise) were added; the only Python change is three lines inside an existing test method.

Neither fix (1) nor fix (2) leaves a reusable abstraction behind, which is appropriate — they're both a single line at a single site. Fix (3) leaves behind a test file that *should* have been a reusable fixture (P2-2); that's the one place the accretion criticism lands.

---

## Packaging: should this be split?

**Keep it as one PR.** Recommendation, not a survey.

The revertability objection is real in principle — reverting the minikube step would drag the GalaxyAI fix with it — but it is defused by the shape of the change here: three clean single-purpose commits with good messages, so `git revert <sha>` on any one of them works without touching the others. That is the property that actually matters, and this PR has it. Against that: `dev` CI is red on three independent axes right now, three PRs means three review queues and three merge waits, and none of the three changes can conflict with the others (a workflow file, a test method, a Vue component).

If anything gets split out, it should be the minikube pin from P2-1 rather than any of the current three, since that's a policy change with a different reviewer audience.

---

## Verification

Ran, in the worktree at `f816a867c2`:

- `vitest run GalaxyAI.test.ts GalaxyAI.newchat.test.ts GalaxyAI.routesync.test.ts` → **18 passed**.
- **Red-to-green confirmed** for the new test. Reverse-applied the `GalaxyAI.vue` hunk (`git show f816a867c2 -- client/src/components/GalaxyAI.vue | git apply -R`) and re-ran: `1 failed | 1 passed`, failing exactly on `expect(routerMock.replace).not.toHaveBeenCalledWith("/galaxyai/exchange-123")` (`GalaxyAI.routesync.test.ts:175`) with the received calls being `["/galaxyai/new"]` then `["/galaxyai/exchange-123"]`. That is the bug, reproduced. Restored the file; worktree is clean.

  So on the "tests the mocks, not the mechanism" concern: **it tests the mechanism.** The heavy mocking is scaffolding to get the component mounted, not the subject. It is a fair-but-partial test — the mocked `useRoute` returns a constant `path: "/galaxyai"`, so the downstream half of the real bug (the `exchangeId` watch re-fetching the old conversation over the fresh one) is not simulated; what's verified is that the stale route push doesn't happen. That's the right proximate assertion, and the Selenium test covers the user-visible symptom. Also worth noting `propsData: { panel: true }` plus `chatLocation` defaulting to `"center"` is what makes `isRouteMode` true (`GalaxyAI.vue:106`) — a slightly odd panel-and-center-route combination inherited from the cloned file; `{}` would match the real scenario more closely.

  `client/node_modules` was absent in this worktree. Rather than `npm ci`, I symlinked the one from `~/projects/worktrees/galaxy/pr/23235` after confirming `client/package.json` is byte-identical between the two branches, and removed the symlink afterwards.

- Confirmed `Integration` is 6-for-6 red on `dev` (last green before 2026-08-08), `API tests` 7/8 green (intermittent), `Playwright tests` 5/8 green (intermittent) — all consistent with the PR body's diagnoses.
- Verified `medyagh/setup-minikube#835` (issue) / `#836` (PR) via `gh api`, and that upstream `latest` is a tag, not a branch.

## Not verified

- Did not run the Galaxy API test suite — no `.venv` in this worktree, and a single `test_workflows.py` case needs a full test server. The reasoning about the race is from the model and monitor source plus `git blame`, not from an observed run.
- Did not run the Selenium/Playwright `test_delete_chats_via_selection` case that motivated fix (3).
- Did not exercise the minikube step; correctness of `sudo mkdir -p` is reasoned from the action's `chmod` and the upstream issue, not observed on a runner. In particular I did not check whether the `none` driver needs *contents* in `/etc/cni/net.d` rather than just the directory — the upstream issue and the `minio/directpv` precedent the PR body cites both suggest the bare directory suffices, and CI on this PR will settle it.
- Did not lint the client changes (`eslint`/`prettier`) — only ran vitest against the borrowed `node_modules`.
