# Codex review (hardening 3)

**Top line.** All four Codex findings are CONFIRMED. Each was fixed red-to-green in its own commit on `compare_runs` (`c51da628af0`, `7b37c68302a`, `4e223ba67bb`, `3c4ac3214cd`); none is pushed. Nothing was left unacted. Finding 4 is latent for today's callers but was fixed anyway. No security issues: all four sit in unreleased branch code.

| # | Verdict | Commit | Red test |
|---|---------|--------|----------|
| 1 `states=new` drops null-state invocations | CONFIRMED | `c51da628af0` | `test_ComparisonsManager.py::test_output_runs_new_filter_matches_unset_state` |
| 2 State chooser misses displayable states | CONFIRMED | `7b37c68302a` | `comparisonQuery.test.ts` "offers every state a row of each kind can show, once"; `comparisonUtils.test.ts` "names a later option whose text repeats…" |
| 3 Older workflow-name request overwrites heading | CONFIRMED | `4e223ba67bb` | `ComparisonView.test.ts` "names the workflow of the current URL when an older name request resolves last" |
| 4 StepRunsTab keeps step A's table/link while B loads | CONFIRMED (latent) | `3c4ac3214cd` | `StepRunsTab.test.ts` "drops the previous step's table and page link while another step loads" |

## Per finding

### 1. `new` output-run filter omits unset states — CONFIRMED
- Evidence: `lib/galaxy/managers/comparisons.py:155` filtered `WorkflowInvocation.state.in_(states)`. The same file at `:257` shows a null state as `new`. `WorkflowInvocation.state` is `Mapped[str | None]` (`model/__init__.py:9956`).
- Top-level invocations start as `NEW` (`run_request.py:588`). `create_subworkflow_invocation_for_step` (`model/__init__.py:10041`) creates subworkflow invocations with a null state. I didn't check whether the scheduler always sets one later. The verdict holds either way, because rows already show null as `new`.
- Fix: a new `invocation_state_predicate` in `comparison_queries.py`, next to `step_state_predicate`. It ORs in `state IS NULL` when `new` is asked for, which mirrors the step predicate's existing null handling.
- Red: the row and `total` were `[]` / 0. They are now 1.

### 2. State chooser omits displayable states — CONFIRMED
- Evidence: `comparisonQuery.ts:168` hand-listed 8 job states and 6 invocation states.
  - Step rows without a job show their `InvocationStepState` (`ready`, `scheduled`), via `_step_state` at `comparisons.py:489-494`.
  - Plain jobs can show any `JobState` (`waiting`, `finishing`, `failed`, `stop`…).
  - Invocations can be `requires_materialization` or `cancelling`.
  - The server predicates already filter on all of these; only the chooser was missing them.
- Fix (one source of truth): per-kind vocabularies are `Record<JobState|InvocationStepState|InvocationState, true>` objects checked with `satisfies` against the generated api-client types, so a state added or removed on the server fails vue-tsc. The kinds map as follows:
  - step_runs = InvocationStepState ∪ JobState
  - tool_runs = JobState
  - output_runs = InvocationState
- I chose the generated types over a server facet. The existing `*_available` facets are all data-derived, so a static vocabulary in every response would sit oddly beside them. This also needs no schema regen. It adds `InvocationStepState` to `client/src/api/invocations.ts`.
- **Decision to note:** `stateText` reads both `error` and `failed` as "failed". `offeredOptions` now names a later option whose text repeats an earlier one with its raw value, so the chooser shows "failed" and "failed (failed)". The existing "error reads failed" test is unchanged.
- **UX cost:** step/tool choosers now show 16–18 checkboxes over three lines at 1280px (see screenshot below). A data-derived "states present" facet would shorten the list, but it needs batch-summary SQL per kind. Not done; flag it if the list feels too long.

### 3. Workflow-name race — CONFIRMED
- Evidence: the `ComparisonView.vue:147-162` watcher awaited `getWorkflowInfo` and assigned unconditionally. The page stays mounted across URL changes.
- Red: with A resolving after B, the heading read "Workflow wfA".
- Fix: the `onCleanup` stale flag, the same pattern `useExecutionJobs` uses on this branch. The watch now uses multi-source `[workflow_id, instance]`, because the fetch reads `instance`. Multi-source avoids a refetch on every filter change.

