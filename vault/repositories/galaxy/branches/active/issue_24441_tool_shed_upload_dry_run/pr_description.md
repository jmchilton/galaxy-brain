Implement 🎯 #24441 - a `dry_run` mode for the Tool Shed upload API that reports what an upload would do to the repository's installable revisions.

When a tool's version stays the same, an upload doesn't create a new installable revision: it moves the latest one to the new tip and overwrites it in place. One `owner/repo/tool/version` then names two different behaviors. Nothing tells the uploader this will happen before it does. `shed_lint` can't check it either: the shed serves rendered tool XML, but not the scripts, `.loc.sample`s or dependency files next to it (galaxyproject/planemo#1525, galaxyproject/planemo#1752). With this branch a client uploads the same tarball with `?dry_run=true` and the shed answers with its own logic:

```
POST /api/repositories/{id}/changeset_revision?dry_run=true
```

```json
{
  "dry_run": true,
  "no_changes": false,
  "installable": true,
  "creates_new_installable_revision": false,
  "overwrites_changeset_revision": "6030c2181aa5",
  "tools": [
    {"id": "Add_a_column1", "old_version": "1.0.0", "new_version": "1.0.0", "status": "unchanged"}
  ],
  "files": {"added": ["column_maker_unchanged/README.txt"], "removed": [], "modified": []}
}
```

That response was captured from the test suite (`ok`/`message` trimmed): the upload adds a file at the same tool version, so it would overwrite revision `6030c2181aa5` rather than add one. A client like planemo can turn that into "you changed files without bumping a version".

***The API is for upload clients such as planemo and CI, using an account with push rights to the repository. This PR adds no planemo, bioblend or UI changes.***

The dry run runs the real upload path in a throwaway clone: archive checks, dependency fixups, commit, metadata generation, and the same new-revision-or-overwrite decision real uploads use (now shared through `plan_tip_metadata()`). ***It persists nothing: no database rows, no change to the repository, no email alerts, no change to the shed's in-memory data tables.*** ***Real uploads behave as before: they reach the same new-revision-or-overwrite decision through `plan_tip_metadata()`, and the baseline tests in the first commit pin that.***

Rejections before the commit raise what a real upload raises. Failures a real upload would hit after committing come back as `ok: false`: invalid tools with the real upload's message, metadata generation errors with the exception type (traceback in the server log). An upload identical to the tip returns `no_changes: true`. ***A dry run can miss two things a real upload does: data manager changes (reported as overwrites) and conflicts with data tables that earlier uploads left in that worker (see Known limits).***

***Sheds without this PR ignore `?dry_run=true` and do a real upload, so clients should check that the response has `"dry_run": true`, or check the shed version first.***

***This PR also changes admin `reset_metadata` output.*** Reset used to stage de-suffixed sample copies inside the clone it was scanning, and read samples from the tip. Now it stages them in a temp dir and reads them from the revision being reset, like uploads do. The dry run generates metadata in reset mode from a clone, so it inherited reset's sample bugs; the fix applies to reset on its own:

- A tool shipped only as `*.xml.sample` no longer becomes a tool.
- Old revisions read their own samples instead of the tip's.
- Because copies are staged outside the clone, they no longer leak into later revisions across `hg update`, and a non-`.sample` `.loc` at the repository root no longer satisfies a data table.

So some repositories may get different metadata rows after an admin reset.

<details><summary>Response fields</summary>

| Field | Meaning |
|---|---|
| `ok` / `message` | `ok: false` means a real upload would commit (and, for invalid tools, still store metadata), then fail |
| `no_changes` | The upload equals the tip; a real upload would be rejected |
| `installable` | Whether the metadata row the new tip gets would be installable |
| `creates_new_installable_revision` | The new tip gets its own installable revision (requires `installable`) |
| `overwrites_changeset_revision` | The latest revision that would be moved to the new tip and overwritten |
| `tools` | Per-tool versions vs the latest revision: `added`, `removed`, `updated`, `unchanged` |
| `files` | Paths added, removed or modified vs the tip |

</details>

