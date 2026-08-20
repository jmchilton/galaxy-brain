# PR 1520 — export a run as a compressed archive / upload to a Galaxy instance

- **PR:** https://github.com/galaxyproject/planemo/pull/1520
- **Author:** Smeds (Patrik Smeds)
- **Opened:** 2025-04-25 · last activity 2025-05-19
- **Assessed:** 2026-08-20 · **closed 2026-08-20** (not rebased, not taken over)
- **Size:** +115 / -1, 4 files · `CONFLICTING` / `DIRTY`

Adds three options to `planemo run`: `--archive_file` (write the run to a
`.tar.gz`), `--upload_instance_url` and `--upload_api_key` (POST it to another
Galaxy).

## Recommendation: close it

Not because the idea is bad — it's a good idea, and it is **already in planemo**.
Both halves of the export story were built by Smeds and mvdbeek in the seven
weeks *after* this PR was opened, using a better mechanism. What remains
unimplemented is the upload half, and that should not be built the way this PR
builds it.

## Timeline — the PR was overtaken by its own author

| Date | Event |
| --- | --- |
| 2025-04-25 | #1520 opened |
| 2025-05-06 | Smeds hits a Galaxy-side blocker on import: datasets arrive discarded |
| 2025-05-07 | Smeds root-causes it to `discarded_data=ImportDiscardedDataType.FORCE`, hardcoded in `model_stores.py` |
| 2025-05-19 | Smeds asks about GBCC timing. **Last activity on the PR.** |
| 2025-06-03 | **Smeds' own `planemo invocation_export` merged** (`11579f5d`) |
| 2025-06-19 | mvdbeek renames it `invocation_download` |
| 2025-06-20 | **mvdbeek adds `planemo run --export_invocation`** (`62782b4a`) |
| 2026-01-14 | Galaxy fixes the discarded-data blocker (`b8d6eba118`, `1804c57b3f`) |

## What master already does

`planemo run --export_invocation <path> [rocrate.zip]` — the export-during-a-run
feature, landed in the same function this PR patches (`_execute` in
`planemo/galaxy/activity.py:355-362`), wired through `cmd_run.py:35-36`.

`planemo invocation_export ID --output invocation.rocrate.zip` — standalone
export of an existing invocation.

Both route through `export_invocation_as_archive` in `planemo/galaxy/api.py`,
which uses bioblend's `get_invocation_archive`.

So `--archive_file` is fully superseded. Only `--upload_instance_url` is not
covered by anything on master.

## Why the surviving half shouldn't be rebased either

The upload path in this PR is built on the wrong foundation:

1. **Wrong object.** It exports the *history* via the legacy JEHA flow
   (`export_history` → `download_history` → `.tar.gz`). Master exports the
   *invocation* as a model store (`rocrate.zip` and friends). For a workflow
   run the invocation is the thing with the provenance; the history is a
   side-effect. Rebasing would reintroduce the older, weaker mechanism
   alongside the newer one.
2. **Bypasses bioblend.** Posts with raw `requests` to `/api/histories`, while
   every other remote call in planemo goes through bioblend.
3. **API key in the query string** — `f"{upload_url}?key={upload_key}"`. Keys in
   URLs land in server logs, proxy logs, and shell history.
4. **Leaked file handle** — `files={'archive_file': open(..., 'rb')}` is never
   closed.
5. **Typo in the log line** — `kwds.get('arhicve_file')` (`activity.py`, the
   `shutil.copy` branch). Always `None`, so the vlog says
   `Archive None created.`
6. **Import placement** — `import requests` is inserted into the stdlib block
   between `os` and `shutil`; isort would reject it, so CI lint fails as-is.
7. **Adds ~40 lines to `_execute`**, a function already carrying `# noqa C901`.
8. **`status_code == 200`** only; the import endpoint can return 202.

Points 3–8 are all fixable. Points 1–2 are the reason not to bother: the
correct version of this feature is a different, smaller change.

## The upstream blocker is gone

The thing that actually stalled this PR was a Galaxy bug, and Smeds diagnosed
it correctly. `create_objects_from_store` hardcoded
`discarded_data=ImportDiscardedDataType.FORCE`, so anything imported through
`/api/invocations/from_store` arrived with
*"This dataset has been discarded and its files are not available to Galaxy."*

Current Galaxy reads it from the request instead:

```python
import_options = ImportOptions(
    discarded_data=ImportDiscardedDataType(payload.discarded_data),
    ...
)
```

Present in `release_26.0` and `release_26.1`, so shipped. (`git merge-base
--is-ancestor` says no for the release branches — they carry cherry-picks, not
the dev commits — but the code is there; check the file, not the ancestry.)

So a fresh "push this invocation to another Galaxy" feature is now viable in a
way it wasn't in May 2025.

## If the upload feature is still wanted

It's a small, separate piece of work, not a rebase:

- Export via the existing `export_invocation_as_archive`.
- Import via `POST /api/invocations/from_store` with `history_id`,
  `model_store_format`, `store_content_uri`, and now `discarded_data`.
- **bioblend has no `from_store` method** — it has `get_invocation_archive` for
  export but nothing for import. So this needs either a bioblend addition
  (better, and reusable) or a documented raw call in `planemo/galaxy/api.py`.
- Auth via header, not query string.

Worth confirming demand first: the motivation was a GBCC demo that happened
over a year ago.

## Outcome

Commented and closed 2026-08-20 —
[comment](https://github.com/galaxyproject/planemo/pull/1520#issuecomment-5361274953).
The comment leads with the fact that Smeds' own `invocation_export` covers it
and credits his (correct) diagnosis of the Galaxy-side blocker, so it reads as
"you already solved this" rather than a rejection. The code-level defects
(finding list above) were deliberately left out of the comment — piling on
critique of code that isn't merging adds nothing. They stay here in case the
upload feature is ever picked up.

## Still open

- Is cross-instance upload wanted by anyone, or was it GBCC-specific?
- If wanted: add `from_store` to bioblend (reusable), or keep a raw call in
  `planemo/galaxy/api.py`?
