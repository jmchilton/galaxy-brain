# Scope evaluation (second pass, after re-scope): licenses

**Recommendation: keep as implemented.** The first evaluation's modest expansion (a–h) is in, and it held up through test challenges, E2E with celery on, Codex (whose two findings were fixed in place) and thermo-nuclear review. No candidate raised this pass clears the bar of "a Galaxy reviewer would hold this PR without it". The client submit consolidation is a small polish follow-up. The gxwf default, the pinning granularity and `binds="user"` are design decisions, not scope. Planemo is in another repo. The pgcleanup exit-0 bug is real but pre-existing and not about licenses, so it belongs in a companion fix shaped like commits 5–6.

Reviewed against the `licenses` ref, 21 commits on `0073b5e9224`. It was read through `git show licenses:`, because the worktree is mid-rewrite by another agent. Sources: every doc in this directory, including `earlier_drafts/1/` and `earlier_drafts/2/`, plus [#23261](https://github.com/galaxyproject/galaxy/issues/23261), its body and its 2 comments.

## Possible Decompositions

Added lines by commit (numbers are per-commit adds; they sum to ~7.9k, above the net +7.5k, because later commits rewrite earlier hunks):

| # | Commit | Total | Generated `schema.ts` | Tests and fixtures | Prod and docs |
|---|---|---|---|---|---|
| 1 | Baseline tests for require_login tool execution | 24 | – | 24 | – |
| 2 | Extract tool execution preconditions from DefaultToolAction access check | 241 | – | 120 | 121 |
| 3 | Add Workflow.walk_tool_steps; use it for get_all_tools | 67 | – | 40 | 27 |
| 4 | Check workflow tools are installed before building run configs | 22 | – | 16 | 6 |
| 5 | Preserve whitespace when parsed_tool re-parses a tool source | 3+ | – | being added | 3 |
| 6 | Clear cached converter lookups on every converter registration | 2+ | – | being added | 2 |
| 7 | Parse and resolve `<license_agreement>` tool requirements | 1241 | 62 | 745 | 434 |
| 8 | Add tool license agreement models and migration | 524 | – | 201 | 323 |
| 9 | Add LicenseAcceptanceManager | 546 | – | 206 | 340 |
| 10 | Add API for tool license agreements and acceptances | 1064 | 411 | 292 | 361 |
| 11 | Enforce tool license agreements on job creation | 755 | 77 | 448 | 230 |
| 12 | Enforce tool license agreements on workflow invocations | 818 | 75 | 513 | 230 |
| 13 | Prompt in the tool form and preferences | 919 | – | 382 | 537 |
| 14 | Prompt in the workflow run forms | 275 | – | 130 | 145 |
| 15 | Show refused submissions in the tool form | 62 | – | 37 | 25 |
| 16 | Refresh workflow run forms when agreements are refused | 696 | 140 | 343 | 213 |
| 17 | Keep license agreements off indirect execution paths | 59 | – | 43 | 16 |
| 18 | Fix over-eager licensed converter filtering | 71 | – | 51 | 20 |
| 19 | Accept license agreements in workflow framework tests | 68 | – | 57 | 11 |
| 20 | Document tool license agreements | 309 | – | – | 309 |
| 21 | Correct license agreement doc from review | 90 | – | – | 90 |

Commits 1–6 are the pre-feature stack, about 360 lines. Commit 21 folds naturally into 20.

**Caveat for every backend-first cut.** The UI commits aren't purely client code, and the tangle has grown since the first evaluation:
- Commit 13 changes the manager, the service, `tools/__init__.py` and the API tests.
- Commit 16 adds the typed `WorkflowLicenseAgreementResponse` and the `GET /api/workflows/{id}/license_agreements` route. Since the re-scope it also holds:
  - the discovery access filter (rescope a);
  - the `Tool.to_json` access gate (Codex P1);
  - the walker's `inaccessible` refusals;
  - 140 lines of `schema.ts`.
- Commit 19 (gxwf) depends on commit 16's route.

So options C and D below need those hunks moved ahead of the client hunks. That means a history rewrite and regenerating `schema.ts` at the new boundary.

### Option A: pre-feature stack, then feature (2 PRs)
1. Commits 1–6, about 360 lines:
   - the precondition abstraction and 403009;
   - `walk_tool_steps`;
   - the missing-tools orphan-history fix;
   - the `parsed_tool` whitespace fix;
   - the converter cache fix.
2. Commits 7–21.

Cheapest: the boundary already exists. The feature PR is still about 7.1k lines.

### Option B: split the pre-feature stack by audience (4–5 PRs)
1. Commits 1–2: preconditions and 403009. This changes `POST /api/tools` for inaccessible tools, and has its own API test.
2. Commits 3–4: `walk_tool_steps` with the `get_all_tools` dedupe, and the missing-tools fix. Workflow reviewers.
3. Commits 5–6: two small dev bug fixes, independent of 2–4. They could target a release branch once their own tests land.
   - An optional pgcleanup exit-code fix could join them (see §11).
4. Commits 7–21.

Each refactor or fix gets its own CI signal. Bug-fix PR 3 could be backported.

### Option C: issue sequencing, backend then UI (3 PRs)
1. Commits 1–6.
2. Backend: commits 7–12, 17–19, plus the backend hunks of 13 and 16.
3. UI and docs: the client hunks of 13–16, plus 20–21.

This matches #23261's "Sequencing", and the backend and client reviewers differ. It needs the rewrite described in the caveat. PR 2 alone makes licensed tools usable only through the API.

### Option D: inert storage, then enforcement, then UI (4 PRs)
1. Commits 1–6.
2. Commits 7–10: parsing, XSD, linters, models and migration, the manager, and the discovery and acceptance API. Nothing enforces anything yet.
3. Enforcement: commits 11–12 and 17–19, plus the backend hunks of 16.
4. UI and docs, with the same caveat.

The migration gets its own database review. PR 2 alone gives authors an element that does nothing, so stack it with PR 3.

### Option E: vertical slices (3 PRs)
1. Commits 1–6.
2. Tools end to end: commits 7–11, 13, 15, 17–18, and the tool hunks of 16.
3. Workflows end to end: commits 12, 14, 19, and the workflow hunks of 16.

Each PR can be demoed. With PR 2 alone, licensed workflow steps fail closed when scheduled, with no preflight or prompt. Land the two back to back.

### Option F: user binding as its own layer (3 PRs)
1. Commits 1–6.
2. Submission-only feature.
3. `binds="user"`:
   - the events table and the user acceptance API;
   - the preferences page and the "remember" checkbox;
   - purge and pgcleanup, the `stricter_declaration` aggregation, and the pgcleanup tests.

This isolates the standing-acceptance debate (Nicola's concern). It needs the most rework, because the migration, the manager and the client build both scopes together.

### Option G: tests-and-docs-heavy follow-up (2 PRs on top of A)
1. Commits 1–6.
2. The feature without the creation-bound pin tests (rerun, remap, resubmit, resume, `when=false`), the PostgreSQL pgcleanup tests and the gxwf commit 19.
3. Those pins plus gxwf.

This shrinks the main review by roughly 330 lines (the re-scope's integration and pgcleanup additions plus commit 19). The cost is shipping the feature with its documented contracts unpinned, which the first scope evaluation added. Listed for completeness.

## Decisions for John (not scope changes)

- **gxwf `accept_license_agreements` default** (currently opt-in, False). Flipping it costs nothing now. It gets expensive once Planemo implements the field.
  - For opt-in: DIRECTION.md §3, "make test automation consent policy explicit".
  - For True: parity with the tool-test interactor, which sends hashes automatically.
  - Lean: keep opt-in.
- **Per-step vs whole-tree one-time pinning.** This is a stored-provenance choice; authorization is the same either way. Lean: keep per-step.
- **`binds="user"`.** Nothing new argues for dropping it, beyond the size of the tested surface. Lean: keep (see §9).
- **Local `Model` in `galaxy/schema/license_agreements.py`.** The thermo review showed the import cycle is inherent. Lean: keep.
- **Terminology and stale text to reconcile at hand-off** (not code):
  - #23261's body still says the profile gate is 26.2; the code, docs and commit say 27.0.
  - The author's reply to Nicola predates the `job`→`submission` rename and still says `binds="job"`; the body notes this.
  - `pr_description.md` is stale: it says 26.2+, lists three "known defects" that are now fixed, and says gxwf can't send hashes.
  - The issue's MAKER "split into two" recipe is still wrong under all-of enforcement.

## Scopes considered

### 1. As implemented (recommended)

Unconditional, all-of `<license_agreement>` requirements, gated at profile 27.0. `binds="submission"` is the default and `binds="user"` is opt-in. Enforcement is server-side for tools, jobs and workflows, with per-invocation pins. There are UI prompts and a preferences page. Since the first evaluation the branch has added the a–h expansion, the Codex P1/P2 fixes and the commit 5–6 extractions.

| Pros | Cons |
|---|---|
| Every "known defect" from the first pass is fixed: mixed binds, discovery ignoring access, the converter listing, plus the per-step `to_json` leak. | Large: 21 commits and about 7.5k net lines. |
| The documented contracts (creation-bound authorization, `when` skip, PostgreSQL purge) are pinned by tests. | The vault PR text and the issue body are stale against the code. |
| gxwf can test licensed workflows, and reruns carry the hashes. | MCP, agents and Planemo workflow tests can't send one-time hashes. This is documented. |
| E2E passes under both backends with celery on, the CI configuration. | The client has three near-identical "accept remembered" try/catch blocks. |

### 2. Fold the submit choreography into `useLicenseAgreementAffirmations`

Add a helper such as `submitWith(submit, onError)` that runs `acceptRemembered` and then submits, replacing the try/catch in `ToolForm`, `WorkflowRunForm` and `WorkflowRunFormSimple`.

| Pros | Cons |
|---|---|
| One home for the ordering rule: accept the remembered agreements before submitting. | The 403009 refresh is already shared. `unmetPreconditionsFromError` in `api/licenseAgreements.ts` is used at the only two sites that handle it: `ToolForm`, and `WorkflowRun`, which both workflow forms emit into. |
| Removes one duplication the thermo review noted. | The remaining duplication is three try/catch blocks of about 8 lines, each with a different error sink: a modal, an emitted string, and an emit plus a spinner reset. The helper would need an error callback and saves about 15 lines. |
| | It needs vitest, vue-tsc and E2E reruns for no behavior change. |

A polish follow-up or a review-time nit, not scope.

### 3. Default gxwf `accept_license_agreements` to True

Flip the default and put `accept_license_agreements: false` on the refusal case.

| Pros | Cons |
|---|---|
| Matches the tool-test interactor, so existing workflow tests (for example IWC) that adopt licensed tools need no edits. | DIRECTION.md §3 asks for an explicit consent policy for test automation. Opt-in is the explicit form. |
| Planemo would inherit the same default once it supports the field. | It reverses a recorded re-scope decision. |
| | One line either way, so this is a decision, not scope. |

<details><summary>Notes</summary>

The field is in `galaxy.tool_util_models` (`TestJob`), which ships in galaxy-tool-util, so Planemo reads its default. Decide before Planemo implements it. Changing the default afterwards changes every Planemo user's behavior.

</details>

### 4. Pin the whole validated set on every (sub)invocation

Replace `one_time_license_acceptances_by_step` and the per-level flattening in `run_request` with one set pinned on every invocation in the tree.

| Pros | Cons |
|---|---|
| Deletes a mapping and a filtering step. | Sub-invocations would record agreements their own tools don't declare, so the stored provenance is less precise. |
| Authorization is unchanged, because a tool only consults its own agreements. | It touches the invocation commit and its tests for no user-visible gain. |

A design call. The current version is correct and more precise.

### 5. Planemo support for `accept_license_agreements`

Teach Planemo's workflow test runner to send one-time hashes.

| Pros | Cons |
|---|---|
| Makes licensed IWC workflows testable in Planemo CI. | Another repository, so it can't be part of this branch. |
| | It needs a released galaxy-tool-util carrying the field, and a decision on the default (§3). |

A companion follow-up after this merges.

### 6. MCP and agent runs carry one-time acceptances

Let `agents/operations.py` `run_tool` and the MCP tool and workflow runs accept `one_time_license_acceptances`.

| Pros | Cons |
|---|---|
| Removes an "Incomplete" item from the PR description. | An AI agent asserting "I certify non-commercial use" on a user's behalf is the consent problem DIRECTION.md §3 warns about. Failing closed is the right v1 behavior. |
| | `binds="user"` with a remembered acceptance already works on these paths. |
| | Needs a design for how an agent surfaces terms to the person. |

Not recommended in v1. Keep it documented as a limitation.

### 7. Conditional applicability, alternative entitlements, admin acceptance, per-job audit view

These are the first pass's §3, §4, §5 and §8.

| Pros | Cons |
|---|---|
| They cover real IUC cases: Clair3, InterProScan, MAKER and single-purpose instances. | All are explicitly out of v1 in #23261 and DIRECTION.md. |
| | No pilot has shown demand yet. |

Nothing new this pass. Still out.

### 8. Credentials on the precondition abstraction

Route `<credentials>` checks through `ToolExecutionPrecondition`, and merge `get_accessible_tool` with `ToolsService._get_tool`.

| Pros | Cons |
|---|---|
| Gives the abstraction a third real consumer. | It changes existing endpoints from 401 to 403. A different surface. |

Still a separate PR. Access and license agreements are already two real consumers, so the abstraction isn't unused.

### 9. Contraction: drop `binds="user"`

Ship submission-bound agreements only. This removes the events table, the user acceptance API, the preferences page, "remember", the purge and pgcleanup changes, and `stricter_declaration`.

| Pros | Cons |
|---|---|
| Fully answers Nicola's standing-affirmation concern. | The issue thread chose both scopes. The `binds` attribute exists because of that reply. |
| Every unconditional IUC case in the issue's table maps to `submission`, so `user` has no v1 consumer. | MCP and agent runs (§6) work only with `binds="user"`. Dropping it makes licensed tools unusable there. |
| Cuts more than 1k lines, including the PostgreSQL pgcleanup surface. | Adding it back later needs a second migration. It also throws away code that is now tested on PostgreSQL. |

<details><summary>Notes</summary>

This is still the strongest contraction case, but nothing new supports it, and the re-scope invested more in it (GDPR, other-user grants, job-record retention tests). If John wants it, decomposition Option F gets most of the review benefit without discarding the work.

</details>

### 10. Contraction: API only, UI deferred

| Pros | Cons |
|---|---|
| A smaller first review. | Not a releasable feature: a licensed tool can't be run from the tool form. |
| | The tangle around commits 13 and 16 is worse than in the first pass. |

Better handled as decomposition Option C.

### 11. Companion: pgcleanup exits 0 on any SQL error

`pgcleanup.py`'s `__main__` catches every exception from `app.run()`, logs it and falls through. `Cleanup.__exit__` only closes the connection. So the process exits 0, and `_pgcleanup_check_output`, which uses `subprocess.check_output`, passes. The fix is `sys.exit(1)` after `log.exception`, plus a test that a failing action fails the script.

| Pros | Cons |
|---|---|
| A real operator bug: cron can't detect failed cleanup. The re-scope hit it when pgcrypto was missing. | It is pre-existing, applies to every action and has nothing to do with licenses. It is the same shape as commits 5–6, which were moved out of the feature for that reason. |
| One line in a file this branch touches. | It could turn latent failures in the existing pgcleanup tests red. That deserves its own PostgreSQL CI signal, not one mixed into a 7k-line feature. |
| | The branch's own pgcleanup tests assert positive DB effects, so a silent SQL failure already fails them. Their coverage doesn't depend on this fix. |

Recommend it as a standalone fix, which could target a release branch, or as an optional commit alongside 5–6 in decomposition Option B. Not a scope change to this branch.

### 12. Companion: tools-iuc wrapper pilot

Same as the first pass's §7. Migrate one unconditional wrapper (MEME, sfold or pear) in a draft tools-iuc PR.

| Pros | Cons |
|---|---|
| Shows the feature on a real wrapper and gets IUC and operator review of real terms. | Gated on a 27.0 release, so it stays a draft. |
| Doesn't touch Galaxy code. | Legal wording needs maintainer input. |

### 13. Not considered further

- The `Tool.tests()` post-construction `license_agreement_hashes` assignment, the `acceptRemembered` string-versus-raw error emit, the ToolCard `allowEditingCredentials` coupling, `self.app.name != "tool_app"`, and the duplicated pgcleanup CTEs. All are cosmetic or follow existing file conventions.
- Lazy fetching of terms: wait until payload sizes are measured.
- Underlying software license metadata (#12663, #8006): a separate concern, linked from the PR.
