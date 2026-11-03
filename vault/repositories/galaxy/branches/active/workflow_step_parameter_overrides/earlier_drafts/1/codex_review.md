Run via gpt-6.1-sol.

Codex (CLI 0.165.0) reported the model but no reasoning effort: its header reads `reasoning effort: none`. `~/.codex/config.toml` sets neither, so both are the CLI defaults.

Codex reviewed `46db8f9d5b6..HEAD` and returned 3 findings. I fixed two:

- The P2 nested-conditional default bug, in API commit 1. The extraction branch was re-synced.
- The P1 link overrides dropped by the expanded form, in client commit 4.

I didn't act on the third, P2 "speculative", finding because its failure path doesn't hold. Nothing was security-sensitive.

**Codex couldn't use a shell here.** Its read-only sandbox needs bubblewrap, and bubblewrap can't set up a network namespace inside this session's sandbox (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`). The first run returned no findings for that reason. The second run got the material on stdin instead:

- the `lib/galaxy` diff with whole changed functions (`git diff -W`);
- the client diff with 15 lines of context;
- the test diff;
- all of `run_request.py`;
- the injector and runtime-state parts of `modules.py` and `run.py`.

Its brief was `api_design.md` plus the Commits and Decisions sections of `initial_implementation_debrief.md`. Known gaps, test results and review history were left out, so the review stayed independent. As a result, Codex didn't see unchanged code outside those excerpts.

## Fixed

- **Switching a conditional's case overwrote a nested conditional's case selected by `parameters`** (P2, confirmed). This was in `_ToolStateWalker._fill_defaults` (`lib/galaxy/workflow/step_parameter_overrides.py`).
  - When an override switched a case, a nested conditional with no test value in the override got its default test value. This ignored `pending`, the flat `parameters` values for the step, although plain leaves already checked it.
  - That default then went into `flat` and overrode the case `parameters` chose. Defaults for the wrong case filled in as well.
  - The fix: a nested conditional now takes its case from `parameters` when they set it. Only otherwise does it record the default.
  - New unit tests: `TestSwitchedConditionalCaseDefaults` in `test/unit/workflows/test_step_parameter_overrides.py`, with an inline tool that nests a conditional in one case of another. The test of the `parameters` case fails without the fix.
  - This was squashed into API commit 1.
- **A `step_parameter_overrides` link was silently ignored when the expanded form is used** (P1, confirmed in part).
  - `WorkflowRun.vue` passed the route argument only to `WorkflowRunFormSimple`. The expanded form is used whenever:
    - the simple form can't run the workflow;
    - the rerun has legacy `parameters` or overrides the simple form can't show;
    - the user clicks the link to the expanded form.
  - In those cases a link's parameters disappeared without a word. "Rerun with this changed" offers these links for any top-level job.
  - Codex's claim that the expanded form "leaves threshold at its previous value" is right for links with values. For the job-row link, the value is `null`, and the expanded form is already seeded with the original run's values. So the lost part was the pointer to the parameter, not a value.
  - I didn't apply the link values to the expanded form's nested step models. Instead, `WorkflowRunForm` now takes `stepParameterOverridesArg` and shows a warning. The warning lists each parameter the link names, by its picker label, and asks the user to set them in their steps below. If the argument doesn't parse, the warning shows the parse error.
  - There are three new tests in `WorkflowRunForm.test.ts`.
    - Their model converts `run1.json`'s index-keyed repeat caches to lists. The fixture predates list caches; the server sends lists (`populate_model.py`).
  - This was squashed into client commit 4.

## Not acted on

- **"Seed inner tool states before building subworkflow run models"** (P2, marked speculative by Codex): refuted as stated.
  - `subworkflow_steps` is read only by the simple-form picker (`buildStepParameterTree` in `stepParameterTree.ts`). The picker shows recorded values from `rerunRequest.step_parameter_overrides` as presets and in "original run:" hints, not from the run model.
  - The expanded form never reads `subworkflow_steps`. So seeding them wouldn't change Codex's scenario, a rerun that falls back to the expanded form because of a switched inner case.
- **An adjacent limitation is real, but this branch didn't introduce it.**
  - The expanded form doesn't render or submit inner subworkflow tool state. A rerun that falls back to it can't carry inner-step overrides forward.
  - This is the #24177 expanded-form behaviour for any nested step parameters. Fixing it means teaching the expanded form about subworkflow internals, which is out of scope for this pass.
  - The banner for this fallback ("...the simplified form can't show ... so they would be lost") is accurate for top-level steps only. Worth a line in the PR's known gaps.

## Commits after the fixes

| Branch | Commits (bottom to top) |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `6449de0b8ba` (API 1), `debcc68f912` (API 2), `7da7f3ddcf8` (API 3), `9afe23dfd3f`, `1480fbf9d12`, `2d9f5697752`, `454af772ec3` |
| `workflow_step_parameter_overrides_api` over `origin/dev` `38dc259318c` | `0ba5b0f391e`, `28ac4aef51a`, `18aae7ec812` |

## Checks

