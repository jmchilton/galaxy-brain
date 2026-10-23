# galaxy#24395 — [26.1] Fix tests always selecting the first select value

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24395) · [default review](initial_review.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24395_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24395_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `b95cd79f9bb` complete 2026-10-23; delivered 2026-10-23 (comment https://github.com/galaxyproject/galaxy/pull/24395#issuecomment-6368539585; review branch fast-forward pushed to PR head `fix-test-select`, now `a117a7b1a31`). One P1 (selected branch uses option label, not value — PR head now errors with `TypeError` for labelled defaults; CI red on `test_legacy_features_fail_validation_with_24_2`), one P2 (no regression test), two P3s. Review branch `pr_24395_review_0` (`a117a7b1a31`, three commits fixing P1/P2/P3 1) pushed to jmchilton fork and into PR.

Open, ready for review, against `release_26.1`. Author @bernt-matthias. One-line fix (+1/-0) adding `break` to the selected-option loop in `_matching_case_for_value` (`lib/galaxy/tool_util/verify/parse.py`). Worktree `~/projects/worktrees/galaxy/pr/24395` (on `pr_24395_review_0`; no `.venv` — tests ran via main clone `.venv` with worktree `lib` on `PYTHONPATH`).

## History

- Missing `break` is not a regression: introduced 2013 (`48b7a50eb20`, `lib/galaxy/tools/test.py`), copied verbatim into `verify/parse.py` by `90c6dcc590d` (2024, first in v24.2.0).
- The `for…else` already is the nothing-selected → first-option fallback; before the fix it always ran.
