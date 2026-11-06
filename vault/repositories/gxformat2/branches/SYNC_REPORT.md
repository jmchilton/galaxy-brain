# Branch sync — 2026-11-06 (agent: workflow_libs)

- Merged: `color_directory_uri_inputs` (#281, 2026-10-24); `lint_input_defaults` (#275, 2026-10-23) and `lint_untyped_params` (#271, 2026-10-22), both active records with no queue entry; all moved to `merged/`. `schema_dedup` (#165, 2026-10-31) entry removed; it had no record.
- Closed: none. Moved: none. Untracked open PRs: none. Queue now empty.
- Mismatch: `schema_dedup`'s unlinked entry never appeared in the script's output; #165 was caught by reading the queue directly.
- Worktrees removed: none; the merged records' worktrees were already gone.
- Worktrees kept: `wf_state` (on merged `schema_dedup`, 131 dirty files; needs John). `abstraction_applications` (57 dirty), `doc_fixes` (3), `docs` (22), `text_input_validators` (2) and `document_github_release` (clean) have no record and weren't evaluated.
