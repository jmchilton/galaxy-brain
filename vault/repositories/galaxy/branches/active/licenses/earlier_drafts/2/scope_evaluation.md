# Scope evaluation: licenses

**Recommendation: expand scope, modestly.** Retain the core feature: unconditional, all-of `<license_agreement>` requirements, `binds="submission"` by default with `binds="user"` opt-in, server-side enforcement for tools and workflows, and UI prompts. Alongside it, close the gaps the branch itself documents in code it touches: tool access in workflow agreement discovery, licensed converters in `/api/datatypes/converters`, missing tests for commits 2 and 4 and for the documented resume/rerun and `when`-skip contracts, one-time hashes in the in-tree gxwf runner, and PostgreSQL GDPR-purge coverage.

Don't add conditional `<when>`, admin acceptance or credentials-on-preconditions. A tools-iuc wrapper pilot should go ahead as a companion PR outside this branch. DIRECTION.md's call to narrow is already mostly met by what was built. The one real contraction left is dropping `binds="user"`. It is listed below as a decision for John, not as the recommendation.

Reviewed at head `270dafaf60c`, which is 18 commits on `origin/dev` `0073b5e9224`. Sources: every doc in this directory, including `earlier_drafts/1/`, plus [#23261](https://github.com/galaxyproject/galaxy/issues/23261) and its 2 comments.

## Possible Decompositions

Branch size, as added lines:

| Part | Lines |
|---|---|
| Whole branch, 110 files | ~6.9k |
| Generated `schema.ts` (×2) | ~675 |
| Tests and fixture tools | ~3.15k |
| Production code and docs, non-generated | ~3.05k, including ~340 lines of the docs page |

Commits 1–4 already form a pre-feature stack:
- baseline tests;
- the precondition extraction, which turns the bare assert into 403009;
- `walk_tool_steps` with the `get_all_tools` dedupe;
- the missing-tools check moved ahead of `build_workflow_run_configs`.

**Caveat for every backend/UI cut.** The "UI" commits are not purely client code:
- `eeb71ff62f0` (tool form and preferences) changes `managers/license_agreements.py`, `services/license_agreements.py`, `tools/__init__.py` and API tests.
- `d8f7b4c059a` (refresh workflow run forms) adds the typed `WorkflowLicenseAgreementResponse` and `GET /api/workflows/{id}/license_agreements`. It also unifies the refusal payload on `describe()` and regenerates 138 lines of `schema.ts`.

So a "backend first" PR can't be cut on today's commit boundaries without moving those hunks into earlier commits.

### Option A: pre-feature stack, then feature (2 PRs)
1. Commits 1–4, about 300 lines: the generic `ToolExecutionPrecondition` abstraction with the structured 403009 error, `Workflow.walk_tool_steps`, and the missing-tools orphan-history fix. All of these change dev behavior a little.
2. Commits 5–18: the whole license feature.

This is the cheapest split, because the commits are already separate. The feature PR is still about 6.5k lines.

### Option B: three small pre-feature PRs, then feature (4 PRs)
1. Commits 1–2: preconditions and 403009. Commit 2 also changes `POST /api/tools`.
2. Commit 3: `walk_tool_steps` and the `get_all_tools` dedupe, which affects the `missing_tools` index and the IWC agent operation.
3. Commit 4: the missing-tools-before-history fix. It is a dev bug fix that could target a release branch once it has a test.
4. Commits 5–18.

Each refactor gets its own reviewer and CI signal. Commits 3 and 4 don't depend on commit 2.

### Option C: the issue's own sequencing (3 PRs)
1. Phase 0, commits 1–4.
2. Backend chain, phases 1–6: commits 5–10, plus 15–16 (indirect paths, converter filtering) and the backend hunks of 11 and 14. The result is an API-enforced feature with no UI.
3. UI and docs: the client parts of commits 11–14, plus 17–18.

This matches what #23261 says under "Sequencing", and the backend reviewers differ from the client reviewers. It needs a history rewrite to move the backend hunks out of 11 and 14, as the caveat above describes. Merging 2 without 3 makes licensed tools usable only through the API.

### Option D: storage and API layer, then enforcement, then UI (4 PRs)
1. Phase 0 (commits 1–4).
2. Parsing, XSD, linters, models, migration, manager and discovery/acceptance API (commits 5–8). It is inert: nothing enforces it yet.
3. Enforcement: job creation, workflow invocation, indirect paths and converters (commits 9–10, 15–16).
4. UI and docs (commits 11–14, 17–18), with the same caveat as Option C.

The migration and schema get their own review, which suits database reviewers. Shipping PR 2 alone gives a tool author an element that does nothing. Merge it only together with PR 3, or keep both on a gh-stack.

### Option E: vertical slices (3 PRs)
1. Phase 0.
2. Tools, end to end: parsing, storage, manager, tool API, job enforcement, the tool form, preferences and the refused-submission display. These are commits 5–9, 11, 13 and 15–16, plus the tool hunks of 14.
3. Workflows, end to end: `walk_tool_steps` consumers, invocation enforcement and pinning, the workflow discovery endpoint, the run-form prompts and the refusal refresh. These are commits 10 and 12, plus the workflow hunks of 14.

Each PR can be demonstrated in the UI. With PR 2 alone, licensed workflow steps still fail closed when scheduled, because `DefaultToolAction` checks preconditions. But there is no preflight, no prompt and no `license_not_accepted` failure reason, so workflows with licensed tools can't be used until PR 3. Land them back to back.

### Option F: user-binding as its own layer (3 PRs)
1. Phase 0.
2. Submission-only feature: the agreements table, job and invocation associations, one-time hashes, enforcement and prompts.
3. `binds="user"`: the events table, the user acceptance API, the preferences page, purge and pgcleanup, and the "remember" checkbox.

This lets reviewers argue about standing acceptance, which is the concern in Nicola's comment, separately. It needs the most rework: the migration, manager and client are currently built with both scopes together.

## Scopes considered

### 1. As implemented

Unconditional, all-of agreements under `<requirements>`, gated at profile 27.0. Each agreement is identified by a content-addressed hash, and binding is submission or user. Enforcement happens on `/api/tools`, on `/api/jobs` tool requests and on workflow invocations, with scheduling-time re-checks and per-invocation pins. Prompts appear in the tool form, both workflow run forms and a preferences page. The branch also documents its known defects.

| Pros | Cons |
|---|---|
| Fixes the real bug: an affirmation is no longer a parameter that gets baked into a workflow step or replayed on rerun. | Two "known defects" in code this branch wrote are still open: workflow discovery ignores tool access, and `/api/datatypes/converters` lists licensed converters. `pr_description.md` is stale: it still lists the mixed-binding P1, which is fixed. |
| The FOLLOW_UPS P1 (binds lost on dedupe) and P2 (DOM ids) are fixed, and so is the orphan history on refusal. | Commit 2's 403009 for an ordinary inaccessible tool, and commit 4's orphan-history fix, have no red-to-green test. |
| A thorough test stack: unit, API, integration, Playwright and Selenium. | gxwf tests can't use licensed tools, so workflow authors can't test them. |
| Matches the v1 scope decisions recorded in #23261. | The PostgreSQL purge path is covered only for non-GDPR, and is skipped locally. |

### 2. Modest expansion: close the gaps in touched code (recommended)

As implemented, plus two small code fixes for leaks in discovery and listing, the missing red-to-green pins, the Galaxy-side gxwf support and the PostgreSQL validation. No new feature semantics are added. The items, referred to in the table:
- **(a)** `workflow_license_agreements` checks `allow_user_access`, or reuses `get_accessible_tool`, before it exposes terms.
- **(b)** `view_converters` (`/api/datatypes/converters`) uses the same licensed-converter filter as `get_converters_by_datatype`, or marks those converters.
- **(c)** An API test that a non-license inaccessible tool returns 403009 from `POST /api/tools`.
- **(d)** An API test that missing tools plus `new_history_name` creates no history, for commit 4.
- **(e)** Tests that pin the documented creation-bound contract (FOLLOW_UPS #5): paused resume and automatic resubmission aren't re-checked after a revoke, and a new rerun or remap without acceptance is refused.
- **(f)** A `when=false` regression for the conservative preflight (FOLLOW_UPS #8).
- **(g)** One-time hashes carried by the in-tree gxwf runner (`lib/galaxy_test/workflow/test_framework_workflows.py`), with one licensed `.gxwf-tests.yml` fixture (FOLLOW_UPS #7, Galaxy side only).
- **(h)** The pgcleanup GDPR path and the case of an event granted for another user (FOLLOW_UPS #6), plus migration upgrade/downgrade, validated by CI on PostgreSQL.

| Pros | Cons |
|---|---|
| Each item is a bug or a missing pin in code this branch introduced or changed. Reviewers will ask for them. | Adds work to an already large branch: (a), (b) and (g) need code, and the rest are mostly tests. |
| (a) removes an information leak from the "known defects" list in the PR description. | (g) adds an optional field to the gxwf test schema. Planemo still needs its own follow-up. |
| (c) and (d) give the pre-feature commits their own coverage, so Options A and B can be split off cleanly. | (e) and (h) need a slower integration setup (pause/resume, Postgres). |
| (g) is the reusable piece the interactor already provides for tool tests. Without it, no workflow test can use a licensed tool. | |

<details><summary>Notes</summary>

- (a) is a correctness and privacy-of-terms issue, not a user-data issue. Agreement terms are the same for every user, and the gap is already public in `pr_description.md` and the docs. `toolbox.get_tool(..., user=)` does not apply `allow_user_access`.
- (e): the docs table (`tool_license_agreements.md`, "Resuming a paused job, automatic resubmission | not checked again") already states the contract. This only adds tests for it; it doesn't change behavior.
- (h) is validation, not a known SQL defect.
- Lazy fetching of terms (FOLLOW_UPS #8, second half) stays out until payload sizes are measured.

</details>

### 3. Larger expansion: conditional applicability (`<when expression=...>`)

Add the CWL-JS `when` described in the issue's "Conditional applicability extension". It would let Clair3/artic (Rerio models), GEMINI (CADD) and InterProScan migrate.

| Pros | Cons |
|---|---|
| Covers the majority of real IUC cases, which are conditional. | #23261 marks it out of scope for v1, and DIRECTION.md says not to commit to it yet. |
| Applicability gets designed while the code is fresh. | Needs a general `job_runtime` extension for dynamic-option row fields first (Clair3). |
| | Enforcement found late breaks the fail-fast workflow preflight and needs a recoverable workflow state. |
| | No pilot has shown demand yet. |

### 4. Larger expansion: alternative entitlements (OR)

Support "academic use **or** a purchased license" (MAKER) as an alternative operator.

| Pros | Cons |
|---|---|
| The issue's MAKER recipe (split it into two agreements) is wrong under all-of enforcement. This would make the recipe work. | DIRECTION.md says to clarify bearer and eligibility with maintainers first. |
| | No migration is ready. The new docs already state the all-of limit. |

The right fix inside this branch is to correct the MAKER advice in the issue, not to build an OR operator.

### 5. Larger expansion: admin and instance-wide acceptance

The deferred §7 of the issue. The `granted_by` columns already exist.

| Pros | Cons |
|---|---|
| Lets operators of single-purpose instances skip the prompts. | Explicitly deferred in the issue. |
| The schema is already prepared. | Raises a policy question (can an admin affirm a submission-bound statement for a user?) that no reviewer has weighed in on. |

### 6. Larger expansion: credentials enforcement on the precondition abstraction

Route `<credentials>` checks through `ToolExecutionPrecondition`, and merge `get_accessible_tool` with `_get_materialized_tool`.

| Pros | Cons |
|---|---|
| Phase 0 builds a general abstraction, and this gives it a second real consumer. That answers the "Unused Infrastructure" rule. | Tabled in the issue. It changes existing endpoints from 401 to 403. |
| Removes the near-duplicate flagged by the thermo-nuclear review (B4). | A different surface, with its own Selenium coverage. |

<details><summary>Notes</summary>

Today the abstraction's consumers are access and license agreements. Access is a real dev consumer, so the infrastructure is not unused. Credentials would be the natural third consumer, but it changes API status codes and belongs in its own PR.

</details>

### 7. Companion: tools-iuc wrapper pilot (outside this branch)

Migrate one unconditional wrapper, such as MEME, sfold or pear, to `<license_agreement binds="submission" path=...>` in a companion tools-iuc PR. DIRECTION.md recommends this before calling the feature ready.

| Pros | Cons |
|---|---|
| Shows the feature on a real wrapper, and gets IUC and operator review of real terms. | Requires profile 27.0, which can't be deployed until a 27.0 release, so the pilot is a draft. |
| Doesn't touch Galaxy code. | Legal wording needs input from the maintainers. |

### 8. Larger expansion: per-job audit view

A read-only API or UI showing which affirmation authorized a job (DIRECTION.md §3). The cheap part of §3 belongs in the docs and PR wording either way: call the records "the affirmation supplied to authorize this job", and state that hashes the tool-test interactor sends automatically are not a person's consent.

| Pros | Cons |
|---|---|
| Makes the "every job records…" claim retrievable, not only stored. | Nobody has asked for it. DIRECTION.md warns against growing the model for hypothetical legal needs. |
| The data is already there. | More API surface to design (visibility of other users' jobs, purged users). |

### 9. Contraction: drop `binds="user"` and persistent acceptance

Ship submission-bound agreements only. This removes the acceptance-events table, the user acceptance API, the preferences page, the "remember" checkbox, the purge and pgcleanup changes, and the `stricter_declaration` mixed-binding logic.

| Pros | Cons |
|---|---|
| Fully answers Nicola's concern, the only independent review comment, about stale standing affirmations. | The issue explicitly decided on both scopes. That reply to Nicola is what introduced `binds`. |
| **Every unconditional IUC case in the issue's own table (MEME ×5, meme_chip, sfold, pear) maps to `binds="submission"`.** The `user` cases are Clair3/artic (conditional, out of v1) and MAKER's right branch (needs OR, out of v1). So `binds="user"` has no v1 consumer. | Removing it later is easy, but adding it back means a second migration. |
| Removes the class of bugs the P1 came from (mixed scopes), plus GDPR and purge surface. | Read-and-agree licenses (ONT Public License) would re-prompt on every run once conditional support lands. |
| Probably cuts more than 1k lines across backend, client and tests. | Throws away tested work. |

<details><summary>Notes</summary>

This is the strongest contraction case. It is not recommended because the scope was explicitly decided in the issue thread and the work is already built and tested. It deserves a deliberate yes or no from John, and the PR description could justify `binds="user"` with a named consumer.

</details>

### 10. Contraction: API-only, UI deferred

Land phases 0–6 (enforcement plus the API) and defer the client prompts and preferences page. This is the split in #23261 between "phases 1–5" and "phase 7".

| Pros | Cons |
|---|---|
| Cuts about 1.5k lines of client code and tests from the first review. | Without the UI, a licensed tool can't be run from the tool form at all, so it isn't a releasable feature. |
| Backend reviewers can focus. | The backend/UI commits are tangled (see the decomposition caveat). |

This works better as decomposition Option C than as a scope cut.

### 11. Contraction: reject licensed converters at load instead of filtering in the registry

Replace the filtering in `Registry.get_converters_by_datatype` with a load-time rejection.

| Pros | Cons |
|---|---|
| Simpler, with no cache behavior. Also fixes `/api/datatypes/converters` automatically. | Whether a tool is a converter is decided in `datatypes_conf.xml`, not the tool, so rejection at tool load isn't possible. It would have to happen at registry load. |
| | Removes the ability to run a licensed converter directly. |

Not recommended; scope 2(b) covers the gap.

### 12. Contraction: drop the unused `granted_by` and admin columns

| Pros | Cons |
|---|---|
| No unused schema in the migration. | Adding admin acceptance later would need another migration. The columns cost little. |

Neutral. Leave the columns unless a reviewer objects.

### 13. Not considered further

- Typed per-kind `UnmetPrecondition.details` (thermo B1): schema churn across commits for little gain.
- The `ToolCard` `allowEditingCredentials` coupling (thermo B5): a broader ToolCard refactor.
- Underlying-software license metadata (#12663, #8006): a separate concern, and it should only be linked from the PR.
