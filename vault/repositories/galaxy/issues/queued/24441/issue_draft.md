# Finish the Tool Shed upload dry run: report whether an upload would create a new installable revision

Agent-to-agent draft. Feature request from John (2026-10-24), from the planemo#1752 review. Research the code on `dev` before filing. John started this in 2022 (`698d58eed49`, "WIP: Implement dry_run in upload API.", merged with #15639 ToolShed 2.0) and never finished it.

## Goal

`POST /api/repositories/{encoded_repository_id}/changeset_revision?dry_run=true` runs the whole upload path, archive checks plus metadata generation, against a throwaway clone. It persists nothing, sends no email, and returns what *would* happen:

- whether the upload is accepted, with the same error messages as a real upload
- whether it would **create a new installable revision** or **overwrite the latest installable revision in place**, and which revision that is
- per-tool metadata before/after: tool ids and versions added, removed or unchanged
- files added, removed or modified relative to tip, so a client can explain an overwrite
- whether there are no changes at all (a real upload raises `MalformedContents("No changes to repository.")`)

## Why (planemo context)

- planemo#1525: `shed_lint`'s ShedVersion check errors on every tool whose version equals the latest installable revision's. In multi-tool repositories (IUC style), editing one tool forces version bumps on all its unchanged siblings.
- planemo#1752 (richard-burhans) fixes this by fetching `/api/tools/{owner~repo~tool}/versions/{v}/tool_source` and skipping tools whose rendered XML matches. Review finding (verified): only the tool XML is compared. A change confined to a wrapper script, `tool-data/*.loc.sample`, `tool_data_table_conf.xml.sample`, `tool_dependencies.xml`/`repository_dependencies.xml` etc. passes the lint at the same version.
- The harm is on the shed side. `RepositoryMetadataManager.set_repository_metadata` creates a new installable revision only when `new_metadata_required_for_utilities()` is true. That covers tool id/version changes, dependency sets that aren't subsets, and data manager inequality; it never looks at file contents. Otherwise it rewrites the latest `RepositoryMetadata` row in place (`changeset_revision = tip`). One `owner/repo/tool/version` then names two behaviors, and installed Galaxies only change if an admin applies the revision update.
- Today planemo can't check file-level changes. The main shed (26.1.2.dev0, probed 2026-10-24) serves rendered tool XML and metadata without file hashes. hgweb raw/archive/manifest URLs return 403. `/repository/download` returns 404 (removed with the legacy controllers, galaxy `8fc135eb2e8`; this also breaks planemo `shed_download`/`shed_diff`). Only `hg clone` reaches the files, and we want to avoid that.
- Alternatives considered for the planemo follow-up: a changeset archive endpoint, or a per-changeset `{path, sha256, size}` file list. Both make planemo reimplement "which files matter for which tool". A dry run is better: the shed answers with **its own** logic, so planemo doesn't guess. `shed_lint` (or `shed_upload --dry_run`) uploads the realized tarball, which planemo already builds via `build_tarball`, with `dry_run=true`. If the result is "would overwrite installable revision X" and files changed, it errors and lists them. The same call also catches upload failures before CI tries the real upload. ShedVersion could then mostly reduce to "ask the shed".
- Planemo-side records: review at `vault/repositories/planemo/reviews/active/1752/` (`verified_review.md` P2 1, `tool_change_abstraction_plan.md`, `followup_shed_version_issue.md`, the planemo follow-up issue draft, which should name this as the preferred option).

## Current state on `dev`

- `lib/tool_shed/util/repository_content_util.py::upload_tar(..., dry_run=False)`: if `dry_run`, clones `repo_dir` into `tempfile.mkdtemp()` and extracts/commits there. Archive checks (`check_archive`, invalid/undesirable paths) run in both modes.
- `lib/tool_shed/util/commit_util.py::handle_directory_changes(..., repo_path=None, dry_run=False)`: skips `handle_email_alerts` when `dry_run`. **Bug:** `upload_tar` passes `repo_path=full_path` but not `dry_run`, so a dry run would still send alerts.
- **Leak:** the temp clone is never removed.
- `lib/tool_shed/managers/repositories.py::upload_tar_and_set_metadata(..., dry_run=False)`: accepts `dry_run` and **drops it**, calling `upload_tar` without it, then `hg_util.update_repository(repo_dir)` and `rmm.set_repository_metadata(...)` on the real repo. Not safe to wire up as is.
- `lib/tool_shed/webapp/api2/repositories.py::create_changeset_revision` (`/api/repositories/{id}/changeset_revision`): no `dry_run` param. `RepositoryUpdateRequest` in `lib/tool_shed_client/schema` has no field for it.
- Tests: `test/unit/tool_shed/test_repository_utils.py::test_upload_dry_run_ok` / `test_upload_dry_run_failed` cover `upload_tar` only (tip unchanged; symlink tar rejected).
- Reusable prior art: #21786 (Metadata Inspector + enhanced reset_metadata) added `dry_run`/`verbose` to `reset_metadata_on_repository`. It has in-memory `RepositoryMetadata` objects that aren't persisted, before/after snapshots (`managers/repositories.py` around lines 470–620), and `RepositoryMetadataManager(...).reset_all_metadata_on_repository_in_tool_shed(repository_clone_url=..., dry_run=...)` / `create_or_update_repository_metadata(..., dry_run=...)`. The upload dry run should reuse this rather than add a parallel mechanism. `DryRunQueryParam` already exists in api2.

