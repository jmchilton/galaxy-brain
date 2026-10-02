# galaxy#23847 - Let only Galaxy choose a dataset's uuid

- Author: nuwang. +123/-12, 8 files, 1 commit (`b792c7297eb`). Base: merge-base `d12f9039128` w/ origin/dev.
- State: open, not draft. jmchilton already **APPROVED** (2026-10-01) + one inline comment on `set_metadata.py:567` ("couldn't figure out why I did this ... glad nothing went red"). No other comments, no linked issue.

## Summary

With `store_by="uuid"` a dataset's uuid is its file location. Before: a job could set its output's uuid via `galaxy.json` (`"uuid"` key), applied in `MinimalJobWrapper.__finish` (`jobs/__init__.py:2048`) and in extended metadata (`set_metadata.py:566`). Upload's requested uuid used that same channel (`upload_common.create_paramfile` -> `upload.py` emits `uuid` in galaxy.json -> job finish applies it), no validation.

PR:
- Drops both `context["uuid"]` assignments and the upload.py/paramfile passthrough.
- `new_upload` validates the requested uuid up front (`_unused_uuid`: parse, check no `Dataset` has it, else `RequestParameterInvalidException` -> 400) and sets it on the dataset at creation time.
- `library.py`: moves `uploaded_dataset.uuid = uuid_str` before `new_upload` so the library path-paste/server-dir path goes through the same check.
- New `tool_provided_metadata_uuid` test tool + `test/integration/test_requested_uuids.py` (5 tests, rerun under extended metadata + remote tool eval).

Small, focused, correct for the paths it targets. Side benefit: the requested uuid is now in place before the upload job writes the file, so the file lands at the right uuid path from the start.

## Path trace (origin/dev)

| Path | Sets `Dataset.uuid`? | After PR |
|---|---|---|
| galaxy.json `uuid` -> job finish (`jobs/__init__.py:2048`) | yes, unvalidated | removed |
| galaxy.json `uuid` -> extended metadata (`set_metadata.py:566`) | yes | removed |
| Upload tool (`grouping.py:488/554/582` -> `new_upload`) | via galaxy.json | set at creation, validated |
| Library `_make_library_uploaded_dataset` (`library.py:299`) | via galaxy.json | set at creation, validated |
| Data fetch (`__DATA_FETCH__`) | no uuid field in `schema/fetch_data.py` | n/a |
| Model store import, new dataset (`model/store/__init__.py:641-645`) | only if `allow_edit` | unchanged; user history/invocation imports use `allow_edit=False`, so no uuid preservation there - not broken |
| Model store import, `"dataset"` attrs edit (`handle_dataset_object_edit`, `DatasetAttributeImportModel.uuid` at `:199`) | yes when `allow_dataset_object_edit` | **unchanged** - see F1 |
| Extended-metadata job output import (`jobs/__init__.py:2220`, `allow_edit=True, allow_dataset_object_edit=True`) | yes, from job-written `metadata/outputs_populated` | unchanged - see F1 |
| Discovered outputs, non-extended (`output_collect`/`discover.py`) | Galaxy generates | n/a |
| Pulsar | runs same upload.py / set_metadata.py | covered by the same removals |

DB safety net already exists: `uq_uuid_column` unique constraint on `dataset.uuid` (migration `04288b6a5b25`). Pre-PR a colliding uuid failed at flush, but only after the object store push may already have clobbered the other dataset's file. PR's up-front check turns that into a clean 400 before any data moves.

## Findings (ranked)

1. **Low/informational - extended metadata still lets the job set uuid through the import store.** `model/store/__init__.py:199` (`DatasetAttributeImportModel.uuid`) + `:511-516` + `jobs/__init__.py:2220`. Job-written `outputs_populated` is imported with `allow_dataset_object_edit=True`, so a job that writes that store directly can still change an output's uuid (and `external_filename`, `object_store_id`). PR closes the galaxy.json channel, which is the one honest tools would use. Under extended metadata the job already pushes to the object store itself, so this boundary was never tight; module docstring in the test ("a job that could change its output's uuid could make it share another dataset's file") overstates what's guaranteed there. Not a blocker. Optional follow-up: in `handle_dataset_object_edit`, ignore/reject a `uuid` differing from the existing dataset's when editing an existing (`"id"`) dataset.

