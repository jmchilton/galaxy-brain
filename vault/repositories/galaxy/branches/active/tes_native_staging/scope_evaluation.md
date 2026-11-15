Run via Claude Opus at high effort.

**Recommendation: park design B, as D2 says, and land only one piece of it now. Retarget the parked branch to `dev`.** The piece that lands is `a0c60ba6d80`: TES state checks with the MINIMAL view and a 30 s timeout. Fold it into `tes_task_state_polling` together with a hang test for the Pulsar runner. One hung TES server currently stalls the monitor thread for every TES job, and the parent and its parked sibling need that fixed whatever happens to design B. Keep the other six base refactors with the runner. They only pay off once there is a second TES runner, and they would churn a parent that is READY. Park the rest as a reference branch: the runner, the signed job files tokens, and the raw and directory PUT routes. Nobody has a TES deployment asking for them, and the deployments the synthesis names (an ELIXIR TESK behind LS Login) would also need OIDC, which the branch doesn't have. They are also features, not `release_26.2` fixes: a new job runner, two public API routes and a new credential type in the job files authorization that every Pulsar job uses. The port to `release_26.2` and its hardening have done the first "build it properly" step D2 listed, so the branch is now a ready starting point rather than a prototype. If John decides to pursue design B anyway, or a deployment asks, don't take it as implemented: take a modest expansion on `dev`. Turn `tes_directory_outputs` on by default, and refuse at submit time any job whose tool discovers outputs, writes `extra_files` or writes `galaxy.json` when its destination can't return directories. Today those jobs succeed on tesp-api with the outputs silently missing, which is how hyphy ran 4 of its 12 jobs and was still reported COMPLETE. Also return every job metrics plugin's files, and use `os.replace` in the new `JobFilesManager.replace`. Once the parent merges, add the thermo follow-up that shares TES polling between the two runners, so that both get the unreachable-server timeout and one TES state vocabulary. Leave these to the deployment that needs them: tesp-api directory POSTs, presigned object-store inputs, resubmission, OIDC and the orphan-task nonce.

Evaluated at `d54c2284664`: 30 commits on `jmchilton/tes_task_state_polling` `54d2aa613df`, which is itself on `origin/release_26.2` `c9bd104e5e1`. That branch has no `v26.2` tag yet and is taking release merges. The diff is +2420/−287 over 13 files:

- library code +994/−94: `tes.py` 365 new, `util/tes_staging.py` 269 new, `util/tes_task.py` +86/−25, `api/job_files.py` +131/−21, `managers/job_files.py` +69/−14, `security/job_files_tokens.py` 70 new, `pulsar.py` +4/−34;
- tests +1426/−193.

This is a scope review only. Correctness, tests and code quality were covered by the earlier reviews and aren't re-judged here.

## Possible Decompositions

Whatever the split, everything below waits for the parent: on `release_26.2` if it stays there, or once the parent has merged forward into `dev` if the branch moves. The commit list is in [baseline_refactor.md](baseline_refactor.md). Two feature commits mix the job files API with the runner, so any split along that line has to cut them by file. They are `193ef5988f0` (tokens: runner, manager, API, token module and tests) and `e072fbddf80` (DIRECTORY outputs, the same files). The cut is mechanical, because the runner halves only call the API halves through URLs.

1. **One PR, as implemented, stacked on the parent.** Squash the hardening commits into the feature commits they fix. That leaves about nine commits: the seven base refactors, raw PUT, runner, tokens, DIRECTORY outputs, and cancel and recovery. The review-driven fixes (limits, metadata, link handling, tool directory staging, MINIMAL view, the module split) fold into those. The reviewer gets one story: Galaxy as a plain TES client. That is about 1,000 library lines and 1,400 test lines in one review, and the security-sensitive token and route changes are reviewed in the same PR as the shell wrapper.
2. **Parent fix out, then one feature PR.**
   - PR 0 goes into `tes_task_state_polling` before it is opened, or as a tiny PR stacked on it. It is `a0c60ba6d80` plus a Pulsar-runner hang test, which needs the fake server's `delay` from `82ca1787304`. `e0a3c8fcd7f`, which moves the fakes to `tes_fakes.py`, can come along or stay.
   - PR 1 is the rest, as in option 1.
   - This is the split the recommendation implies, whether PR 1 opens now or later.
