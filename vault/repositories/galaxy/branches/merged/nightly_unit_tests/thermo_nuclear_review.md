# Thermo-nuclear review — nightly_unit_tests

No structural blockers. Changed three small things, all unstaged in the worktree:

1. The reporter's open-issue lookup no longer filters on `labels[0]`. The key is now title + `github-actions[bot]` creator. This removes the hidden rule that the first label is also the lookup key. **It changes the merged #24014 behavior:** before, relabeling an open tracking issue orphaned it and a duplicate got opened; now the issue is still found. The query is cheap: 0 open bot-created issues as of today.
2. The 240-char `unit.yaml` matrix expression is folded over several lines with `>-`. It parses to the same string apart from whitespace (checked with a YAML parse), and actionlint still type-checks it (checked with a mutant).
3. Docs:
   - "GitHub actions" is now "GitHub Actions".
   - "When a run on dev fails" is now "nightly or manual run". Push runs on `dev` never report.

The harness was updated for change 1. It now asserts the list query has no `labels` and does have `state: "open"`. The old reporter fails it.

Not changed: everything else in the details below. Each item was considered and rejected as not worth the structure.

## Details

**Bars checked:**
- No file is near 1k lines; `unit.yaml` is about 90.
- No ad-hoc branching in shared code.
- The reusable workflow is the right layer, because it needs its own job and permissions.
- Inputs reach the script through env.

**Considered, rejected:**
- **Derive failure from `listJobsForWorkflowRunAttempt` and drop the `needs` input.** This would delete `needs: ${{ toJSON(needs) }}` from every caller. Rejected for three reasons:
  - It ties the result to every job in the run, not just the declared needs.
  - It changes edge cases where a skipped need counts as a failure (build-client fails and test is skipped).
  - It would depend on the API's view of jobs that just finished being consistent.
- **Dedupe the `schedule || workflow_dispatch` condition** (in the matrix and the report `if`). `strategy` can't read `env` or job outputs, so dedupe would need a setup job. A whole job to share a two-term condition is invented structure.
  - The report gate is load-bearing. Without it, a 3.14-only push to `dev` would close a 3.10 failure issue.
- **Move the event gate into the reporter**, so both callers become `if: !cancelled()`. Rejected because it hides a unit-specific coupling, "report exactly when the full matrix ran", inside a shared workflow. Adding another full-matrix event would then mean editing the reporter.
- **Pass `needs` / `labels` as JSON arrays.** `workflow_call` inputs are only string, number or boolean, so `needs` has to be a JSON string. For `labels`, comma-separated is no worse than a JSON array.
- **Restructure the script** (fail and pass branches, two `filter(Boolean).join` bodies). It's about 60 direct lines with no clear win.

**Follow-ups (out of scope):**
- Six scheduled workflows share the push-cancels-schedule concurrency issue: `api`, `converter_tests`, `framework_workflows`, `integration_selenium`, `performance`, `playwright`. The normal review flagged it first.
- 13 workflows have `schedule:`. The ones with no failure tracking are candidates to adopt `report_scheduled_result.yaml`, which is the payoff of extracting it.

**Verification (after edits):**
- Harness: 7/7 pass.
- zizmor 1.30.1 `--offline` on the 3 workflows: no findings.
- actionlint on `./` copies: clean for `unit`, `selenium` and `report_scheduled_result`. The only notes are the existing shellcheck info notes in `build_client.yaml`.
