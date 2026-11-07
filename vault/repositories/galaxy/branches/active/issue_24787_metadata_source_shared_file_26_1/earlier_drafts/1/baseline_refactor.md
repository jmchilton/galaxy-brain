Run via Opus 5.5 at medium effort.

One refactor commit now precedes the fix: `52f07e6f188` resolves `make_copy`'s target ahead of its new-MetadataFile branch, and the fix on top of it only adds.

## New history

The final tree is byte-identical to the old tip `48a69409aaa` (tree `c5fd96ee56f`).

| Commit | Subject | Change from the old history |
|---|---|---|
| `5fb51d0c180` | Baseline tests for metadata files of discovered metadata_source outputs | Unchanged, still first |
| `52f07e6f188` | Resolve the target first in FileParameter.make_copy | New |
| `f4c24536c96` | Give discovered metadata_source outputs their own metadata files | Was `1d2d4303750`, with `b249ca0caff` absorbed |
| `b0de86460d8` | Use ConfiguresObjectStores in metadata_source integration test | Was `48a69409aaa`, content unchanged |

## The refactor

`make_copy` now reads `target_context.parent` once, right after wrapping the value, with its `None` check moved up too. `target_dataset` reads from `target`. Nothing else in the method changes.

This is the only behaviour difference on the base: an id-less value with no parent used to return the value and now returns `None`. That case can't be reached. `make_dict_copy` is the only caller, and it evaluates `self.spec[key]`, which reads `self.parent.datatype`, immediately before the call, so a missing parent raises first. I read this in the code and did not exercise it.

## What this does to the fix

`b249ca0caff` existed mostly to make these moves after the fact, so it no longer has a commit of its own. The fix now arrives with `_shares_dataset` in its final form, and `_belongs_to_other_dataset` no longer appears in the history. Against `metadata.py`, the fix commit adds only the new branch and the helper, and re-indents the existing "Just use it" lines under it.

## Left alone

- **`_shares_dataset` on the base.** It would have no caller until the fix, and it is the fix's logic.
- **`b0de86460d8`.** It cleans up test code this branch adds, so it can't go on the base. It could be folded into the baseline and fix commits, which is outside this process and would change the baseline commit's SHA.
- **`make_copy`'s remaining issues.** The thermo-nuclear review's "Noted, not done" list stands.

## Test results

| Commit | Run | Result |
|---|---|---|
| `52f07e6f188` | `test_model_store.py`, `test_metadata.py` | 60 passed, 1 xfailed |
| `52f07e6f188` | `test_metadata_source_metadata_files.py` (the 2 baseline directory-strategy tests) | 2 passed |
| `f4c24536c96` | `test_metadata_source_metadata_files.py` | 6 passed |
| `b0de86460d8` | `test_model_store.py`, `test_metadata.py` | 60 passed, 1 xfailed |
| `b0de86460d8` | `test_metadata_source_metadata_files.py` | 6 passed |
| `b0de86460d8` | ruff, black, isort on the changed Python files | clean |

I didn't re-run mypy or the review's mutations, because the final tree is identical to the one they ran against. The refactor commit's own tree was only tested, not linted or type-checked.

## Notes for the coordinator

- `jmchilton/issue_24787_metadata_source_shared_file_26_1` is at `70790a281ceb`, which is not an ancestor of the old or new tip, so the push needs `--force-with-lease`.
- The local branch `issue_24787_pre_baseline_refactor_backup` holds the old tip. Delete it once the new history is accepted.
- `thermo_nuclear_review.md` and `test_challenges_debrief.md` cite the old SHAs `1d2d4303750`, `b249ca0caff` and `48a69409aaa`. They remain readable through the backup branch, but aren't on the working branch any more.
