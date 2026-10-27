# CI diagnosis — 2026-10-25

Reviewed every red check on head `7a7c7b4b11c54a5ba94d7bb54ff7c2316c5e3cf7`, both on [PR #24452](https://github.com/galaxyproject/galaxy/pull/24452) and the fork. The PR is open, not draft, mergeable, and targets `release_26.2`; no rebase needed.

| Check | Python | Diagnosis |
| --- | --- | --- |
| [PR Python linting](https://github.com/galaxyproject/galaxy/actions/runs/40220891105) | 3.10, 3.14 | Branch-caused: mypy rejects assigning `self.trans.user_is_admin = False` at line 42 of `test_library_contents_service.py`; `self.trans` is cast to `ProvidesUserContext`, whose property is read-only. |
| [PR Test Galaxy packages](https://github.com/galaxyproject/galaxy/actions/runs/40220891270) | 3.10, 3.14 | Same error in the app package's `mypy tests` stage; not a separate package test failure. |
| [Fork Python linting](https://github.com/jmchilton/galaxy/actions/runs/40220885844) | 3.10, 3.14 | Same error. |
| [Fork Test Galaxy packages](https://github.com/jmchilton/galaxy/actions/runs/40220885911) | 3.10, 3.14 | Same error. |

No unrelated red checks were present, so none needed a retry on the old SHA. Older failures described in `polish_debrief.md` belong to earlier heads.

## Fix and verification

Pushed `a73d90dc50e` (`Fix library contents test mock typing`) to `jmchilton/galaxy:selenium_upload_data_library`. Retain the concrete `MockTrans` as `self.mock_trans` and set its writable admin flag there. Service calls still use the typed `ProvidesUserContext` view. The test still switches to non-admin after library creation, exercising the same regression.

- Regression test: **1 passed** on Python 3.14.
- Focused mypy using module `unit.webapps.galaxy.services.test_library_contents_service`: reproduced the exact original read-only-property error with `--shadow-file`, then passed with the fix.
- Full `cd lib && mypy . ../test`: no errors in the changed test; 32 errors in 18 other files from the existing local environment, consistent with the earlier polish record. These are not CI failures on this head.
- Black, isort, diff whitespace checks and commit hooks (including ruff and flake8) passed.

Fresh CI confirmed: [PR lint](https://github.com/galaxyproject/galaxy/actions/runs/40225801972), [PR packages](https://github.com/galaxyproject/galaxy/actions/runs/40225801961), [fork lint](https://github.com/jmchilton/galaxy/actions/runs/40225798982), and [fork packages](https://github.com/jmchilton/galaxy/actions/runs/40225799164) are queued or running. Branch remains in `branches_ready_for_final_review` because this is a code change after the previous approval; no approval is transferred to the new SHA.

Tracking-repository validation: `make validate` reports one unrelated existing error, untracked `vault/FILL_IN_AT_RUNTIME.md` has no frontmatter (127 files checked). Left that other session's file untouched; these branch records are plain documents excluded from frontmatter validation.
