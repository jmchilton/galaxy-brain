# galaxy#23058 — Validate matched multi-input expansion errors before async job prep

- PR: https://github.com/galaxyproject/galaxy/pull/23058 (SID-6921, base `dev`, not draft)
- Head reviewed: `bd562019bde` (4 commits incl. a dev merge, +58/-6, 2 files)
- Worktree: `~/projects/worktrees/galaxy/pr/23058`
- Issue: galaxyproject/galaxy#22884 (Sentry: `InputMatchedException` raised inside Celery `queue_jobs`; mvdbeek asks to "validate this in the API layer before passing on to celery")
- Status: reviewed locally, review **unposted**.

## Verdict

**Request changes.** The change doesn't fix #22884. On the async path, the wrapped exception is raised inside the Celery task, *after* `POST /api/jobs` has already returned 200. `queue_jobs` catches it with a generic `except Exception` + `log.exception`, so the Sentry event still fires. On the sync path, `InputMatchedException` was already a `MessageException` (status 400), so the wrapper only changes `err_code` (0 → 400008). The new API test fails in CI, and it fails for a second reason too: it sends the legacy `/api/tools` payload shape to `/api/jobs`.

## What the PR does

- `lib/galaxy/tools/__init__.py:2087-2094` — new `Tool._raise_matched_input_errors(exc)` re-raises `InputMatchedException` as `RequestParameterInvalidException`.
- `:2122-2127` (`expand_incoming_async`) and `:2174-2179` (`expand_incoming`) — wrap `expand_meta_parameters[_async]` calls in try/except using the helper.
- `lib/galaxy_test/api/test_jobs.py:1127-1161` — `test_async_job_submission_rejects_mismatched_multi_inputs`, posts to `/api/jobs` via `tool_request_raw` and expects a 400 containing "should be of equal length".

## Findings (ranked)

1. **Async fix is in the wrong layer, so nothing observable changes** (`tools/__init__.py:2122-2127`). Call chain: `JobsService.create` (`webapps/galaxy/services/jobs.py:247-304`) validates the request model, persists a `ToolRequest`, enqueues `queue_jobs`, and returns 200. Only then does `JobSubmitter.queue_jobs` (`managers/jobs.py:2304-2358`) call `tool.handle_input_async` → `expand_incoming_async`. Any exception there is caught by `except Exception: log.exception("Problem validating tool state after request created")`, and the request is marked `failed` with `err_msg=str(e)`. `str()` of the new exception is the same message, so the stored state message is identical, and `log.exception` still reaches Sentry. Verified locally (below): with the PR applied, `/api/jobs` returns 200, the tool request ends `failed`, and the ERROR traceback is still logged (now chained, `raise ... from exc`).
2. **Sync wrapper is redundant** (`tools/__init__.py:2174-2179`). `InputMatchedException(MessageException)` (`util/permutations.py:25`) already maps to a 400 via the API exception handling. On `dev`, `/api/tools` returns 400 with this message and `err_code` 0. The PR only changes the code to 400008. That's harmless, and arguably nicer, but it isn't the bug. If the more specific error type is wanted, change the base class in `permutations.py` (`class InputMatchedException(RequestParameterInvalidException)`). That fixes both paths with no try/except and no helper.
3. **Test can't pass as written, and it pins the wrong contract** (`test_jobs.py:1139-1160`). It uses the legacy `/api/tools` shape (`{"batch": True, "values": [...]}`). The tool request API's strict pydantic model rejects that with "8 validation errors for multi_data_param (request model)…". That's the CI failure mvdbeek linked twice (still visible in run 29383806554 / job 87287064090). The request API shape is `{"__class__": "Batch", "values": [...]}`. With that shape, the current code returns 200, so the 400 assertion only holds once validation moves up into `JobsService.create`.
4. **Suggested fix: validate in `JobsService.create`, reusing the tool_util state visitor.** After `request_internal_state.validate(...)` (`services/jobs.py:268`), walk the state with `galaxy.tool_util.parameters.visitor.visit_input_values` (the abstraction `decode`/`encode` in `tool_util/parameters/convert.py:687-760` already use for `Batch` values). Collect the lengths of linked `Batch` values that aren't collection map-overs, and raise `RequestParameterInvalidException` when they differ. This is a pure function on `RequestInternalToolState` + `ToolParameterBundle`, so it's reusable (e.g. by workflow/tool-request linting) and needs no DB. Limitation: a linked batch of HDAs matched against an HDCA map-over still only fails in Celery, because the collection width is known only after dereferencing. That's acceptable, and better documented than handled with a DB lookup in the service. Sketch in the draft review below. **Not validated locally**: a local trial patch was blocked by the session permission policy.
5. **Optional, out of scope:** `queue_jobs` logs every `MessageException` with `log.exception`, so any user-input error found during Celery prep goes to Sentry. Logging `MessageException` at warning/info there would cut similar noise generally. That needs a maintainer decision, so it isn't a request for this PR.
6. **Typing nit (moot if the helper goes away):** `_raise_matched_input_errors` always raises, so it should return `NoReturn`, not `None`. With `None`, a type checker can't see that `expanded_incomings` is bound after the except branch.
7. Imports: `InputMatchedException` import is at module top. Fine.

