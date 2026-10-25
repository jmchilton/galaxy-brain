Title: ShedVersion: detect non-XML changes in same-version tools (needs Tool Shed file access)

Follow-up to #1752 (fixes #1525).

## Problem

#1752 lets `shed_lint`'s ShedVersion check skip a tool whose version equals the latest installable revision when the Tool Shed's rendered `tool_source` matches the local rendered XML. Only the tool XML is compared. A change confined to other repository files does not force a version bump:

- wrapper scripts the command calls (`$__tool_directory__/foo.py`)
- data tables: `tool_data_table_conf.xml.sample`, `tool-data/*.loc.sample`
- `tool_dependencies.xml`, `repository_dependencies.xml`, `data_manager_conf.xml`, `datatypes_conf.xml`

Uploading such a change at the same version makes the Tool Shed rewrite the latest installable revision in place. Its "new installable revision?" decision (`new_metadata_required_for_utilities` in `lib/tool_shed/metadata/repository_metadata_manager.py`) compares tool ids/versions and dependency sets, never file contents. One `owner/repo/tool/version` then names two behaviors, and installed Galaxies only get the new one if an admin applies the revision update.

## Why planemo can't check this today

What the main Tool Shed exposes for a published changeset:

- `GET /api/tools/{owner~repo~tool}/versions/{version}/tool_source`: rendered tool XML only, built from a server-side clone.
- Repository metadata APIs: tool ids/versions, requirements, dependency metadata. No file hashes or contents.
- hgweb raw-file, archive and manifest URLs: 403.
- `/repository/download`: 404. That route was removed with the legacy controllers, which also breaks planemo's `shed_download`, `shed_diff` and `shed_update --check_diff` against the main shed. Planemo's tests miss this because `tests/shed_app.py` still serves the old route.

Only `hg clone` reaches the files, and we'd rather not depend on `hg` or full-history clones from planemo.

## Proposal

Preferred: **upload dry run**, galaxyproject/galaxy#24441. The Tool Shed upload API accepts `dry_run=true`, runs the archive checks and metadata generation against a throwaway clone, and reports whether the upload would create a new installable revision or overwrite the latest one in place, plus the files changed relative to tip. `shed_lint` (or `shed_upload --dry_run`) sends the realized tarball planemo already builds (`build_tarball`). It errors when the result is "overwrite" and files changed, listing them. The shed decides with its own logic, so planemo doesn't need to work out which files matter for which tool. The same call catches uploads the shed would reject.

Once galaxyproject/galaxy#24441 is deployed on the main and test Tool Sheds, `lint_shed_version` can rely on the dry run, falling back to today's check on sheds without it.

Alternatives, if the dry run stalls: add Tool Shed infrastructure for reading a published changeset's files, then compare in `lint_shed_version`. Either shape works:

1. **Archive.** `GET /api/repositories/{id}/revisions/{changeset}/archive` returns a tarball (`hg archive`). Planemo compares it with the realized repository it already builds for upload (`build_tarball`). The same endpoint restores `shed_download` and `shed_diff`.
2. **File list plus fetch.** `GET /api/repositories/{id}/revisions/{changeset}/files` returns `[{path, sha256, size}]` from the changeset manifest, with no clone, modeled on the existing `/revisions/{changeset}/readmes` route. Planemo hashes local files and compares. A per-file content route can be added if diffs are wanted.

Both are immutable per changeset and cacheable. Planemo can then either walk out from each tool (its `<required_files>`, `<code file>`, macros, install-time files) or diff the whole repository. The file list makes per-tool walking cheap; the archive makes whole-repo diffing and `shed_diff` simple.

## What should count as a change

The dry run makes this the Tool Shed's call. The rules below apply only to the archive and file-list alternatives.

The same-version tool is unchanged only if its rendered XML matches and none of these differ:

- **Per tool:** the files matched by its `<required_files>` (galaxy-tool-util `RequiredFiles.find_required_files`, the declaration Pulsar uses to stage tool files) plus any `<code file>`. If the tool declares none, every repository file outside the categories below.
- **Every tool in the repository:** install-time files (`tool-data/**`, `*.loc.sample`, `tool_data_table_conf.xml.sample`, dependency, data manager and datatypes XML).
- **Never:** tool XMLs and `<macros>` XMLs (already covered by the rendered-XML comparison, which keeps a macro change scoped to the tools it affects), `test-data/**`, README/LICENSE/CHANGELOG, and dotfiles. planemo-ci-action touches `.lint_skip` in every IUC repository, so dotfiles must be ignored or every IUC tool would look changed.

When the files can't be fetched, the lint should keep the error and say why. If #1752 merges with a guard that only skips tools having no such files, this work relaxes that guard rather than adding a new one. Fetch the published repository once per repository, not per tool. The error should name what changed (`tool XML`, `run_lastz_tarball.py`, `files unavailable`).

## Tests

Through `shed_lint`, with a mocked Tool Shed (the `responses` tests from #1752), fixtures under `tests/data/repos/`, and these cases:

- unchanged repository: skip
- tool XML change
- macro change used by one sibling
- wrapper script change, with and without `<required_files>` scoping
- `.loc.sample` / data table change
- dependency XML change
- test-data-only change
- fetch failure

For the dry run, mock its response: "overwrite" with changed files → error naming them; "new installable revision" → pass; no changes → pass; dry run unsupported → fall back to the current check. The Galaxy-side tests are part of galaxyproject/galaxy#24441.

## Open questions

- Use the dry run in `shed_lint`, `shed_upload --dry_run`, or both?
- Are the archive or file-list alternatives still worth it once the dry run lands? An archive endpoint would still fix `shed_download`/`shed_diff`.
- Should test-data-only changes require a bump? (Proposed: no.)
- Data tables: count for every tool in the repository, or only for tools that reference them?
- Help images (`static/images/**`): ignore or count?