- Unit tests (`test/unit/workflows/test_step_parameter_overrides.py`): 3/3 pass on both branches. The new `parameters`-case test fails without the fix.
- API tests: the 11 in `test_workflow_step_parameter_overrides.py`, plus `test_jobs.py`'s `test_parameters_display` and `test_parameters_display_override_paths`.
  - On the branch, 13/13 pass. The 11 also pass alongside the 3 unit tests (14/14).
  - On the extraction branch, 13/13 pass.
  - One extraction-branch run collected the unit test file in the same pytest session as the API tests, and the two `test_jobs.py` tests failed. They pass without it, and the unit file plus `test_jobs.py` pass together on the branch (4/4).
    - The new unit test imports `galaxy.app_unittest_utils.tools_support`, which sets global model state when imported. CI runs unit and API tests in separate sessions.
- Vitest: 38 files and 242 tests pass across the run, invocation, job and editor suites in the hardening brief. That includes `WorkflowRunForm.test.ts` at 13/13.
- vue-tsc is clean. Prettier is clean. eslint reports 0 errors, and its warnings are on lines this branch doesn't change.
- ruff, black and isort are clean. mypy on `step_parameter_overrides.py` reports only the unrelated `notification.py:862` error.
- E2E was not rerun. The Python change only affects `parameters` plus overrides that switch an outer case containing a nested conditional, and the E2E tests don't send that. The new client warning renders only in the expanded form with a link argument, and no E2E test opens that combination.

<details>
<summary>Full Codex review (structured output)</summary>

```json
{
  "coverage": {
    "files_reviewed": ["lib/galaxy/managers/jobs.py", "lib/galaxy/managers/workflows.py", "lib/galaxy/schema/invocation.py", "lib/galaxy/schema/jobs.py", "lib/galaxy/schema/workflows.py", "lib/galaxy/webapps/galaxy/services/invocations.py", "lib/galaxy/workflow/run_request.py", "lib/galaxy/workflow/step_parameter_overrides.py", "lib/galaxy/workflow/modules.py", "lib/galaxy/workflow/run.py", "client/... (all changed client files)", "lib/galaxy_test/... (all changed tests)", "test/functional/tools/echo_step_parameters.xml", "test/functional/tools/sample_tool_conf.xml", "test/unit/workflows/test_step_parameter_overrides.py"],
    "notes": "Reviewed only the supplied excerpts, without shell access or test execution. Unshown implementations and dev compatibility could not be verified."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/workflow/step_parameter_overrides.py",
      "line": 263,
      "title": "Preserve pending nested conditional selectors when filling defaults",
      "detail": "_fill_defaults checks self.pending for ordinary leaves, but unconditionally inserts a nested conditional's default test value when it is absent from the override object. That inserted selector subsequently enters self.flat and overwrites the selector supplied through legacy parameters, violating the rule that only explicitly overridden parameters replace parameters.",
      "failure_scenario": "An outer conditional switches from A to B. B contains an inner conditional defaulting to x, with cases x and y both containing p. Send parameters selecting inner y and p=7, and step_parameter_overrides selecting only outer B. Default filling inserts inner=x, so the merged request runs inner x with p=7 instead of preserving inner y.",
      "confidence": "certain"
    },
    {
      "severity": "P1",
      "category": "correctness",
      "file": "client/src/components/Workflow/Run/WorkflowRun.vue",
      "line": 280,
      "title": "Apply route overrides when the rerun requires the expanded form",
      "detail": "stepParameterOverridesArg is passed exclusively to WorkflowRunFormSimple. simpleFormDisabledReason forces every invocation retaining legacy parameters into WorkflowRunForm, which receives neither the argument nor any translated overrides. Consequently the new job-row rerun link cannot apply its requested parameter selection or preset for expanded-form runs.",
      "failure_scenario": "Run a workflow with legacy parameters setting mode=careful. Open its rerun URL with step_parameter_overrides={\"2\":{\"threshold\":0.9}}. The legacy parameters force the expanded form, where the route override is ignored and threshold remains its previous value. The job-row link using null likewise fails to expose the selected parameter for editing.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/managers/workflows.py",
      "line": 0,
      "title": "Seed inner tool states before building subworkflow run models",
      "detail": "_workflow_to_dict_run injects subworkflows without recorded parameters, then seeds a subworkflow only through _seed_subworkflow_run_inputs. The new _subworkflow_run_steps serializes those inner tool states without applying the recorded inner parameter map. Thus the run response contains saved inner values even when the invocation ran different ones. Recorded presets compensate for selectable leaves in the simple form, but conditional selectors trigger the expanded-form fallback.",
      "failure_scenario": "Invoke the nested fixture with {\"1\":{\"1\":{\"cond\":{\"filter_type\":\"regex\",\"pattern\":\"^chr\"}}}}. Load its run model for rerunning. subworkflow_steps still describes the saved min case rather than regex/^chr. The simple form rejects the recorded selector and falls back to expanded rendering with an unseeded inner state. Whether submission loses the values also depends on the unshown expanded-form implementation.",
      "confidence": "speculative"
    }
  ]
}
```

The first run, with the repo but no working shell, returned `"findings": []` with the note: "Review blocked: every local shell command fails before execution with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted` ... The empty findings array does not indicate a clean review."

</details>