## mvdbeek's comments

- 07-03 "include a test for the API level behavior": a test was added, but it doesn't exercise the intended behavior (wrong payload shape; the behavior it asserts doesn't exist).
- 07-05 and 07-15 "relevant test failure" ×2: **not addressed**. The author's 09-27 comment says they couldn't track it down. The 10-07 comment only resolves a merge conflict. Root cause is findings 1 + 3.

## Tests run

- Temporary probe API test, file removed afterwards, worktree left clean. Run with pytest against the shared `~/projects/repositories/galaxy/.venv`, `PYTHONPATH=<worktree>/lib`, at PR head `bd562019bde`:
  - `POST /api/jobs` with `multi_data_param`, `f1` = Batch of 2 HDAs, `f2` = Batch of 1 HDA (request-API shape) → **200** `{"tool_request_id": ...}`. Tool request → `state: failed`, `state_message.err_msg: "Received 1 inputs for 'f2' and 2 inputs for 'f1', these should be of equal length"`. Celery logged `ERROR galaxy.managers.jobs Problem validating tool state after request created` with the chained traceback.
  - `POST /api/tools` with the legacy shape → **400** `{"err_msg": "...equal length", "err_code": 400008}`. On dev, same status/message with `err_code` 0 (from code reading, not run).
- The PR's own test was not rerun locally. CI already shows it failing on the pydantic request-model rejection (job 87287064090, `test_jobs.py:1107` at that time).
- Tried to trial the suggested `JobsService.create` validation locally. Blocked by the session permission policy (no source edits in the shared worktree), so the sketch is unverified.

## Draft GitHub review (UNPOSTED)

