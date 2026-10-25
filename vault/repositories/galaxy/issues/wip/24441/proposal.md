# Tool Shed: add `dry_run` to the upload API so clients can see whether an upload creates a new installable revision

**Title:** Tool Shed upload API: support `dry_run` that reports whether an upload would create a new installable revision

---

Let clients ask the Tool Shed what an upload *would* do, including whether it creates a new installable revision or silently overwrites the current one, without changing anything.

```
POST /api/repositories/{id}/changeset_revision?dry_run=true   (tarball attached)

{
  "ok": true,
  "no_changes": false,
  "creates_new_installable_revision": false,
  "overwrites_changeset_revision": "a1b2c3d4e5f6",
  "tools": [
    {"id": "bwa_mem", "old_version": "0.7.17", "new_version": "0.7.17", "status": "unchanged"}
  ],
  "files": {"added": [], "removed": [], "modified": ["bwa_wrapper.py"]}
}
```

*Sketch of a possible response. Field names are not final.*

This is the answer a linter needs to say "you changed `bwa_wrapper.py` but not the tool version, so this upload rewrites installable revision `a1b2c3d4e5f6` in place".

## Why

When an upload doesn't change tool ids/versions, data managers, or add repository/tool dependencies (`RepositoryMetadataManager.new_metadata_required_for_utilities()`), the shed doesn't add a new installable revision. It moves the latest `RepositoryMetadata` row to the new tip. File contents are never compared. So a change confined to a wrapper script, `tool-data/*.loc.sample`, `tool_data_table_conf.xml.sample`, etc. ships under an existing `owner/repo/tool/version`. That one name now covers two behaviors, and installed Galaxies only pick it up if an admin applies the revision update.

Clients can't check for this before uploading. The public API serves rendered tool XML and metadata but no file contents or hashes. hgweb raw/archive URLs return 403 and `/repository/download` was removed with the legacy controllers. Clients can only `hg clone` and reimplement the shed's "does this need a new revision?" logic, and they would get it wrong. The shed should answer that with its own logic.

A dry run also lets CI find rejected uploads (invalid paths, symlinks, malformed dependency XML) before trying the real upload.

## Context

Related to galaxyproject/planemo#1525: `shed_lint` makes you bump every tool in a multi-tool repository. Open PR galaxyproject/planemo#1752 relaxes this by comparing the shed's rendered tool XML. That misses changes outside the tool XML, and a dry run is the only reliable way for planemo to catch them. An extension to 🔀 #15639 (Tool Shed 2.0), which began an upload `dry_run` but never finished it. A follow-up to 🔀 #21786, which added `dry_run`/`verbose` to `reset_metadata` and provides the non-persisting metadata machinery to reuse.

<details><summary>Current state of the partial dry run on <code>dev</code></summary>

- `tool_shed/util/repository_content_util.py::upload_tar(dry_run=...)` clones the repo into `tempfile.mkdtemp()` and extracts/commits there. The clone is never removed. It doesn't pass `dry_run` to `handle_directory_changes`, so email alerts would still be sent.
- `tool_shed/managers/repositories.py::upload_tar_and_set_metadata(dry_run=...)` accepts the flag and drops it. It calls `upload_tar` without it, then runs `hg_util.update_repository` and `set_repository_metadata` on the real repository.
- `webapp/api2/repositories.py::create_changeset_revision` has no `dry_run` parameter, and `RepositoryUpdateRequest` has no field for one.
- Unit tests (`test/unit/tool_shed/test_repository_utils.py::test_upload_dry_run_*`) cover `upload_tar` only.

</details>

## Proposed Approach

Finish the existing dry run. Run the full upload path (archive checks, dependency-attribute fixups, commit, metadata generation) against a temporary clone, reusing #21786's non-persisting `RepositoryMetadataManager` path to compute the would-be metadata and apply the same `new_metadata_required_for_utilities()` decision. Return a dry-run response model from `create_changeset_revision` when `dry_run=true` (`DryRunQueryParam`, with the same `can_update_repo` permission check). Persist nothing, send no email, remove the clone.

<details><summary>Plan in detail</summary>

1. **`upload_tar`:** pass `dry_run` to `handle_directory_changes`. Make the temp clone context-managed and owned by the caller, since the metadata step needs it.
2. **Metadata:** in `upload_tar_and_set_metadata`, when `dry_run`, skip `update_repository`, point `RepositoryMetadataManager` at the clone (`repository_clone_url` precedent from reset_metadata) and compute the new-revision-vs-overwrite decision without persisting. This probably means splitting `set_repository_metadata` into "compute" and "persist". Check the `tool_data_table_conf.xml.sample` handling, which touches app state.
3. **Response model** in `tool_shed_client/schema`: `ok`, `message`, `no_changes`, `creates_new_installable_revision`, `overwrites_changeset_revision`, per-tool before/after versions, files added/removed/modified vs tip, `content_alerts`. Reuse #21786 snapshot shapes where they fit.
4. **API + populator:** `dry_run` on `create_changeset_revision` and in `lib/tool_shed/test/base/populators.py`.
5. **Tests:**
   - Unit: no alerts, clone removed, real tip unchanged.
   - Metadata decision fixtures: same version + changed script → overwrite; bumped version / new tool id / non-subset dependencies → new revision; identical → `no_changes`.
   - API functional next to the reset_metadata dry_run tests, reusing `column_maker.tar` and `safetar_with_symlink.tar`.

Planemo/bioblend consumption (`shed_lint`, `shed_upload --dry_run`) is tracked separately.

</details>

## Alternative Approaches

The shed could instead expose file contents per changeset, as an archive endpoint or a `{path, sha256, size}` manifest, and let clients diff. Then every client has to reimplement which files matter for which tool and when the shed creates a new revision, and their logic will drift from the shed's. A dry run answers with the shed's own decision and also validates the upload.

<details><summary>Alternatives In Detail</summary>

### Alternative: Per-changeset file manifest (`{path, sha256, size}`)

<details><summary>Description</summary>

#### Details

New endpoint listing files and hashes for a changeset. Planemo hashes its realized tarball and diffs.

#### Why the proposed approach is preferred

It's cheap to serve, but clients still have to guess whether the shed will create a new revision. It doesn't catch upload rejections.

</details>

### Alternative: Changeset archive download

<details><summary>Description</summary>

#### Details

Restore a download endpoint (the removed `/repository/download` also broke planemo `shed_download`/`shed_diff`).

#### Why the proposed approach is preferred

Worth doing for `shed_diff` anyway, but it has the same drawback as the manifest: clients reimplement the shed's decision. It's heavier to transfer too.

</details>

### Alternative: Refuse or warn on same-version overwrites with changed files

<details><summary>Description</summary>

#### Details

Change real uploads so the shed itself warns or rejects.

#### Why the proposed approach is preferred

That changes upload semantics and needs separate discussion. A dry run is additive, and it is the building block a warning would need anyway.

</details>

</details>