## Plan

1. **Fix `upload_tar` dry run.** Thread `dry_run` into `handle_directory_changes`. Make the temp clone a context-managed directory that's cleaned up after the caller is done (the metadata step needs it, so ownership probably moves up to `upload_tar_and_set_metadata`). Return the clone path or a small result object instead of the 6-tuple if that's cleaner. `ChangeResponseT` is used widely, so check callers.
2. **Dry-run metadata.** In `upload_tar_and_set_metadata`, when `dry_run`:
   - skip `hg_util.update_repository(repo_dir)`
   - compute the would-be metadata for the new tip from the temp clone
   - compare with the current latest installable revision using the same `new_metadata_required_for_utilities()` decision, without persisting
   - Likely needs `set_repository_metadata` split into "compute decision + metadata" and "persist", or a `dry_run` flag following the reset_metadata pattern. `RepositoryMetadataManager` must be pointed at the temp clone (reset_metadata's `repository_clone_url` param is the precedent). Check that `generate_metadata_for_changeset_revision` works on a clone path, including the tool data table / `.sample` side effects that touch app state (`tool_data_table_conf.xml.sample` handling in `handle_directory_changes`).
3. **Response model** in `tool_shed_client/schema`, e.g. `RepositoryUpdateDryRun`:
   - `ok`, `message`
   - `no_changes: bool`
   - `creates_new_installable_revision: bool`
   - `overwrites_changeset_revision: str | None`
   - `tools: list[{id, old_version, new_version, status}]`
   - `files: {added, removed, modified}` (path lists, from `hg status` between tip and the temp commit)
   - `content_alerts` (the `content_alert_str` already computed)
   - Reuse #21786's snapshot shapes where they fit.
4. **API.** Add `dry_run: bool = DryRunQueryParam` to `create_changeset_revision`, with the same permission check as a real upload (`can_update_repo`). Return the dry-run model when set; keep the existing `RepositoryUpdate` otherwise. Legacy `api/repositories` upload: skip unless trivial.
5. **Client.** Add `dry_run` to the tool shed populator/client used in tests (`lib/tool_shed/test/base/populators.py`) so planemo or bioblend can follow.
6. Planemo/bioblend consumption is a separate planemo issue (`shed_lint`/`shed_upload --dry_run`). Not part of this Galaxy work.

## Tests (red-to-green)

- Unit (`test/unit/tool_shed/test_repository_utils.py`, extend existing): dry run sends no email alerts (patch `handle_email_alerts`); the temp clone is removed; the real repo tip and working dir are unchanged.
- Unit (`test/unit/tool_shed/test_repository_metadata_manager.py` style): the dry-run metadata decision on fixtures:
  - same tool version + changed script → overwrite
  - bumped version → new installable revision
  - new tool id → new revision
  - changed `tool_dependencies.xml` that isn't a subset → new revision
  - no changes → `no_changes`
  - DB `RepositoryMetadata` rows unchanged afterwards
- API functional (`lib/tool_shed/test/functional/test_shed_repositories.py`, next to the reset_metadata dry_run tests): upload v1, then dry-run uploads of (a) the same tarball, (b) the same version with a modified non-XML file, (c) a bumped version, (d) a tar with a symlink. Assert response fields, and that tip, metadata and installable revisions are unchanged. Use the `galaxy-toolshed-tests` skill to run them, one at a time.
- Reuse tarballs under `test/unit/tool_shed/` / `lib/tool_shed/test/test_data/` (e.g. `column_maker/column_maker.tar`, `safetar_with_symlink.tar`) before adding new fixtures.

## Open questions

- Should the dry run return the file-level diff, or only the metadata decision? (Planemo wants files to explain an overwrite.)
- Should "overwrite with changed files at the same tool version" become a shed-side warning or refusal on real uploads too? Out of scope here; worth a separate discussion.
- Should the dry run also be exposed in the Tool Shed 2.0 UI upload flow?
- Target `dev`. A metadata refactor is too big for a release branch.
