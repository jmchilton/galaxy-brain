Fixes #22705.

## What

`GET /api/jobs/{id}` (and `POST /api/jobs/search`, which shares the same response
model) now report `implicit_collection_jobs_id` — the encoded id of the
`ImplicitCollectionJobs` group a job belongs to when it was mapped over a
collection, or `null` when it was not.

The model link has always existed (`Job.implicit_collection_jobs_association`), and
`/api/jobs` already *filters* by `implicit_collection_jobs_id`, but nothing could
read the id back off a job. HDCA detail has exposed the same id for a while
(`HDCADetailed.implicit_collection_jobs_id`), so this just closes the symmetric gap
on the job side.

## How

- `Job.implicit_collection_jobs_id` property on the model, added to
  `dict_element_visible_keys` only. The `element` view backs both `show` and
  `/api/jobs/search`; the index paths use the `collection` / `admin_job_list` views
  and are deliberately untouched — no extra query on bulk listings.
- `EncodedJobDetails.implicit_collection_jobs_id: EncodedDatabaseIdField | None`,
  inherited by `ShowFullJobResponse`. Additive and optional.
- Regenerated `client/packages/api-client/src/schema/schema.ts`. No `.vue` changes;
  `pnpm type-check` is green.

Cost is one indexed single-row SELECT per job on a detail view. Nothing bulk grew a
query.

## Test cleanup

`_icj_id_for_job_in_history` in `test_workflow_extraction.py` existed only because
this field was missing — it walked every dataset collection in the history and
issued a `jobs?implicit_collection_jobs_id=` probe per candidate until one contained
the job. Its single caller now reads the id off the job directly, and the helper is
gone.

`_icj_id_for_hdca` moves to `DatasetPopulator.get_hdca_implicit_collection_jobs_id`
(9 call sites) — it was generally useful and did not belong on an extraction-test
mixin.

## Testing

New in `test_jobs.py`:

- `test_show_job_exposes_implicit_collection_jobs_id` — a mapped-over job reports the
  same id as its output HDCA. Red before the change with `KeyError`.
- `test_show_job_implicit_collection_jobs_id_null_for_unmapped_job` — an unmapped job
  reports `None`. Red before the change with `KeyError`.
- `test_search_jobs_exposes_implicit_collection_jobs_id` — `POST /api/jobs/search`
  builds `EncodedJobDetails` directly rather than through `view_show_job`, so it gets
  its own coverage: null for an unmapped job, a single non-null id shared across a
  mapped-over batch, and agreement with what `show` reports for the same job.

The scoping guard lives in `test/unit/data/model/test_model.py` rather than in the API
tests. An API-level assertion cannot fail: `/api/jobs` declares
`list[ShowFullJobResponse | EncodedJobDetails | JobSummary]`, `EncodedJobDetails.params`
is required, and a collection-view job dict has no `params` — so every index row
resolves to `JobSummary`, which never declares the field, whatever the model does. The
unit test asserts the key is on the element list and not the collection list, and that
every collection key resolves against `Job.table.columns`. That second assertion matters
on its own: `ImplicitCollectionJobs.get_job_attributes` does
`getattr(Job.table.columns, attr)` over `dict_collection_visible_keys`, so a property
added there would `AttributeError` on every mapped invocation step.

`lib/galaxy/agents/operations.py` encodes only keys listed in `ID_FIELDS`, so the new
field is added there — otherwise agents get a raw integer next to encoded `id` and
`history_id`.

Local runs:

| Suite | Result |
|---|---|
| `test_jobs.py -k implicit_collection_jobs` | 4 passed |
| `test_workflow_extraction.py` (full) | 65 passed, 1 skipped |
| `test/unit/data/model/test_model.py` | 5 passed |
| `test_agents.py::TestAgentOperationsManagerEncoding` | 3 passed |
| `client` `pnpm type-check` | clean |
| black / ruff / isort / flake8 (pinned) | clean |

Both new field tests and both new guards were verified red first — the model guard by
adding the key to `dict_collection_visible_keys`, the agent one by dropping it from
`ID_FIELDS`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