### 4. StepRunsTab keeps the previous step's table — CONFIRMED (latent)
- Evidence: the `StepRunsTab.vue:67` prop watcher reset offset and filters but not `table`, and `pageLink` derives from `table.query`.
- Today's callers remount per step: `InvocationGraph.vue:317` keys the step card by `activeNodeId`, and `WorkflowInvocationSteps` renders one card per step. So it's latent, but the watcher exists precisely for prop reuse.
- Fix: `table.value = undefined` in that watcher, mirroring ComparisonView's identity watcher.
- Red: the table and "View all in a page" link stayed visible while step B's request was pending.

## Not acted on
- None of the findings. Open option: a data-derived state facet to shorten the chooser (see finding 2).

## Checks (at `18c102cc1c8`)
- Unit: 5 comparison unit modules, 67 passed.
- API: `test_comparisons.py`, 26 passed.
- vitest: Comparison, BreadcrumbHeading, JobParameters and `src/api`, 29 files and 319 tests passed (node 22.20.0).
- Static: vue-tsc clean; eslint and prettier clean on touched files; ruff, black and isort clean.
- mypy: only the pre-existing `no-any-return` at `comparisons.py:492/494`.
- Playwright: `test_comparisons.py` ran 3× in a row, 3/3 each time.
- Screenshot (chooser), in the session scratchpad, so ephemeral: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/e944f132-ae8d-4157-a250-d42c6e53ec99/scratchpad/shots_module3/comparisons_tool_runs_page.png`

<details><summary>Raw Codex JSON</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/managers/comparisons.py",
      "lib/galaxy/managers/comparison_queries.py",
      "lib/galaxy/managers/comparison_records.py",
      "lib/galaxy/managers/comparison_cells.py",
      "lib/galaxy/managers/comparison_columns.py",
      "lib/galaxy/managers/comparison_states.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/schema/comparisons.py",
      "lib/galaxy/webapps/galaxy/api/comparisons.py",
      "lib/galaxy/webapps/galaxy/services/comparisons.py",
      "client/src/components/Comparison/ComparisonView.vue",
      "client/src/components/Comparison/StepRunsTab.vue",
      "client/src/components/Comparison/ComparisonTable.vue",
      "client/src/components/Comparison/comparisonQuery.ts",
      "client/src/components/Comparison/useComparison.ts",
      "client/src/composables/useExecutionJobs.ts",
      "client/src/components/Markdown/Sections/Elements/handlesMappingJobs.ts",
      "client/src/components/Common/ItemPopoverLink.vue",
      "client/src/utils/download.ts"
    ],
    "notes": "Reviewed additional changed callers and surrounding code selectively. The remaining diff and most tests were not reviewed in full because of the change size. Generated schema files were excluded as requested."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparisons.py",
      "line": 155,
      "title": "The `new` output-run filter omits rows displayed as new",
      "detail": "Rows convert a null invocation state to `new` at line 257, but the SQL filter matches only stored state values. `WorkflowInvocation.state` is nullable.",
      "failure_scenario": "An invocation with a null state appears as `new` without a filter. Requesting `states=new` removes that row and lowers `total_matches`.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "client/src/components/Comparison/comparisonQuery.ts",
      "line": 168,
      "title": "The state chooser omits states that comparison rows can display",
      "detail": "Both step and tool comparisons use this short job-state list. A step without a job can display its invocation-step state `ready` or `scheduled`; jobs can also display states such as `waiting` and `finishing`. None can be selected in the chooser.",
      "failure_scenario": "A labelled step has a `ready` invocation-step row. The row is visible, but the user cannot filter the table to `ready` through the State control.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "concurrency",
      "file": "client/src/components/Comparison/ComparisonView.vue",
      "line": 155,
      "title": "An older workflow-name request can overwrite the current heading",
      "detail": "The watcher keeps the page mounted across query changes but does not discard an earlier `getWorkflowInfo` result after the workflow ID changes.",
      "failure_scenario": "Navigate from workflow A to B while A's name request is pending. If B's request resolves first and A's resolves last, the B comparison retains A's workflow name in its heading.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "client/src/components/Comparison/StepRunsTab.vue",
      "line": 67,
      "title": "Changing the embedded tab's step leaves the previous step's table and link visible",
      "detail": "The prop-change watcher resets filters but does not clear `table`. The template continues rendering it while the new request loads, and `pageLink` is built from that table's old query.",
      "failure_scenario": "Reuse the tab component for labelled step B after viewing step A, then click “View all in a page” before B finishes loading. The link opens step A's comparison.",
      "confidence": "certain"
    }
  ]
}```
</details>
