# Implementation debrief

Branch `issue-735-data-table-staging`, based on `origin/main` at `618853f0`.

## Done

Recipe in `planemo-workflow-test-architecture`, staging step and eval in `find-test-data`, scalar handling and a row check in `implement-galaxy-workflow-test`, no-flag rule in `workflow-brief-to-galaxy-test-plan`, link from `iwc-test-data-conventions`.

## Red to green

No code to test, so the red is the behavior the Molds prescribe, in `probe/`. `disc.py` calls planemo's discovery and `run.sh` runs both layouts (planemo 0.75.47, Galaxy `release_26.1`, Python 3.11 venv, `--no_dependency_resolution`).

- Unsuffixed: discovery returned `None`. `planemo test` exit 1, `job rejected while preparing: Parameter 'index': requires a value, but no legal values defined`.
- `.xml.test`: discovery returned the path. `planemo test` exit 0, and the job read `test-data/mini.fa` from the staged `.loc`.

This closes the funcscan open requirement `staged-data-table-dbs-visible-to-shed-tools` for the no-container case.

## Decisions

- Landed separately from #733, which is open and conflicting. John's triage question on bundling had no answer, and the two are independent.
- Dropped a `staged-data-table` artifact declaration: run tooling scans depth one, and local `test-data/` layouts aren't declared artifacts today.
- Left the `test-data-refs` schema alone. The ledger's `data_table` block is a possible follow-up.
- Thermo-nuclear review skipped: no implementation or test code, no plumbing.

## Local gate

`make check` steps pass except `check-vendored`, which fails on upstream checkout drift for files this branch doesn't touch. A full `make test` passed on the final tree. One earlier run timed out 4 unrelated tests at load average ~9, and those files passed alone (127/127).

`check:planemo-cli` not run: no CLI pages changed.

## Environment

`~/.planemo/gx_venv_3_release_26.1` is Python 3.9 and can't install Galaxy. Pass `--galaxy_python_version 3.11` on this machine. Left untouched.
