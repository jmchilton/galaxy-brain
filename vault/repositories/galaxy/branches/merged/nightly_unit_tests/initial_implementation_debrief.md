# nightly_unit_tests: initial implementation

Commits `c1159cce635` and `fd6bde75309` on `dev` `36fe2ce8428`.

## What

- **`.github/workflows/report_scheduled_result.yaml`** (new, `workflow_call`). It takes four inputs: `title`, `labels` (comma-separated), `description`, and `needs` (the caller's `toJSON(needs)`). If any need's result isn't `success`, the run counts as failed. The `galaxyproject` + `refs/heads/dev` gate now lives here, so every caller gets it. New: failure reports list failed job names from `listJobsForWorkflowRunAttempt`, which needs `actions: read`. Inputs go into the script through env, not `${{ }}` interpolation.
- **`selenium.yaml`**: the inline report job is replaced by a call to the reusable workflow. Same title and labels; the body is reworded slightly into description + generic lines.
- **`unit.yaml`**:
  - Adds a daily `schedule` (00:00 UTC) and `workflow_dispatch`.
  - The matrix is chosen by event: schedule/dispatch run `3.10`–`3.14`, everything else runs `3.14`.
  - The concurrency group now includes `event_name`, so a push to `dev` no longer cancels the nightly. (`playwright.yaml` still has that latent issue for its Tuesday schedule.)
  - The `report` job runs only for schedule/dispatch. Labels: `area/testing, kind/bug`; there's no `area/testing/unit` label.
- **`writing_tests.md`**: the unit CI section said CircleCI, which was stale. It now describes `unit.yaml`, the newest-Python PR run, the nightly, and the tracking issue.

## Verification

- actionlint: clean on copies using `./` paths. It doesn't understand the `$/` self-repository syntax, which already fails on `dev`'s `selenium.yaml:20`. The only other output is existing shellcheck info notes in `build_client.yaml`.
- zizmor 1.30.1: no findings.
- [report_harness.mjs](report_harness.mjs) pulls the script out of the YAML and runs 7 cases under node against mocked `github`/`context`: create with failed jobs; comment; build failure with test skipped and no jobs listed; a skipped need counts as failure; pass closes 2 of 3 issues; pass is a no-op; label parsing. Two mutants were both caught. Run with `node report_harness.mjs <path to report_scheduled_result.yaml>`.
- Not end-to-end. Schedule and dispatch can't run until the file is on the default branch. Fork push CI exercises only the 3.14-only matrix path.
