Toward 🎯 #20900 - reject an unknown workflow `scheduler` ID up front instead of queueing an invocation that will never run.

`POST /api/workflows/{id}/invocations` takes an optional `scheduler` ID. Today, a scheduler ID the server doesn't have is accepted, which can be a typo or an ID copied from another server's `workflow_schedulers_conf.xml`:

| Request | Before | After |
| --- | --- | --- |
| `{"history_id": ..., "scheduler": "not_a_scheduler"}` | `200`, invocation in state `new` | `400`: `Unknown workflow scheduler 'not_a_scheduler' specified.` |

The caller gets an invocation ID back and waits. Nothing ever picks it up: the scheduling monitor polls only invocations whose `scheduler` matches one of its own scheduler IDs (`poll_active_workflow_ids(scheduler=...)`). So the invocation stays `new` forever, and it never fails or explains why.

***Omitting `scheduler`, or sending an empty one, still uses the server's default scheduler, and naming a configured scheduler still works. Only requests naming an unregistered ID change. The workflow run form, BioBlend and Planemo never send `scheduler`, so only direct API callers can see the new 400.***

***This is only the scheduler check from the broader #20900 preflight-validation work. Tool compatibility, completion hooks and other request checks stay in that branch.***

<details><summary>Implementation</summary>

- `WorkflowsService.invoke_workflow` looks up a non-empty `payload.scheduler` in the existing `trans.app.workflow_scheduling_manager.workflow_schedulers` registry, the same manager `queue_invoke` hands the invocation to. An unknown ID raises `RequestParameterInvalidException` before run configurations are built, so nothing is created (not even the history a `new_history_name` request would make).
- The ID is read once instead of once per run configuration inside the batch loop.
- The check covers the full registry, not just active schedulers. Core ships only the active `core` plugin, so the two are the same in practice.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The one API-visible change is that a request naming an unregistered scheduler gets a 400 instead of a 200 for an invocation that could never run.

## Context

Extracted from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), the broader #20900 invocation-validation work, so it can land on its own. Targets `release_26.1` as a bug fix; it merges cleanly into `dev`.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the narrow scheduler check: reject an explicitly named unknown scheduler with a 400, using the existing registry.</summary>

The scope review considered three alternatives:
- Defining new policy for empty or null scheduler values and testing custom scheduler registries. Optional follow-up.
- Pulling in the rest of the #20900 preflight validation. Brings in unrelated dependencies.
- Dropping the omitted/default acceptance cases. Weakens the test.

None was taken.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the parametrized API test unchanged.</summary>

It sends real invocation requests and checks the public responses, with no mocks. That covers request parsing, the service check and the registry lookup together. The omitted and `default` cases guard the normal paths. A workflow with only an input step avoids tool dependencies. No browser test is needed: the change is API-only, with no UI change.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A `400` naming the unknown scheduler, before anything is created. Before this change the API returned `200` and the invocation stayed `new` forever.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. It's an API test of the public responses, with the omitted, empty and `default` cases as acceptance controls.
- [x] Are the comments free of excess archeology? Yes. The diff adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Only invocation requests that name an unregistered scheduler change, and those could never run.
- [x] Who hits this in practice and what is the evidence? Direct API callers who mistype a scheduler ID or reuse one from another server. The run form, BioBlend and Planemo never send `scheduler`. There's no user report. This came from the #20900 validation work and is reproduced by the new API test, which gets a `200` on the base branch.
- [x] Were simpler or existing approaches considered? Yes. It reuses the scheduling manager's registry and Galaxy's standard invalid-request exception. Checking in `WorkflowSchedulingManager.queue()` would also work. But `queue()` is only reached through `queue_invoke()`, whose only caller is this service method, and a check there would run after the run configurations (and any new history) were built.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

`lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_with_scheduler` covers four cases: `scheduler` omitted, `""`, `default`, and `not_a_scheduler`. On the base branch, `not_a_scheduler` fails (`200`, invocation `new`). With this change all 4 pass.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