3. **Job files API first, then the runner.**
   - PR A, "Job files API: raw PUT, signed per-file tokens, directory PUT", has about 300 library lines and 500 test lines:
     - `947ec4c3473` and `b1cf1be211a`;
     - `97804f0d38a`;
     - the manager, API and token halves of `193ef5988f0` and `e072fbddf80`;
     - `afeef2ef104`, `a12c82158c8`, `753ff1be937` and `0ec1773c6c6`.
   - PR B, "TES-native job runner", has about 700 library lines and 900 test lines:
     - `5a648b71bda`, `265b4db2790`, `4369c216116` and `e0a3c8fcd7f`;
     - `4abebd71d25`;
     - the runner halves of the two mixed commits;
     - every remaining runner commit.
   - PR A gets a security-focused review on its own. But PR A has no consumer in Galaxy, so reviewers will want PR B open next to it.
4. **Layered by capability, four PRs.**
   - PR 0 is the parent fix, as in option 2.
   - PR A is the file-level job files API: raw PUT, and tokens with only the `r` and `w` scopes.
   - PR B is the runner with FILE outputs only. It includes tokens, cancel and recovery, limits, metadata, tool directory staging and the performance fixes, and on its own it runs fixed-output tools on Funnel, TESK and tesp-api.
   - PR C is DIRECTORY outputs:
     - the `d` scope;
     - `PUT /files/{rel_path}` and `authorize_directory_write`;
     - `tes_directory_outputs`;
     - the wrapper's directory creation and link handling (`7ea1b5a1450`);
     - the `multi_output_assign_primary` integration case, moved out of `c26484d7d70`.
   - Each PR is one idea, and the backend-specific behavior is confined to PR C. The catch: PR B on its own ships the silent loss of discovered outputs, unless it also carries the submit-time refusal from the expansion below. Adding that check to PR B is what makes this split safe.
5. **Refactors first, then the feature.**
   - PR R holds the six behavior-free base commits: `5a648b71bda`, `265b4db2790`, `4369c216116`, `e0a3c8fcd7f`, `947ec4c3473` and `b1cf1be211a`. It lands after the parent.
   - Then PR 0 (MINIMAL view) and the feature, in any of the shapes above.
   - Pure moves are easy to review. But Galaxy reviewers rarely take preparatory refactors whose only consumer hasn't been proposed, so PR R mostly makes sense if the feature PR is already open.

## Scopes considered

### As implemented, on `release_26.2`

The TES-native runner, signed per-file tokens, the raw PUT and directory PUT routes, and seven base refactors, one of which (MINIMAL view and timeout) changes the Pulsar TES runner. It is stacked on the READY parent and targets the release branch.

| Pros | Cons |
| --- | --- |
| • Well hardened: Codex, test, performance and thermo-nuclear reviews were all acted on. It has a real fake-TES-server harness, and an integration test that runs jobs end to end with no mocked TES client. | • A new runner, two public API routes and a new credential type are features, not fixes. `release_26.2` is branched and taking release merges, and even Galaxy's liberal reading of "bug fix" doesn't cover a new runner. |
| • The runner is opt-in, so it changes nothing for sites that don't configure it. | • Not all of it is opt-in. `JobFilesManager._authorize` and the POST staging helpers are on every Pulsar job's path, and `fetch_tes_task_state` changes for every Pulsar TES job. |
| • `test/integration/test_tes_runner.py` would be the first TES path that Galaxy CI runs. D15 makes "some CI runs a TES path" a precondition for advertising TES at all. | • Silent data loss on any destination with `tes_directory_outputs` off, which is the default and the only choice on tesp-api. Discovered outputs, `extra_files` and `galaxy.json` never come back, and the job goes `ok`. |
| • Removes the broker password and the job key from tasks. It is faster than design A (Funnel fastp 14 s against 27.6 s) and uses TES storage the way other consumers do. | • No user. D2 and the stage 7 synthesis both say to build it when a real deployment asks, and none has. |
| | • It retries an unreachable TES server forever. The fix is on the parked sibling, and it applies only to the Pulsar runner. |

