# Debrief: tool_shed_upload_dry_run

## Research (origin/dev, 2026-10-24)
- Every code claim in the draft checks out:
  - `upload_tar` dry run: mkdtemp clone is never removed, and `dry_run` isn't passed to `handle_directory_changes`, so email alerts would still go out.
  - `upload_tar_and_set_metadata` accepts `dry_run` and drops it, then updates and sets metadata on the real repo.
  - The api2 `create_changeset_revision` endpoint has no `dry_run` param. `DryRunQueryParam` already exists.
  - `test_upload_dry_run_*` unit tests exist.
- `set_repository_metadata` adds a new installable revision only when `new_metadata_required_for_utilities()` is true (it checks repo deps, tools, tool deps and data managers). Otherwise it moves the latest row to tip in place. File contents are never compared. TipOnly repo types always overwrite (left out of the issue).
- PRs confirmed: #15639 (Tool Shed 2.0) and #21786 (Metadata Inspector + reset_metadata dry_run), both merged. planemo#1525 is an open issue, planemo#1752 an open PR.
- No duplicate Galaxy issues found.

## Rewrite
- Reshaped into the GX_ISSUE_DESCRIPTIONS format: one-line opener, a sketch of the response JSON up front, Why, Context, Proposed Approach (details collapsed), and Alternatives (file manifest, archive download, refusing same-version overwrites).
- Moved the code walk and the plan into details. Dropped agent and vault-internal references.
- Subagent review round: fixed the dependency wording and described #1752 as a PR. Nothing egregious.

## Leftover
- Response field names are a sketch.
- Open questions from the draft are still open: whether to return the file diff or only the decision, the UI upload flow, and whether real uploads should warn on same-version overwrites.
