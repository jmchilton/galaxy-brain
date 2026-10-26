# Address differential-review comments

Read the open threads for RECORD_DIRECTORY, a branch or review record. The review UI does not need to be running.

```sh
~/projects/repositories/galaxy-brain/differential-review/bin/differential-review threads \
  --record RECORD_DIRECTORY --open --json
```

Each entry includes the original snapshot and quoted code, its current placement, and replies. Read the conversation before acting. If the placement is outdated or unmapped, inspect the original excerpt and current code rather than treating its old line numbers as current.

Answer questions and implement requested changes using the agent's usual worktree and testing procedures. For a review record, put code changes on the local review branch. After code changes, commit and snapshot the resulting head with `--phase revision`. Review records need `--base`, taken from the latest snapshot's base. Snapshot the changed review branch's head, not a newly fetched PR head.

Write one response file per thread describing the result, any checks, or what still needs a decision. Then append it with:

```sh
~/projects/repositories/galaxy-brain/differential-review/bin/differential-review reply \
  --record RECORD_DIRECTORY --thread THREAD_ID --body-file RESPONSE_FILE \
  --snapshot SNAPSHOT_ID --author "Agent"
```

SNAPSHOT_ID is the `id` printed by `snapshot --json` or listed by `list --json`. Use the snapshot containing the response's code changes. Omit `--snapshot` for an answer that does not refer to a particular revision. Replies do not resolve threads or mark code reviewed. John does that in Obsidian. This handoff covers local work and replies, with no additional authorization to post or merge on GitHub.
