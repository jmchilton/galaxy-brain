# Scope evaluation (second pass, after re-scope)

**Recommendation: as implemented.** The re-scoped branch covers everything #24441 asks for except `content_alerts`, which was dropped on purpose. It also takes the two expansions from the first evaluation: reset-mode sample isolation and the `installable` field. Neither deferred decision has a new reason to come back into this branch. The data manager key bug is unchanged and is also on `release_26.1` and `release_26.2`. For the data-table parity gap, the new evidence (#24328, `94a027ca9c5`, the `d44a20cef09` precedent) only strengthens the case for a separate upload-side follow-up, and that follow-up's direction is a design call. No other candidate is worth parking the branch for. Leave out:
- hoisting the dry run's throwaway `ToolDataTableManager`
- a "why a new revision" reasons field
- per-tool content-change flags
- reset/upload parity for empty rows
- legacy upload routes
- the Tool Shed 2.0 UI
- warning on or refusing real-upload overwrites
- `numeric_revision`
- planemo or bioblend clients

## Possible Decompositions

Excluding the generated `schema.ts`, the branch adds about 904 lines and removes about 122:
- production: +320/−108
- tests: +584/−14 (`populators.py` and `test_shed_repositories.py` counted as tests)

It already comes as ordered, reviewable commits. Each option keeps the baseline first.

| Short | Commit | Prod | Test |
|---|---|---|---|
| BASE | `304d663321f` Baseline tests for upload metadata outcomes | 0 | +80 |
| TAR | `1edf3d22bf6` `upload_tar` dry run clone leak + alerts | +38/−4 | +52 |
| REF | `4731af41295` plan/apply split, `dff4425ce14` orphan helper, `4a7ff284e3b` `files_dir` keying | +98/−80 | 0 |
| ISO | `b6f362b2bbc` Isolate sample files when resetting metadata | +6/−19 | +96/−1 |
| API | `9813d55182b` `?dry_run=` route, models, populator, functional tests | +163/−8 | +310/−15 |
| INST | `9e0e41626e1` `installable`, plus `574ce683a19` generation failure → `ok=false` | +21/−3 | +48 |

- **Option A (three PRs):**
  1. BASE + TAR + REF: upload metadata cleanup, behaviour-preserving apart from the latent `upload_tar` fixes.
  2. ISO: changes admin `reset_metadata` output.
  3. API + INST: the feature.
- **Option B (reset fix first):** ISO lands alone as a `reset_metadata` bug fix (sample-only tools, copies leaking across `hg update`, tip samples read for old revisions). It needs `4a7ff284e3b` and the `_util.py` tool-data scaffolding. Then BASE + TAR + rest of REF, then API + INST. Whether ISO could target a release branch is a question for John. Not checked.
- **Option C (two PRs):** BASE through ISO, then API + INST.
- **Option D (one PR):** as is. The commits already let reviewers read it in order.

## Scopes considered

### As implemented (recommended)

`POST /api/repositories/{id}/changeset_revision?dry_run=true` runs the upload in a throwaway clone and reports the following, without persisting anything or sending alerts:
- accept or reject
- `no_changes`
- new row vs overwrite (and which changeset)
- `installable`
- per-tool version status
- file adds/removes/modifies

Real uploads share the `plan_tip_metadata()` decision. Reset mode always stages samples in `ValidationContext`'s temp dir.

| Pros | Cons |
|---|---|
| <ul><li>Every field in the issue sketch except moderation-only `content_alerts`.</li><li>The dry run and real uploads share the decision code. Parity tests compare each prediction with the real upload's rows.</li><li>Fixes three `reset_metadata` sample bugs and an exception leak, while deleting generator code.</li><li>`installable` settles the field semantics before planemo consumes the schema.</li></ul> | <ul><li>Data manager repos are still misreported as overwrites (see the data manager key scope).</li><li>Data-table validation is a documented parity gap (see the ephemeral data tables scope).</li><li>The feature PR also changes admin `reset_metadata` output (note it in the PR body).</li></ul> |

