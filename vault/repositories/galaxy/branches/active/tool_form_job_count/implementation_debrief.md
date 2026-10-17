# tool_form_job_count — implementation debrief

**STATUS: READY.** The branch was re-hardened on 2026-10-16/17. Its scope was expanded once, and the second scope evaluation recommended keeping it as is.

- Branch: `tool_form_job_count` on `jmchilton`, head `18d4e13b4eb`, 25 commits on `origin/dev` `5ff1e46b8c3`.
- The pre-rescope version is kept as `tool_form_job_count_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- Fork CI has not been seen on this head.

## What it does

- **Server:** `/api/tools/{id}/build` gains `job_expansion` (`{job_count, reason, inputs}`), returned only when an input is batched.
  - Counts come from batch values and per-level collection element counts; no HDAs are loaded.
  - A child collection referenced more than once is counted once per reference.
  - Collection access is checked.
  - `meta.py` classification is shared by the sync, async and count paths and by dev's `validate_matched_batch_lengths`.
  - Unknown batch collection ids raise `ObjectNotFound` instead of 500 / `AttributeError`.
- **Client:**
  - "This will run N jobs." shows above Run, with a breakdown when there are several batch inputs.
  - Labels are qualified by their section or repeat block, e.g. `1: Dataset › Select`.
  - Warnings for an empty batch, a length mismatch, and a remap that would run more than one job.
  - The Run tooltip gets " - N jobs".
  - Run is disabled, with the reason in the tooltip, only when the server would reject the request: a mismatch, or a remap with more than one job. **An empty batch only warns**, because dev supports mapping over an empty collection: 0 jobs run and an empty output collection is created.
  - The preview is dropped when stale: after a failed update, or after a non-refreshing edit to a batched input such as switching a conditional branch.
  - Preview state lives in the `useJobExpansion` composable (`jobCount.ts`).

## History shape

Baseline tests come first, then the generic refactors, then the feature:

1. Two "Baseline tests" commits: meta expansion; dotted-name lookup and repeat titles.
2. The `meta.py` classifier and collection-loading refactor, then the `ObjectNotFound` fix.
3. `visitInputs` parents, `findInputPathByDottedName` and `repeatTitle`, then the `NavigatesGalaxy.tool_form_select_collection` E2E helper.
4. The feature.

Possible PR splits are listed in [scope_evaluation.md](scope_evaluation.md); none is recommended. Option A, the generic base and then the feature, is the natural candidate.

## Hardening (this pass)

- [Test challenges](test_challenges_debrief.md): added a mismatch E2E test; tightened client tests.
- [E2E polish](polish_e2e_tests_debrief.md): shared the collection-select helper; removed a sleep from an existing test.
- [Codex review](codex_review.md): fixed a stale mismatch preview after a conditional switch, red-to-green.
- [Thermo-nuclear review](thermo_nuclear_review.md): added the `useJobExpansion` composable; folded batch detection into `summarize_meta_expansion`.
- [Baseline refactor](baseline_refactor.md): history rewritten as above. The final tree equals the pre-rewrite tree plus added tests.
- [Scope evaluation](scope_evaluation.md): keep.
- [Screenshots](screenshot_debrief.md), local only: the count, empty and mismatch views. Captures showed the collection dropdown left open, so the helper now closes it. That fix was folded into the helper commit.
- Re-scope: [implementation_rescope_debrief.md](implementation_rescope_debrief.md), review in [subagents/rescope_review.md](subagents/rescope_review.md).
- Earlier passes: [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md) (original implementation), [earlier_drafts/2](earlier_drafts/2/) (first hardening pass).

Also in this session: rebased onto current dev, resolving the `permutations.py` conflict by reusing dev's `assert_matched_lengths`. Fixed the mypy nullable reds in `test_meta_expansion.py`. The codex pass-1 shared-child undercount fix is now in the history.

## Verification at final head

- **pytest:** `test_meta_expansion.py` + `test_misc.py`, 53 pass.
- **API:** `test_tools.py -k "test_build_job_expansion or test_build_request"`, 6 pass.
- **vitest:** `Tool/`, `Form/utilities`, `FormRepeat` and `Workflow/Run` all pass.
  - FormBoolean, FormCheck and FormOptionalText fail, but they also fail on dev.
  - vue-tsc reports nothing in the touched files. eslint, prettier and black are clean.
- **E2E:** all 3 job-count tests and `test_rerun_dataset_collection_element` pass under headless Playwright and Selenium after the helper fix.

## Open questions for John

- PR split: A, B, C, D or E? See [scope_evaluation.md](scope_evaluation.md).
- The empty batch stays runnable, with a warning only. OK?
- The PR text should mention the `meta.py` refactor and the 404-instead-of-500 change.
