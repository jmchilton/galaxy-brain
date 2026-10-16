# nightly_unit_tests: implementation debrief

Tip `de9edd2abd9` (4 commits on `dev` `36fe2ce8428`), pushed to `jmchilton/nightly_unit_tests`. Status: **READY**.

## Final shape

- **`report_scheduled_result.yaml`** (new `workflow_call`). Opens, comments on, or closes a tracking issue for a scheduled run, found by exact title plus the `github-actions[bot]` creator. Any non-success `needs` result counts as failed. Failure reports name the failed jobs. It only reports on `galaxyproject` `dev`. Called by `selenium.yaml` (weekly) and `unit.yaml` (nightly).
- **`unit.yaml`**:
  - PRs and pushes to `dev` run 3.14 only.
  - The daily schedule and manual dispatch run 3.10–3.14 and report.
  - PRs and pushes to release branches run 3.10–3.14, since they get no nightly.
  - The concurrency group includes `event_name`, so a push to `dev` doesn't cancel the nightly.
- **`writing_tests.md`**: the unit CI section is rewritten (it said CircleCI, which was stale).

## Choices

- **3.14 per-PR** (John). Saves about 8 min of wall-clock time; 3.10 is the slower job. Static coverage of too-new code was checked: ruff 0.17.0 catches syntax, and mypy on 3.10 catches stdlib attributes. Gap: an entirely new stdlib module passes mypy (`ignore_missing_imports`).
- **One workflow file, not a separate nightly file.** The matrix is picked by event, so the test steps aren't duplicated.
- **Reporter extracted now.** The #24014 debrief said to extract it when a second consumer appears; this is that consumer.
- **Tracking-issue lookup now matches title + creator, not `labels[0]`** (from the thermo-nuclear review). This changes merged #24014 behaviour: a relabelled issue is still found. Say so in the PR body.

## Evidence

- actionlint (on `./` copies) and zizmor 1.30.1 are clean.
- The off-tree [reporter harness](report_harness.mjs) passes 7 cases; mutants are caught.
- Fork push CI expanded the matrix to `Test (3.14)` only. A full green CI run on the tip has not been seen yet.
- Reviews:
  - [normal](subagents/normal_review.md): release-branch gap fixed.
  - [codex](codex_review.md): no findings.
  - [thermo-nuclear](thermo_nuclear_review.md): lookup change, matrix folding, doc wording.
  - [scope](scope_evaluation.md): keep as implemented.
- Not run end to end. Schedule and dispatch only work once the file is on `dev`. After merge, dispatch "Unit tests" on `dev` once as a smoke test.

## Watch on the upstream PR

- "Unit tests" on the fork PR must not show `startup_failure`. It would come from the write-permission `uses:` job under a fork token; unlikely, see the normal review #2.
- PR body should mention:
  - the lookup change;
  - that release branches keep the full matrix;
  - that `Test (3.10)` disappears from PR checks (`dev` has no required checks, so no branch-protection edit is needed).

## Follow-ups (not in scope)

Six workflows have a weekly schedule where a push to `dev` cancels the run: `api`, `converter_tests`, `framework_workflows`, `integration_selenium`, `performance`, `playwright`. The scope evaluation judged this harmless, because their scheduled matrix equals the push matrix.
