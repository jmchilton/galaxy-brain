# Test challenges debrief — PR #24538

Reviewed commit: `4d4f6232533c`. Review mode (REVIEW_DIRECTORY); PR not edited.

## Tests in the PR

One new unit test, `test_hdca_dbkeys_and_extensions_view_keeps_summary` in `test/unit/data/model/db/test_misc.py`.

| Challenge | Result |
|---|---|
| Tests implementation directly? | No. Calls the public `to_dict(view="dbkeysandextensions")` twice and reads the public summary property; asserts outcomes, not internals. |
| Silly / trivial? | No. It pins the exact regression (second call returned `?`/`auto`). |
| Covered by API/integration/E2E? | No. No API test hits `GET /api/dataset_collections/{id}/attributes` at all. |
| Could move to API layer? | No. The endpoint builds the view once per request on a fresh HDCA, so the cache-mutation bug is not observable over HTTP. Model-level DB unit test is the right layer. |
| Mocks / SimpleNamespace? | None; uses existing `make_hda`/`make_dataset_collection`/`make_hdca` DB fixtures, matching the sibling `test_dataset_dbkeys_and_extensions_summary`. |
| Restructure for testability? | Not needed for a 2-line fix. |
| E2E needed? | No; no user-visible failure. |

## Red-to-green

Ran with `PYTHONPATH=lib` from the PR worktree (borrowed venv):

- PR head: `2 passed` (`-k dbkeys`).
- Parent model file (`4d4f6232533c~1`) + new test: fails at `assert rval["dbkey"] == "hg19"` with `'?' == 'hg19'`.

Fails at its own assertion, not a missing fixture.

## Test plan recommendations

None required. Optional, out of scope: the `/attributes` endpoint has no API test (pre-existing gap); an API test would not catch this bug, so it isn't a finding for this PR.