### Expand (deferred, unchanged): fix `new_data_manager_required`'s key

`compare_data_manager` reads top-level `data_managers`, but the key is nested under `data_manager`. As a result, data manager changes never force a new installable revision.

| Pros | Cons |
|---|---|
| <ul><li>The dry run's headline answer is wrong for data manager repos without it.</li><li>About 5 lines.</li></ul> | <ul><li>Changes which real uploads create installable revisions on production sheds.</li><li>Flips a `dev` assertion (`test_reset_dm_with_uninstallable_revisions`).</li><li>Release-branch bug, so it belongs on its own branch.</li></ul> |

<details><summary>What's new: nothing that changes the decision</summary>

- `origin/dev` hasn't moved past base `a468ce9de10` in the tool shed metadata code.
- The bug is also on `release_26.1` (line 712) and `release_26.2` (line 713), not just `release_25.1`/`26.0`. The `index.md` decision note can list all four.
- That widens the backport list but doesn't argue for this branch. Keep it deferred.

</details>

### Expand (deferred, new context): data-table validation against ephemeral app tables (Codex P1)

The dry run validates `tool_data_table_conf.xml.sample` against a throwaway `ToolDataTableManager`. A real upload merges into the shed process's `app.tool_data_tables` and can reject a column mismatch with a same-named table from any earlier upload in that worker. The fix that would close the gap is on the upload side, not in the dry run.

| Pros | Cons |
|---|---|
| <ul><li>Option (a) below is about 3 lines on a line this branch already edits. It deletes the `if dry_run` conditional in `commit_util` and gives exact parity.</li><li>Fixes real uploads that are rejected depending on worker and restart history.</li></ul> | <ul><li>Changes which real uploads a production shed rejects. That is the same class as the data manager deferral.</li><li>The fix could go either way (drop the check, or broaden it). That is a reviewer design call.</li><li>Flips this branch's own assertion (`test_dry_run_leaves_app_tool_data_tables_alone` line 218, which pins that a real upload adds the bowtie tables).</li></ul> |

<details><summary>New evidence (supports a separate follow-up, not this branch)</summary>

- **Generation already validates the same files on fresh tables.** Every real upload's metadata generation validates each `tool_data_table_conf.xml.sample` against `ValidationContext`'s fresh tables (`metadata_generator.py` ~301–309). That has been the case since `d44a20cef09` (mvdbeek, 2017, "Use a temporary ToolDataTableManager when generating metadata", fixing app-wide bleed). So `commit_util`'s check is the only one that consults process-local state.
- **Nothing else live reads the shed's app tables.** In live shed code, `app.tool_data_tables` (`webapp/app.py:86`, built with no config) is written and read only by `commit_util`.
  - `tool_shed/tools/tool_validator.py` also loads and resets app tables.
  - But `load_tool_from_changeset_revision` has no caller in `lib`.
- **Mismatches are louder since 26.1.** `94a027ca9c5` (Nate Coraor, 2026-05, 26.1+) made column mismatches raise `DataTableColumnMismatch` from `load_from_config_file`.
- **#24328 points the other way.** It is open: a data manager whose `indexed_maf_files` collides with Galaxy core's table stops Galaxy from starting. The shed's ephemeral check could never catch that, because it never sees core tables. But it suggests reviewers may want the shed to validate *more* (against core or known table names), not less.
- **Follow-up issue options:**
  - (a) Always validate against a per-upload throwaway manager, or drop the `commit_util` check as redundant with generation.
  - (b) Validate against core or known table definitions, per #24328.
- (a) would remove the dry-run special case. (b) would need the dry run to load the same registry.

</details>

### Expand (not recommended): one throwaway `ToolDataTableManager` per dry-run upload

