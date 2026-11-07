Shelved 2026-11-07, from the session that ran the initial review of #24745. John filed the root cause as galaxy#24787 and asked to shelve the review on it.

State:

- Review: complete on PR head `5fad7684e37`, unposted. One P1, three P2s, six P3s in `verified_review.md`; response drafted in `initial_review_response.md`.
- Review branch: `pr_24745_review_0` at `e65a882b95c` on John's fork `jmchilton`, not pushed into the PR. Fixes all but P3 5. Worktree `~/projects/worktrees/galaxy/pr/24745` is on it and clean.
- Red test branch: `metadata_source_extended_shared_uuid` at `4e7f6afd6ba` on `jmchilton`, one commit on `a1ade917000` (`dev`). Under `extended`, 5 tests fail; `directory` passes all. Covers `bam_index` on a discovered `list`, SQLite and disk store only.
- Last Postgres run of `test_scripts_pgcleanup.py` on the review branch was at `d1e589b0560`, before the final commit.

Open questions for John:

- Keep P1 1 as P1? The coordinator leans yes: with identical data, the PR empties a good index. Demoting means renumbering findings.
- Keep the P2 2 fix? It extends the `copy_from` pgcleanup hazard (a job-cache hit shares a row; removal reproduced with `purge_deleted_hdas`) to two more actions, inferred rather than run. The uuid guard doesn't catch it, #24787 may not cover it, and P2 2's own section doesn't warn. The coordinator leans towards holding the fix or adding that warning.
- `store_by: id` under `extended` gives a BAM no index while the dataset ends `ok`; noted in the issue, no test.

Also unraised: `delete_library_datasets` ignores `--object-store-id` (from reading only).
