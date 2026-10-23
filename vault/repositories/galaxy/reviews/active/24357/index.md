# galaxy#24357 — [25.1] Store comment_lines metadata as an integer

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24357) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24357_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24357_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `81bcc6eac6b` complete 2026-10-22, not delivered: no P1/P2; two P3s (reject bool/non-integral float in `IntParameter.marshal`; `_browser_session` test helper) fixed on fork branch `pr_24357_review_0` (`ea18258b648`), not pushed into PR. Four items filtered (mostly explicit PR-description decisions). Response drafted; awaiting John's pick in [response action](initial_response_action.md).

Open, ready for review, against `release_25.1`. Author @davelopez. Tabular `comment_lines` metadata (6 files, +100/-7). Worktree `~/projects/worktrees/galaxy/pr/24357` (on `pr_24357_review_0`; no `.venv` — tests ran via `~/projects/worktrees/galaxy/branch/issue_24264_library_metadata_file_name_25.1/.venv`). `initial_review.md` header says low effort; it ran at medium.
