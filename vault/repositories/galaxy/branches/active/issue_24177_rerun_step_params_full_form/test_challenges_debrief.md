# Test challenges debrief (round 2, after re-scope)

Scope: the tests this branch adds on #24176 `ced412c6248` (3 commits). #24176's own tests and shared `mountRerun` are untouched. Round 1's settled calls ([earlier_drafts/1](earlier_drafts/1/test_challenges_debrief.md)) were reopened only where the re-scope gave a new reason.

**Summary:**
- **Moved 1 test into the Baseline commit.** The `WorkflowRun` precedence test passes on the parent's code, so it can't be a red-to-green test for commit 2. It does pin behaviour that commit 2's gating refactor (last-wins assignments → first-wins `simpleFormDisabledReason()`) has to keep. The Baseline commit is renamed to "Baseline tests: simple-form rerun gating reason and submission payload".
- **Dropped 1 unit test.** The `WorkflowRunFormSimple` "prefills workflow parameters … and resubmits them" case duplicates the new Selenium test `test_workflow_rerun_simple_form_keeps_workflow_parameters`, and it got its submitted value from a faked FormDisplay emit. Its `emitDisplayedValues` helper went with it.
- **Strengthened the baseline payload test in commit 3.** `not.toHaveProperty("replacement_dict")` now sits next to `replacement_params: {}`, so commit 3 still has a unit red-to-green for the key fix.
- **E2E tests not modified.** No E2E re-run needed.
- **Results:**
  - Baseline commit tree (parent code + baseline tests): `WorkflowRun.test.js` + `WorkflowRunFormSimple.test.ts` 10/10 green.
  - HEAD: vitest `Workflow/Run/` 82 pass (83 − 1 dropped); eslint and prettier clean on the touched test files.
  - Final diff vs. pre-challenge HEAD `944069783b1`: only `WorkflowRunFormSimple.test.ts` (−16/+1).

## Red-to-green checks (parent code, current tests)

- **`WorkflowRunFormSimple.test.ts` on the parent's `WorkflowRunFormSimple.vue`:** every case failed at its own value assertion, not at mount:
  - the 3 object-store cases: `expected undefined to be 'fast' / 'archive' / 'scratch'`
  - wp prefill: `expected undefined to be 's1'`
  - baseline, commit-3 line: `expected undefined to deeply equal {}`
- **`WorkflowRun.test.js` on the parent's `WorkflowRun.vue` + `WorkflowRunForm.vue`:**
  - #24176's "opens the expanded form …" test, with this branch's folded assertions, fails at the new `disableSimpleForm` assertion (`expected false to be true`). The parent never sets the reason or the flag for a rerun.
  - The precedence test **passed**. That is why it moved.

## Per-test decisions

### `WorkflowRun.test.js` › "keeps the workflow's own reason …" (moved to Baseline)
- Round 1 kept it on a mutation check against the old `simpleForm.value &&` guard. The re-scope removed that code, which is a new reason to look again.
- On the parent, run1's open tool steps already give `hasDisconnectedInputs`, and the parent's rerun branch sets no reason. So the test is green before commit 2.
- It still guards real logic on the new code. Mutation: hoisting the `rerunHasStepParameters` check to the top of `simpleFormDisabledReason()` made it fail (`expected 'rerunHasStepParameters' to be 'hasDisconnectedInputs'`). Reverted afterwards.
- So it is a baseline test: it pins existing precedence that the refactor has to keep. The test is unchanged, sits in the same place, and uses #24176's shared `mountRerun`.

### `WorkflowRun.test.js` › #24176's "opens the expanded form …" (folded assertions kept)
- The additive `disableSimpleForm` / `disableSimpleFormReason` assertions are the unit red-to-green for commit 2's reason. They are also the fast check for "no way back to the simple form".
- The Selenium test checks the alert text and `simple_form_link.assert_absent()`. The unit test pins the reason key and the computed flag, which is cheap insurance next to them. Round 1's call stands: keep.

### `WorkflowRunFormSimple.test.ts`
- **Object-store cases (3, kept).** Still the only coverage. Round 1 accepted the E2E gap (it would need a multi-object-store Selenium integration config). Each one is red on the parent.
- **"prefills workflow parameters … and resubmits them" (dropped).**
  - Round 1 kept the file because Selenium covered neither prefill. Since the re-scope, `test_workflow_rerun_simple_form_keeps_workflow_parameters` covers the real path end to end: request export → `WorkflowRerun` → simple form shows `moocow` → resubmit → rename applied.
  - The unit version faked FormDisplay's `onChange` (review L1 improved it, but it is still a stand-in). It asserted nothing Selenium doesn't. This is the duplicate rule, applied the way round 1 dropped the `WorkflowRunForm` test.
  - Commit 2's wp prefill now has no unit test. The baseline's negative half (`formInputValue(…, "sample")` undefined with no recorded params) stays.
- **Baseline payload case (kept, strengthened in commit 3).** It pins `history_id`, `inputs_by` and `batch`, and the absence of object-store keys. Commit 3 adds `replacement_params: {}` and `not.toHaveProperty("replacement_dict")`, which is red on commit 2.
- **Mocks (unchanged).** `vi.mock("./services")` and the composable mocks: round 1's call stands. `shallowMount` and `getLocalVue` already follow the client README.

### Selenium (`test_workflow_rerun.py`, unchanged)
- **The additions to `test_workflow_rerun_prefills_expanded_form`:**
  - The reason alert and the missing toggle are red on the parent.
  - The resubmit `num_lines == 3` check would pass on the parent, because #24176 already forces the expanded form. It is an additive end-to-end check for the issue's core claim inside a test that is red anyway. Kept.
- **`test_workflow_rerun_simple_form_keeps_workflow_parameters`:**
  - Without commit 3 it is red at the first `assert_item_name(2, "moocow suffix")`, by reasoning: the server ignores `replacement_dict`.
  - It uses the existing `UsesHistoryItemAssertions` mixin and the populator's `history_invocations`, with no new helpers.
  - There is no repeated raw HTTP that would need a populator helper.
  - It is the only E2E coverage of simple-form `${...}` renames, because every `test_replacement_parameters*` test forces the expanded form.

## Commit handling
- The fixup/autosquash route can't move an existing test earlier, so I used an interactive rebase with `edit` stops on `ced412c6248`:
  - **Commit 1:** added the precedence test and reworded the message.
  - **Commit 2:** git merged the test twice. I resolved that by taking `051e34c9a54`'s `WorkflowRun.test.js`, dropped the wp prefill case, and reworded "precedence" out of the vitest line.
  - **Commit 3:** resolved the conflict onto `944069783b1`'s file minus the dropped case and helper, then added the `replacement_dict` line.
- Not pushed. The local `backup/r24177_pre_test_challenge` was deleted after verification.
