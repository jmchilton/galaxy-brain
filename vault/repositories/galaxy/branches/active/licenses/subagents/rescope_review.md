# Re-scope review: `licenses_alt_original_scope`..`licenses`

**Top-line.** The re-scope is sound, and the review found no correctness bugs. Two small reuse fixes were applied as fixups, then autosquashed.
- **Commit 14 (`Refresh workflow run forms…`).** The workflow agreement walker now produces each refusal through `TOOL_ACCESS_PRECONDITION.unmet` once, instead of calling `allow_user_access` itself.
  - The invocation check then raises those stored refusals.
  - The walrus filter is gone. It could have raised `ToolExecutionPreconditionUnmet([])` with an empty message.
- **Commits 9 and 10.** The hand-rolled 30-second `time.sleep` poll loops (`_wait_for_job_state`, and the earlier `_wait_for_state`) now use `galaxy_test.base.populators.wait_on` with `DEFAULT_TIMEOUT`.
  - The 30-second limit was tighter than every other wait in the suite, which made a CI flake likely with `resubmit_after_delay`.

New head: `b3a9b588a60`. The backup is `backup/licenses_pre_rescope_review` = `30246b37ef6`. Nothing has been pushed.

## Not acted on

- **Workflow tests opt in to agreements; tool tests don't.** This is a decision for John.
  - The tool test interactor sends hashes for every declared agreement automatically. The gxwf `accept_license_agreements` field is opt-in and defaults to False.
  - The alternative is to default to True and put `accept_license_agreements: false` on the refusal case. That would match tool tests, and workflow tests that use licensed tools would pass without edits.
  - It would reverse an explicit re-scope decision and change the Planemo story, so I didn't flip it in a review fixup.
- **The stub unit test stays (`test/unit/workflows/test_workflow_license_agreements.py`).**
  - I tried adding an anonymous `POST` invocation to the published-workflow integration test. It is refused earlier with 403001, before the license preflight, so integration can't reach that branch this way. The addition was reverted.
  - As the re-scope debrief notes, a logged-in user without access needs a licensed data manager fixture.
- **The `expect_failure` gxwf case passes on any exception.** This is how the existing framework behaves. The integration tests pin the 403009 payload exactly.
- **`workflow_license_agreement_hashes` lives on `WorkflowPopulator`.** `LicenseAgreementsPopulator` has no workflow getter to delegate to, and moving it would couple the two populators. Left as is.
- **Nits, not worth churn:**
  - The `offered_datatype_converters` docstring carries rationale.
  - `TestLicenseAcceptanceResubmission` repeats about six config lines from `TestJobResubmissionIntegration`.
- **pgcleanup** logs SQL errors but `_pgcleanup_check_output` still passes. This is pre-existing and was already noted in the re-scope debrief.

## Validation at `b3a9b588a60`

- `test/unit/workflows/test_workflow_license_agreements.py`: 2 passed.
- `make mypy`: success, 2583 files.
- Lint on the changed files: ruff 0.17.1 check and format, black, isort, and flake8 with bugbear all pass. The pre-commit hooks passed on each fixup.
- Pyflakes is clean on the touched files at the rewritten commits 9, 10 and 14.
- Integration tests, run one at a time:
  - `test_license_acceptance.py`: 18 passed.
  - `test_license_acceptance_workflows.py`: 17 passed.

<details>
<summary>Full review</summary>

### Access check in discovery (`lib/galaxy/workflow/license_agreements.py`)

- The re-scope's choice not to use `get_accessible_tool` is correct.
  - That function is keyed by id and version and matches versions exactly. The walker resolves tools by `tool_uuid` and step version, the same way invocation does.