<details><summary>Known limits (each mirrors today's real-upload behavior)</summary>

- **Data manager repositories.** `new_data_manager_required` reads the wrong metadata key, so a data manager change never forces a new installable revision. The dry run reports what real uploads do today (an overwrite). The bug is on every release branch, and fixing it changes real uploads and flips a `dev` test, so it needs its own release-targeted PR.
- **Data table samples.** A real upload also checks `tool_data_table_conf.xml.sample` against the worker's in-memory tables, which hold whatever earlier uploads to that process left there. The answer depends on the worker and restart history, so the dry run checks against fresh tables. Metadata generation already validates the same files against fresh tables on every upload. The fix belongs on the upload side (drop or rescope that check) and is a design call for a follow-up.
- `content_alerts` (HTML/image warnings) is left out of the response; it is moderation-only.

</details>

<details><summary>Commits</summary>

1. Baseline tests pinning real upload outcomes: new revision vs overwrite, no changes, alerts.
2. Fix `upload_tar`'s existing `dry_run`: it leaked its clone and still sent alerts.
3. Split the tip metadata decision (`plan_tip_metadata`, `tip_metadata_error`) out of `set_repository_metadata`. Behavior unchanged.
4. Extract the orphan tool dependency message helper.
5. Key metadata path stripping and cleanup on `files_dir`.
6. Isolate sample files when resetting metadata (the `reset_metadata` fix).
7. `?dry_run=` on the route, response models, populator helpers, regenerated shed `schema.ts`.
8. `installable`, reusing the downloadable rule of whichever branch the real upload takes.
9. Metadata generation failures return `ok: false`; details go to the server log.

</details>

## Risks

This adds a public Tool Shed API response that clients such as planemo will build on, so its field semantics are a one-way door. It also changes the metadata rows an admin `reset_metadata` produces for some repositories.

<details><summary>Risk Details</summary>

- `RepositoryUpdateDryRun` field names and meanings (especially `creates_new_installable_revision` requiring `installable`) are hard to change once clients consume them.
- `reset_metadata` output changes for repositories with sample-only tools, root-level non-`.sample` `.loc` files, or samples that differ between revisions.
- Real uploads now take the new-revision-or-overwrite decision through the split-out `plan_tip_metadata()`; the baseline tests pin that their outcomes are unchanged.
- The `lib/galaxy` metadata generator change only affects reset mode, which only the Tool Shed uses; Galaxy's install-time metadata is unchanged.
- Sheds without this PR ignore `dry_run` and perform a real upload; clients need to check the response's `dry_run` field or the shed version.
- Data manager repositories are reported as overwrites until the `new_data_manager_required` key bug is fixed separately.
- Dry runs do the full clone, commit and metadata generation, so they cost about as much as a real upload.

</details>

<details><summary>Risk Review Advice</summary>

Review the response schema in `tool_shed_client/schema` as an API decision: whether the field names and the `ok` / `no_changes` / raise split are what clients should depend on.

Check the `reset_metadata` change in `metadata_generator.py` (commit 6) on its own: reset now agrees with upload, and that commit's tests show the old behavior turning a sample-only tool into a tool.

</details>

## Context

Builds on 🔀 #15639 (Tool Shed 2.0, where the unfinished upload `dry_run` started) and 🔀 #21786 (reset metadata `dry_run`, whose in-memory metadata seam this reuses). Motivated by galaxyproject/planemo#1525 and gaps in galaxyproject/planemo#1752's rendered-XML comparison. Alternative kept on 🌿[`issue_24441_tool_shed_upload_dry_run_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24441_tool_shed_upload_dry_run_alt_original_scope) - the dry run alone: sample isolation is a dry-run-only flag, so `reset_metadata` is unchanged and its sample bugs stay, and there is no `installable` field. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>As implemented, after expanding to fix <code>reset_metadata</code> sample handling and add <code>installable</code>.</summary>

- Round 1 expanded the branch: reset-mode sample isolation (fixing three reset bugs and deleting generator code) and the `installable` field, so `creates_new_installable_revision` can't mean "a new but uninstallable row" once clients depend on it.
- Round 2 kept it as is. The data manager key fix and the data-table check stay as separate follow-ups because both change real uploads on production sheds.
- Rejected: a "why a new revision" reasons field, per-tool content-change flags, `content_alerts`, a Tool Shed 2.0 UI, warning on or refusing real overwrites, and planemo/bioblend clients.
- Possible splits (cleanup / reset fix / feature) were listed; the commits are ordered so they can be read in sequence instead.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve after one rename; the reset fix is a net simplification of the metadata generator.</summary>

- Renamed `get_relative_path_to_repository_file`'s `work_dir` parameter to `files_dir`, its only value since the path-stripping commit.
- No file newly crosses 1k lines, and `metadata_generator.py` shrank.
- Kept: `installable` reusing `create_or_update_repository_metadata_with_details(dry_run=True)` for the create branch (the same seam reset's dry run uses), and the broad catch that turns post-commit failures into `ok: false`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Parity tests compare each prediction with the real upload's rows; each fix and the dry run were shown red without their change.</summary>

- Replaced a `copy_sample_file` mock with a parity test: two revisions with their own data table samples keep identical rows after reset.
- Shared duplicated test helpers in `_util.py`.
- Red checks: the 6 functional `test_upload_dry_run_*` tests fail with the base route (it ignores `dry_run` and does a real upload); the reset tests fail with the base generator (sample-only tool present, revision row missing); the `installable` tests fail with `installable = bool(metadata_dict)`.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding fixed (generation exceptions escaped the dry run), one left as a design decision (data table check).</summary>

- Fixed: an exception from metadata generation (e.g. a missing macro import) escaped the dry run where a real upload would commit and then fail. It now returns `ok: false`; the test checks the real upload raises and rows are unchanged.
- Left: the data-table check against per-worker in-memory tables (see Known limits). Mirroring it would make the dry run as nondeterministic as the real check.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests, the <code>upload_tar</code> fix and behavior-preserving refactors come first; the reset fix is its own commit ahead of the feature.</summary>

The reset fix was moved ahead of the feature so it stands alone, and the feature no longer adds a dry-run-only flag for the next commit to delete. Unit tests pass at every commit.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Pre-commit rejections and permission errors raise as a real upload would; post-commit failures return `ok: false` with the invalid-tool message or the generation exception type (traceback in the server log).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The parity tests run the real upload afterwards and compare the prediction with the stored rows.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `Baseline tests for tool shed upload metadata outcomes` is test-only and first.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/tool_shed/test_upload_metadata.py`: baseline real-upload outcomes plus dry-run parity tests (new revision, overwrite, TipOnly, metadata errors, generation failure, sample files, installable, nothing persisted, app data tables untouched, temp files removed).
- `test/unit/tool_shed/test_repository_utils.py`: `upload_tar` dry run sends no email alerts and removes its clone.
- `test/unit/tool_shed/test_repository_metadata_manager.py`: reset ignores sample-only tools and reads each revision's own samples.
- `lib/tool_shed/test/functional/test_shed_repositories.py`: 6 `test_upload_dry_run_*` API tests (overwrite, new revision, removed tool, first upload, no changes, push permission).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