<details>
<summary>Details: the release target</summary>

Release branches take fixes, and the process doc says Galaxy reads "fix" liberally: related bugs in touched code and generalizations of a fix are fine. Nothing in this branch is a fix to code that exists on `release_26.2`, with two exceptions:

- `a0c60ba6d80` fixes the parent's new polling. That polling is itself new on 26.2, so the fix belongs wherever the parent lands.
- `b1cf1be211a` creates a missing unauthorized staging parent, which is trivial.

The remainder is a new capability:

- a runner;
- `PUT /api/jobs/{job_id}/files` and `PUT /api/jobs/{job_id}/files/{rel_path}`, both `public=True` and in the OpenAPI schema;
- `job_token=` accepted by GET, HEAD, POST and PUT.

Each of those becomes API that a later release has to keep. Merging forward costs little, since `dev` has the same `JobFilesManager`. But a 26.2 PR would have to argue its way past the freeze, and a `dev` PR wouldn't. Target `dev`.

</details>

### As implemented, retargeted to `dev`

The same branch, with its base moved to `dev` once the parent merges forward.

| Pros | Cons |
| --- | --- |
| • The right target for a feature. There is no freeze argument to make, and the branch can wait for the parent without blocking 26.2. | • Still ships the silent loss of discovered outputs on destinations without DIRECTORY outputs. |
| • No code change. The job files API and the runner modules are the same on `dev`. | • Still no user, so it adds the review and maintenance cost for nobody in particular. |
| | • Ships a second TES runner whose polling, state names and failure handling differ from the Pulsar runner's. The thermo follow-up issue explains why sharing them waits for the parent. |

### Recommended: park the runner, land the MINIMAL-view timeout with the parent

Move `a0c60ba6d80` into `tes_task_state_polling` with a Pulsar-runner hang test, and keep everything else on this branch as a reference. Retarget the parked branch to `dev` and leave it in `branches_need_decision` until John or a deployment asks for design B. When that happens, start from the expansion below.

| Pros | Cons |
| --- | --- |
| • The fix with value regardless of design B ships now. With pydantic-tes's lack of timeouts, a TES server that accepts connections and never answers stalls the monitor thread for good: no checks and no limits for any job of the runner. It also caps the blocking probe the sibling's unreachable scope evaluation measured at about 127 s. | • The parent is READY and its scope evaluation is done, so this adds a commit and a test to a reviewed branch. The parent has no PR yet, so the cost is one more look rather than a re-review. |
| • Follows D2 and the synthesis. Upstream reviewer time goes to the parent, the Pulsar staging-image stack and D9 first, which fix data loss that exists today. | • `a0c60ba6d80` reads pydantic-tes's private `TesClient._build_url` and `_headers`. A reviewer may ask for the fix in pydantic-tes instead. It is John's library, so that is doable, but it means a release and a pin bump. |
| • No new public API or credential type to support before anyone needs it. | • The branch decays. Each Galaxy refactor of the job files API or the runner base adds port cost. The hardening done now partly ages out. |
| • The branch keeps its value: it is ported, hardened and tested at a recorded SHA, with an expansion plan written down. | • The ELIXIR-style use case stays unserved until someone asks. |
| • The six behavior-free refactors stay where they are used, so the parent doesn't pick up churn it doesn't need. | |

<details>
<summary>Details: why park, when the process leans toward expanding</summary>

