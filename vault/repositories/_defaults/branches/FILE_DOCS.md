# Branch File Docs

Default conventions for files in `repositories/<repo>/branches/<status>/<branch>/`. A repository's own `branches/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other plans, questions, notes, and scripts.
## pr_description.md

Proposed PR description.

## differential-review/**

Differential review data for the branch. `snapshots/*.json` are immutable, gitignored snapshots of the branch at the end of each phase, written only by the `differential-review` CLI ([PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md)). `review-state.json` holds John's check-offs and is written only by the review plugins; agents never create, edit or delete it.