- Before this review, discovery checked access through `Tool.allow_user_access`, and the invocation check called `TOOL_ACCESS_PRECONDITION.unmet` again. The predicate is the same, but the two were separate call sites that could drift apart.
- Now the walker stores `inaccessible: dict[int, UnmetPrecondition]`, keyed by `id(tool)` so that a tool used in several steps produces one refusal.
  - The refusal comes from the shared precondition object, including its `require_login` versus admin-only message and `remedy_route`.
  - `check_workflow_license_agreements` raises the stored refusals.
  - `describe_workflow_license_agreements` reads only `.declared`.
- The check covers only tools that declare agreements, and it is documented that way. Non-licensed inaccessible tools are still refused per job at execution time, as before.

### `Registry.offered_datatype_converters()`

- It is a single filter, with `get_converters_by_datatype` built on it. The per-extension cache means it is only recomputed on a cache miss.
- Other consumers of `datatype_converters`:
  - `tools/__init__.py:726`, the Built-in Converters panel section. Converters stay directly runnable there, as documented.
  - `registry.py:1123`, the unpickleable-attribute list.
  - Neither should be filtered.
- The unit test in `test/unit/app/managers/test_datatypes.py` is at the right layer: the manager view over a sample registry, with two stub converters.

### 403009 API test (`test_run_inaccessible_tool_refused`)

- It is at the right layer and uses the existing `_different_user`, `test_history` and `history_jobs` helpers.
- It asserts the exact `unmet` payload and that no job was created.

### Creation-bound pins (rerun, remap, resubmission, resume) and `when=false`

- The tests are at the right layer: integration, because they need job configuration and resubmission. They reuse the `test_job_resubmission` constants and `LicenseAgreementsPopulator`.
- `_wait_for_job_state` is still needed:
  - `wait_for_job` treats `resubmitted` as final.
  - `wait_for_job` returns at `paused` without asserting it.
- Its body was moved onto `wait_on`. The sibling `_wait_for_state` for invocations got the same change for consistency.
- The `when=false` test asserts a 403 that names the agreement, a skipped job with a `one_time` association, and no persistent acceptance. This is good.

### gxwf `accept_license_agreements`

- **Schema.** It matches `expect_failure`'s shape (`bool | None = False`, with a title and description) and is mirrored in the `JobTestDict` TypedDict. No generated JSON schema in the client covers `TestJob`.
- **Populator.** It fetches hashes from `GET /api/workflows/{id}/license_agreements`. `rerun()` copies them, because `/invocations/{id}/request` doesn't record them. Both were shown red-to-green in the re-scope.
- **Consistency with the tool test interactor.** The tool interactor derives hashes from the server and sends them unconditionally. The workflow path derives hashes the same way, but is opt-in. See "Not acted on".
- **Fixture.** It covers a nested-subworkflow licensed step, plus a refusal case.

### Constraint and index names (PostgreSQL 63-character limit)

- I compiled the four new tables against the PostgreSQL dialect from model metadata. Every name is 63 characters or fewer.
- The workflow invocation foreign key's convention name, `workflow_invocation_license_acceptance_workflow_invocation_id_fkey`, is 66 characters. SQLAlchemy automatically shortens it to `workflow_invocation_license_acceptance_workflow_invocat_774b` (60 characters).
  - Only names produced by the naming convention get this hash-based shortening. An explicit string name that is too long raises `IdentifierError`, which is why only the unique constraint broke.
  - Alembic's `create_table` inherits `target_metadata`'s naming convention, so the migration produces the same name.
  - `check_model.sh` already passed on PostgreSQL in the re-scope.
- Nothing else needs renaming. The literal `workflow_invocation_license_acceptance_invocation_hash_key` (58 characters) is fine.

### Docs (`doc/source/dev/tool_license_agreements.md`)

The docs match the behavior on every point:
- Discovery omits inaccessible tools, and invocation refuses them with `kind: access`.
- `/api/datatypes/converters` no longer lists licensed converters.
- Skipped jobs record their authorization.
- The gxwf opt-in exists, and Planemo doesn't support it yet.

### Imports and comments

- Imports are at module top level.
- The new comments are short, apart from the converter docstring nit.

</details>