> _Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally._
>
> Thanks for picking this up. The CI failure that keeps recurring has a concrete cause, and the fix probably needs to sit one layer higher.
>
> **Why the async test fails, and why the async change doesn't help yet**
>
> - The test posts the legacy `/api/tools` batch shape (`{"batch": True, "values": [...]}`) to `/api/jobs`. The tool request API validates against a strict pydantic model, so it returns 400 for the *shape* ("8 validation errors for multi_data_param (request model)…"), never reaching the matching code. The request API spelling is `{"__class__": "Batch", "values": [...]}`.
> - With that shape, `POST /api/jobs` returns 200 on this branch. `JobsService.create` only validates the request model, stores a `ToolRequest` and enqueues `queue_jobs`. `expand_incoming_async` runs later inside that Celery task, where `queue_jobs` catches every exception, marks the request `failed` with `str(e)`, and calls `log.exception(...)`. So the converted exception gives the same stored message, and the same Sentry event #22884 is about. I checked locally: 200, request `failed` with "Received 1 inputs for 'f2' and 2 inputs for 'f1', these should be of equal length", and the ERROR traceback is still logged.
> - On the sync path (`/api/tools`), `InputMatchedException` already subclasses `MessageException`, so it was already a 400. The wrapper only changes `err_code`. If the more specific code is wanted, `class InputMatchedException(RequestParameterInvalidException)` in `galaxy/util/permutations.py` does that for both paths without the try/except and helper.
>
> **Suggestion**
>
> As #22884 asks, check the lengths in `JobsService.create` before enqueuing. It can be a pure check on the decoded request state using the existing tool_util visitor, roughly:
>
> ```python
> # e.g. lib/galaxy/tool_util/parameters/ (alongside decode/encode), exported from __init__
> def validate_linked_batch_lengths(input_models: ToolParameterBundle, state: ToolState) -> None:
>     lengths: dict[str, int] = {}
>
>     def callback(parameter: ToolParameterT, value: Any):
>         if isinstance(value, dict) and value.get("__class__") == "Batch" and value.get("linked", True):
>             values = value["values"]
>             # collection map-over width is only known after dereferencing
>             if not any(isinstance(v, dict) and v.get("src") in ("hdca", "dce") for v in values):
>                 lengths[parameter.name] = len(values)
>         return VISITOR_NO_REPLACEMENT
>
>     visit_input_values(input_models, state, callback)
>     if len(set(lengths.values())) > 1:
>         described = ", ".join(f"'{name}' ({n})" for name, n in lengths.items())
>         raise RequestParameterInvalidException(f"Linked batch inputs must have equal numbers of values, received {described}")
> ```
>
> Call it right after `request_internal_state.validate(...)` in `JobsService.create`. Then the test (with the `__class__: Batch` payload) can assert a 400 straight from `POST /api/jobs`, and a second test can assert that equal-length linked batches still create a request. A batch of datasets matched against a collection map-over would still fail at Celery time. That seems fine to leave, maybe with a comment.
>
> With that in place, I'd drop the try/except and `_raise_matched_input_errors` from `Tool`. (If the helper stays, it always raises, so it should be annotated `NoReturn`.)

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- As written, the only observable API change is `err_code` 0 → 400008 for mismatched linked batches on `/api/tools`. Same status and message.
- The suggested follow-up turns an accepted-then-failed `/api/jobs` request (200 + `failed` tool request) into an immediate 400. Clients that poll tool request state for this error would now see it at submit time. The input is unsupported anyway, so this is stricter validation, not a new contract.
- Collection-vs-dataset linked mismatches would still fail asynchronously, so the two error surfaces stay split for that case.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that the request-time check skips exactly the batches whose width depends on dereferencing (HDCA/DCE map-over), so it can't reject a request that expansion would accept. A test for an equal-length linked batch alongside the mismatch case covers this.

</details>

## Fix branch — 2026-10-08

`jmchilton/galaxy` `fix-matched-batch-validation-23058` (head `78a4a3152cf`), two commits on top of PR head `bd562019bde`:

- `e107d2c4380` test: `test_multirun_on_multiple_inputs_mismatched_lengths` in `test_tool_execute.py` (cat1, linked batch 2 vs 1, flat/nested/request formats) asserts 400 + "should be of equal length".
- `78a4a3152cf` fix:
  - `permutations.assert_matched_lengths()` is the single length check; `build_combos` uses it too.
  - `InputMatchedException` now subclasses `RequestParameterInvalidException` (err_code 400008 on both paths).
  - `meta.validate_matched_batch_lengths(tool, request_internal_state)` reuses `split_inputs_nested` with a dataset-batch-only classifier. It skips hdca/dce map-overs, which still mismatch at queue time.
  - `JobsService.create` calls it right after the request-internal validation.
  - Reverts the PR's `Tool` try/except wrappers and its `/api/jobs` test, which used the legacy payload.

Net vs dev: 4 files, +75/−8. Nothing of the PR's source survives, only its intent.

Tests (shared galaxy venv with `PYTHONPATH` set to the worktree's `lib` and the test tool conf):
- Red: the new test fails only `[request]` at `bd562019bde`. It logs "Problem validating tool state after request created", the Sentry event.
- Green: the 9 multirun tests pass, and so do all 35 `request`-format tests in `test_tool_execute.py`.
- mypy: no errors in the touched modules.

Not pushed to the author or PR'd anywhere yet.