Hoist the manager out of `commit_util`'s per-file loop. Then two sample confs in one tarball that define the same table with different columns are rejected before commit, as they would be in a real upload.

| Pros | Cons |
|---|---|
| <ul><li>A 2-line change, and it is deterministic.</li></ul> | <ul><li>The dry run already catches the conflict. Generation loads every sample conf into one `ValidationContext` manager and reports `ok: false` with the error. Hoisting only changes "rejected" to "commits then fails".</li><li>Multi-sample-conf tarballs are rare.</li><li>Superseded by option (a) in the ephemeral data tables scope if that is ever taken.</li></ul> |

### Expand (not recommended): report why a new revision is or isn't required

Have `new_metadata_required_for_utilities()` return which utilities differ (tools, repository dependencies, tool dependencies, data managers), and expose them as `new_revision_reasons`.

| Pros | Cons |
|---|---|
| <ul><li>The schema is new and cheap to extend now.</li><li>Explains new revisions driven by dependencies, which `tools`/`files` don't show.</li></ul> | <ul><li>planemo's motivating check needs only overwrite plus changed files, and that works today.</li><li>"data_managers" would never appear until the data manager key fix lands, so it is misleading.</li><li>Refactors four predicate methods for a nice-to-have.</li></ul> |

### Expand (not recommended): per-tool "content changed" at the same version

Compare each tool's config (with macros) between the latest row and the clone, so planemo#1752's rendered-XML check could ask the shed instead.

| Pros | Cons |
|---|---|
| <ul><li>Finer than the repository-wide file list.</li></ul> | <ul><li>Unclear semantics: macros, scripts and test data shared across tools.</li><li>Not in the issue. The issue chose file lists so clients can explain an overwrite.</li><li>Better designed once planemo consumes the dry run.</li></ul> |

### Expand (not recommended): upload/reset parity for empty, non-downloadable rows

The test challenge found two things:
- upload keeps a non-downloadable row for a sample-only revision, but reset doesn't recreate it
- before this branch, reset wrongly turned that revision into a tool row

| Pros | Cons |
|---|---|
| <ul><li>Reset and upload would agree fully.</li></ul> | <ul><li>Not verified on base. It looks like reset's general handling of intermediate rows, not this branch's bug.</li><li>Changes reset output further, beyond the sample fixes.</li></ul> |

### Not needed: legacy upload routes

Only `api2/repositories.py` calls `upload_tar_and_set_metadata`. The legacy upload controllers are gone, so there is nothing else to wire.

### Expand (not recommended, unchanged from the first pass): `content_alerts`, TS2 UI, real-upload warn/refuse, `numeric_revision`, clients

None of these has new evidence:
- **`content_alerts`:** moderation-only.
- **TS2 UI:** no upload flow exists to extend.
- **Warning on or refusing same-version overwrites:** changes upload semantics; the issue defers it.
- **`numeric_revision` backfill:** a lazy fill of a derived column.
- **planemo / bioblend:** separate repositories. planemo#1752 and #1525 have no new discussion, and #24441 has no comments.

| Pros | Cons |
|---|---|
| <ul><li>Each is small or user-visible.</li></ul> | <ul><li>Out of the issue's agreed scope, or in other repositories.</li></ul> |

### Contract: revert to `_alt_original_scope`

Ship the alt (`6a0913cf62a`). That drops reset-mode isolation (back to a dry-run-only `isolate_files_dir` flag) and the `installable` field.

| Pros | Cons |
|---|---|
| <ul><li>The feature PR stops changing admin `reset_metadata` output.</li></ul> | <ul><li>Brings back the dead flag and leaves the three reset sample bugs.</li><li>`creates_new_installable_revision` goes back to meaning "new row", which can be uninstallable. That is expensive to change after planemo consumes the schema.</li><li>If reviewers want reset isolated, decomposition Option B gets the same effect without losing the fixes.</li></ul> |