The scope-evaluation process tells agents to lean toward modest expansion, because Galaxy reviewers usually want more than agents propose. That bias is about the size of a change that is going upstream. Here the open question is whether design B goes upstream at all, and John framed that as D2.

The two D2 records disagree about the gate, and that matters:

- [`BUGS_AND_ENHANCEMENTS.md` D2](../../../../../projects/wes_tesp_api/BUGS_AND_ENHANCEMENTS.md#d2-design-a-or-design-b) says to decide B "on the `dev` port and live TESK runs of the stage 6 commits". Both of those are now nearly met: live TESK in stage 6 phase 2, and the port, though to `release_26.2`.
- The later stage 7 synthesis ([`WES_TES_VS_GALAXY_APIS.md`](../../../../../projects/ga4gh_wes_tes/WES_TES_VS_GALAXY_APIS.md), Recommendations and D2) tightened the gate to "only with a concrete user". It also listed what building it properly means: the port, OIDC auth, a live recovery test and object stores.

This evaluation follows the later, stricter gate, for these reasons:

1. **The deployment that would justify it needs more than the branch has.** "When WES or TES is still worth supporting" names an ELIXIR node's TESK with LS Login, a partner Funnel, or a cloud TES. LS Login means OIDC bearer tokens from Galaxy's TES client, and the branch has only basic auth. Landing the branch now doesn't serve the named case. It serves a self-run Funnel or TESK, and for that the synthesis says Pulsar or Galaxy's Kubernetes runner do the same with fewer parts.
2. **Permanent API surface.** Raw PUT, directory PUT and `job_token` are public and authenticated routes. Galaxy reviewers will security-review them, and once released they are hard to change. Spending that review now, with no consumer, is the cost.
3. **There is a known silent-failure mode.** As implemented, a destination without DIRECTORY outputs completes jobs with their discovered outputs missing. That has to be fixed before an upstream PR whatever the timing, so "as implemented" isn't a candidate either way.
4. **Two TES runners that diverge.** Until the polling is shared, an unknown TES state fails a native job and leaves a Pulsar job waiting. The unreachable timeout, if it lands, covers only the Pulsar runner. Sharing waits for the parent to merge.

This is a close call, not a clear one. The runner-up is to pursue design B now with the expansion below, on `dev`, after the parent. Its best argument is CI: the integration test would be the first TES path Galaxy CI runs, and D15 makes that a precondition for advertising TES. If John values that, or wants design B in Galaxy before a user appears so that one can find it, pursue it with the expansion. Don't pursue it as implemented.

</details>

### Expansion if pursued: no silent losses, plus the cheap gaps (on `dev`)

Take the branch as implemented and add the following:

1. Default `tes_directory_outputs` to true. When it is off, fail at submit time any job whose tool declares discovered outputs, a dynamic collection, composite or `extra_files` outputs, or tool-provided `galaxy.json` metadata. The error should say that the destination can't return directories.
2. Return the files of every enabled job metrics plugin, not only the core plugin's four.
3. Use `os.replace` in the new `JobFilesManager.replace`. Today a PUT onto an existing directory lands as `<dir>/body`.
4. Once the parent has merged, do the thermo follow-up ([thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md)). It gives both runners one polling helper and one TES state vocabulary, which brings the unreachable timeout to the native runner if the sibling lands.

| Pros | Cons |
| --- | --- |
| • Turns the worst gap from a silent `ok` into a loud error. REVIEW_FOCUS prefers rejecting what can never work over supporting it, and the hyphy run is the evidence. | • More code before a user exists. Items 1–3 together are about 60–100 lines plus tests, and item 4 is a refactor across both runners with roughly 50 Pulsar tests pinning the current shape. |
| • Items 1–3 are small and in code the branch adds or touches. These are exactly the related fixes Galaxy reviewers ask for. | • Item 1 needs a reliable "does this tool produce anything outside its declared files" test. Discovered datasets, dynamic collections and composite datatypes are three different model paths, and missing one brings the silent loss back. |
| • Item 4 removes the two-runner divergence: unknown states, unreachable handling, failure text. It also makes later TES fixes land once. | • Item 4 waits for the parent to merge, so the feature PR does too. Option 4 of the decompositions avoids the wait by landing item 4 last. |
| • The integration test can pin item 1: a discovered-output tool on a destination with directories off must error, not go `ok`. | |

<details>
<summary>Details: what stays out of the expansion and why</summary>

- **tesp-api directory support** means a POST variant of the directory route that joins the multipart filename onto `path`. tesp-api is the only backend that needs it. The synthesis (D8) says to stop investing in tesp-api for Galaxy, and with item 1 tesp-api jobs that need directories fail loudly instead. Add it only if a tesp-api deployment asks.
- **The orphan task between `create_task` and `set_external_id`, and reused tokens.** Galaxy requeues the job after a crash in that window. The orphaned task keeps valid write tokens for the same paths as the new task, because tokens are bound to the job, path, scope and expiry, not to the submission. Both tasks then write the same outputs. A per-submission nonce would fix both: store it before `create_task`, put it in the task name or tags, and fold it into the token HMAC. That is a few dozen lines, but reliable recovery needs TES `ListTasks` filtering, and how well servers support that is unverified (tesp-api ignores tag filters). The window is a few milliseconds, so leave it for a deployment.
- **Resubmission and walltime mapping** (M). `check_limits` now fails jobs over their walltime, so Galaxy's resubmit rules are the next step. That is new runner behavior, and it would also need item 2's token binding.
- **Presigned object-store inputs** (M). These need object-store support for presigned GETs. They matter only at scale on S3-backed stores.
- **OIDC bearer auth** (L). It is the real ELIXIR requirement, and it needs token minting and refresh in Galaxy's TES client (pydantic-tes and `TesJobParams`). It belongs to the deployment that brings the requirement.
- **A `QUEUED` timeout.** Neither runner has one, and it is policy best set by the deployment.
- **Uploading only what Galaxy collects from `working/`**, and **empty directories.** Waste, not correctness.
- **TESK holding PVCs for a day.** That is TESK's `taskTtlSeconds`, a deployment setting. Document it in the runner's docstring or the sample job conf; it needs no code.

</details>

### Expansion: production design B (close every listed gap)

As implemented, plus everything in the stage 6 production-gap table and the task brief:

- the expansion above;
- the tesp-api directory POST;
- unreachable and `QUEUED` timeouts;
- resubmission with per-submission token binding;
- presigned object-store inputs;
- every job metrics plugin;
- the orphan-task nonce;
- OIDC;
- uploading only collected files;
- a live recovery test.

| Pros | Cons |
| --- | --- |
| • What the synthesis calls building design B properly. A deployment could take it as is. | • The stage 4 estimate for a production version was 1,500–2,500 lines, and this branch is already about 1,000 library lines before any of these items. Several of the items are M or L, and OIDC touches pydantic-tes and Pulsar's `TesJobParams`. |
| • It closes the credential-lifetime and orphan questions that a security-minded reviewer will raise. | • Every item is designed without a deployment to test against. The OIDC flow, object-store layout and resubmission policy all depend on who is running TES. |
| | • Some of the work, such as the tesp-api directory POST, serves a backend the synthesis recommends against. |

### Contraction: only the job files API pieces

Land raw PUT, signed per-file tokens and directory PUT as general job files API infrastructure (option 3's PR A), and park the runner.

| Pros | Cons |
| --- | --- |
| • A smaller and separable review: about 300 library lines and 500 test lines. | • No consumer in Galaxy. Nothing in Galaxy signs a token or sends a raw PUT, and Pulsar's client uses job keys with multipart POST. REVIEW_FOCUS asks "does the change leave behind a reusable abstraction, or just accrete": this would be an abstraction with no user. |
| • Raw PUT on its own might help simple clients (`curl -T`). | • It adds permanent public API and a credential type, with the same security review cost as the full branch, for no capability. |
| | • The token scheme would exist only on the files routes, while the `ports` and `oidc-tokens` callbacks copy the job key check (`research_issues/job-ports-tokens-auth-drift.md`). Extending tokens to those routes would grow this contraction into an auth refactor with no user either. |

### Contraction: only the seven base refactors, into the parent

Move all seven base commits into `tes_task_state_polling` and park the feature.

| Pros | Cons |
| --- | --- |
| • `baseline_refactor.md` shows that each commit touches only code on the parent and passes its tests. | • Six of the seven are justified only by a second TES runner: the key move, the `describe_ended_tes_task` split, `log_tes_cancel_failure`, the fakes extraction and the two job files helpers. On a parent with one TES runner they are churn a reviewer will question. |
| • `a0c60ba6d80` ships, which is the one that matters. | • `947ec4c3473` and `b1cf1be211a` are job files API refactors, unrelated to the parent's topic ("fail Pulsar TES jobs whose task dies"), and would widen a READY PR into another subsystem. |
| • If design B comes back, the stack is shorter. | • Shortening the stack gains little. The baseline refactor already ordered these commits first, so they can move into the parent at any time. |

### Park entirely (D2 as written)

Leave the branch as it is, with nothing upstream and no retarget. Record the decision and keep the branch as a reference.

| Pros | Cons |
| --- | --- |
| • No upstream cost at all, and it matches the synthesis literally. | • Leaves the monitor-stall fix (`a0c60ba6d80`) off the parent, so a hung TES server still stalls Pulsar TES polling. That fix doesn't depend on design B. |
| | • The record stays pointed at `release_26.2`, which is the wrong target if the branch is ever revived. |

### Expansions considered and rejected

- **Tokens on the `ports` and `oidc-tokens` callbacks.** Consistent, but there is no consumer. Revisit when someone needs scoped credentials there.
- **One query for every watched job's state per pass, instead of `get_state` per job** (performance review). It would help every runner, so it belongs in its own PR, not this one.
- **pydantic-tes: a `Session`, timeouts on every call, and a MINIMAL `get_task_state`.** This is the right home for the timeout in `a0c60ba6d80`, and it removes the private `_build_url` and `_headers` access. It is a separate project and release, so it is a follow-up there. If John prefers, it could replace the Galaxy-side change in the parent before the parent opens.
- **`TCP_NODELAY` in the integration test driver.** It affects tests only, and is unrelated.
- **A typed model for the task's files,** and **a symmetric return from `authorize_write`.** Code shape, which the thermo review left alone.
- **Renaming the module or runner** (`runners/tes.py` `TesJobRunner` next to `PulsarTesJobRunner`). Admins may confuse the two. Raise it in review if design B is pursued; it doesn't change scope.

## Known gaps and where they belong

| Gap | Bucket |
| --- | --- |
| tesp-api returns no DIRECTORY outputs, and jobs go `ok` without their discovered outputs (hyphy 4 of 12, COMPLETE) | Expansion item 1 (refuse loudly). The tesp-api POST variant only if a tesp-api deployment asks |
| An unreachable TES server is retried forever | Shared polling (expansion item 4) plus the sibling's timeout, once the parent lands |
| No `QUEUED` timeout | Deployment policy; out |
| No resubmission | Production; out |
| No presigned object-store inputs | Production; out |
| Only the core job metrics plugin's files come back | Expansion item 2 |
| Orphan task between `create_task` and `set_external_id` | Production (nonce); out |
| TESK holds PVCs for a day | Deployment setting (`taskTtlSeconds`); document it |
| Tokens reused by a requeued job or a resubmission | With the nonce or resubmission; out |
| A hung TES server stalls the monitor | `a0c60ba6d80`, moved to the parent now |
| PUT onto an existing directory | Expansion item 3 |
| OIDC for LS Login TES services | The deployment that needs it; out |
