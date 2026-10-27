# Branch File Docs

Default conventions for files in `repositories/<repo>/branches/<status>/<branch>/`. A repository's own `branches/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other plans, questions, notes, and scripts.
## pr_description.md

Proposed PR description.

## human_review.md

One sentence saying John reviewed all commits and/or diffs of the latest differential review snapshot, naming its head SHA. Written and deleted only by the review plugins as John checks items off; agents never create or edit it. Quoted under "Human Review" when the PR is opened.

## differential-review/**

Differential review data for the branch. `snapshots/*.json` are immutable, gitignored snapshots of the branch at the end of each phase, written only by the `differential-review` CLI ([PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md)). `review-state.json` holds John's check-offs and is written only by the review plugins; agents never create, edit or delete it.

`annotations/threads/*.json` hold John's source-anchored comments and resolution. `annotations/replies/*.json` hold individual human or agent responses, optionally linked to a revision snapshot. Both are tracked. Agents append responses through the CLI following [PROCESS_DIFFERENTIAL_REVIEW_COMMENTS](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_COMMENTS.md), and leave thread resolution to John.