2. **Low - multi-file uploads with one uuid fail midway, leaving orphans.** `grouping.py:554-582` copies one `uuid` onto every URL-paste line's file bunch; `library.py` `upload_paths`/`upload_directory` apply `params["uuid"]` to every file. `new_upload` commits the first dataset (with the uuid), then the second call's `_unused_uuid` 400s - first HDA/LDDA left `queued` with no job. Pre-PR this failed too (unique constraint at job finish), so not a regression, just a different broken state. Cheap fix if wanted: validate all requested uuids (incl. duplicates within the request) before creating any dataset, e.g. in `get_uploaded_datasets` / the upload action loop.

3. **Nit - set uuid at construction instead of rewrite+commit.** `upload_common.py:298-301`. Dataset is created+committed with a random uuid, then reassigned and committed again. Works; passing the uuid into creation would avoid the extra commit. Not worth churning.

4. **Nit - test config redundant.** `test_requested_uuids.py:21-23`: driver already defaults `object_store_store_by="uuid"` and `retry_metadata_internally=False` (`driver_util.py:246,274`). Harmless; explicit `store_by` documents intent. The non-extended class could live as API tests (`test_tools_upload.py`), only the extended variant needs integration - preference, skip.

## What's fine

- Imports top-level (`from uuid import UUID`, `Dataset`).
- Check happens before any dataset creation for the single-file case.
- No API schema change: `uuid` upload param and `LibraryContentsFileCreatePayload.uuid` still accepted; only invalid/duplicate values now 400 at request time instead of failing the job. No client schema regen needed.
- Answer to PR body's "stop accepting uuid altogether?": no in-repo caller sends `files_0|uuid` (client, populators, fetch). Dropping would be fine technically but is an API removal (library contents schema exposes it, bioblend may); this PR's validate-at-create is the safer middle ground.
- Comments: the one inline comment + `_unused_uuid` docstring explain *why*, not *what*. Acceptable.
- Removing galaxy.json `uuid` silently ignores it for third-party tools that set it; unlikely to exist (`dataset_uuid` - the matching key - is separate and untouched in `provided_metadata.py`). Worth a line in release notes maybe.

## Tests

- Red on dev (by reasoning, not run - integration tests not run per instructions):
  - `test_tool_cannot_change_its_outputs_uuid` - fails on dev (uuid applied from galaxy.json).
  - `test_upload_requesting_a_uuid_in_use_is_refused` - dev returns 200, job later fails; asserts 400 -> red.
  - `test_upload_requesting_an_invalid_uuid_is_refused` - dev 200 -> red.
  - `test_tool_cannot_take_another_datasets_uuid` - red if dev's push clobbers `other`, else uuid assert/unique-constraint path; plausibly red.
  - `test_upload_gets_the_uuid_it_requested` - likely green on dev too; regression guard for the moved code path. Fine.
- Gaps:
  - `test_upload_gets_the_uuid_it_requested` asserts uuid only; also assert content reads back (`_content == "content\n"`) - that's what proves the file is at the requested uuid's location, the whole point under store_by uuid.
  - Library path (`library.py` reorder) untested. A `LibraryPopulator` path-paste with `uuid` would cover the one non-test production change without coverage.
- No weakened tests; nothing trivial.

## Verdict

**Approve with nits** (already approved by jmchilton). Optional: content assert + library-path test; F2 if cheap.

## Draft GitHub comment

> *Posted by Claude (AI assistant) on behalf of jmchilton.*
>
> Follow-up notes on top of the approval - none blocking:
>
> - `test_upload_gets_the_uuid_it_requested` checks the uuid but not the content. Asserting the content reads back would prove the file actually ended up at the requested uuid's location, which is the point under `store_by="uuid"`.
> - The `library.py` reorder (path-paste / server-dir uploads with `uuid`) has no test. A `LibraryPopulator` upload with a `uuid` would cover it.
> - Multi-file requests share one uuid (URL paste with several lines in `grouping.py`, library `upload_paths`/`upload_directory`). The first dataset gets created and committed, then the second `_unused_uuid` returns a 400 and leaves the first one queued with no job. This was already broken before (the unique constraint fired at job finish), so it's not a regression. If it's cheap, validating every requested uuid, duplicates included, before creating any dataset would make this a clean 400.
> - For the record: under extended metadata, the job-written `outputs_populated` store is still imported with `allow_dataset_object_edit`, and `DatasetAttributeImportModel` includes `uuid`. So a job that writes that store directly could still change the uuid. This PR closes the galaxy.json channel, which is what honest tools would use. Tightening the import side (refusing to change an existing dataset's uuid on edit) could be a follow-up.
