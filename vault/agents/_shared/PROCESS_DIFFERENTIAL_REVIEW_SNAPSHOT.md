# Differential review snapshot

At the end of a phase (implementation, hardening, polishing) or a later `revision` (rebase, requested changes, review response), record the branch's committed HEAD so John's review tooling can show only what changed since John last checked it off. Take it after the phase's last commit, right before writing its debrief. WORKING_DIRECTORY is the branch's worktree.

```sh
(cd WORKING_DIRECTORY && ~/projects/repositories/galaxy-brain/differential-review/bin/differential-review snapshot \
  --phase PHASE --record ~/projects/repositories/galaxy-brain/BRANCH_DIRECTORY)
```

Paste its output (the `created` or `exists` line and the summary under it) into that debrief as a fenced block. A step with no debrief skips the paste.

A snapshot never blocks the phase. If it fails:

- No base in the record's frontmatter: rerun once with `--base <base>` taken from the record's prose (e.g. `--base dev`).
- Anything else, including "not built": paste the error into the debrief and carry on. Don't build or fix the tool.

The CLI writes `BRANCH_DIRECTORY/differential-review/snapshots/` (or `REVIEW_DIRECTORY/...`, both gitignored). Never create, edit or delete files under `differential-review/` by hand. `review-state.json` and `annotations/threads/` are John's. Agents may append replies with the CLI when [addressing diff comments](PROCESS_DIFFERENTIAL_REVIEW_COMMENTS.md).

## PR reviews

At the start of each review round, snapshot the PR's own head, whatever the worktree has checked out (e.g. a `pr_<PR_NUMBER>_review_<n>` branch). WORKING_DIRECTORY is the PR's worktree; BASE is the PR's `baseRefName`.

```sh
(cd WORKING_DIRECTORY && git fetch origin BASE && git fetch origin pull/PR_NUMBER/head && \
  ~/projects/repositories/galaxy-brain/differential-review/bin/differential-review snapshot \
  --phase review --head FETCH_HEAD --base BASE --record ~/projects/repositories/galaxy-brain/REVIEW_DIRECTORY)
```

Paste nothing. If it fails, mention it in your report and carry on.
