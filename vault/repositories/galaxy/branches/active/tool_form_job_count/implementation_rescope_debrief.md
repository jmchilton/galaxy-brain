# tool_form_job_count — re-scope debrief

The [scope evaluation](earlier_drafts/2/scope_evaluation.md) recommended a modest expansion, and the branch now includes it. The pre-rescope branch is preserved as `tool_form_job_count_alt_original_scope` (`f89f6b20889`, pushed; see [alts/original_scope.md](alts/original_scope.md)).

## What changed

- **Run is disabled when the server preview says the request can't run.** The reason shows in the Run tooltip. This applies to `batch_mismatch` (the server returns 400 `InputMatchedException` or fails matching) and to remap with more than one job (400 from `_ensure_expansion_is_valid`). `runBlockedReason` in `jobCount.ts` and `runBlocked` in `ToolForm.vue` (`ebd4fd8ec97`).
- **Empty batches warn but do not block.** The first cut also blocked `job_count === 0`. The review pointed out that dev supports this: no jobs run and an empty output collection is created (`test_map_over_empty_collection`). The scope evaluation had wrongly assumed the server rejects it, so the block was removed (`d6f798bfb59`).
- **Batch input labels are now qualified** in the breakdown and mismatch text, e.g. `Advanced › Select` and `2: Query › Select`. Inputs inside a conditional stay unqualified, because the form shows no heading for them. Supporting changes:
  - `visitInputs` now passes the enclosing containers to its callback, backward-compatible.
  - New shared `repeatTitle`, also used by `FormRepeat.vue`.
  - New `findInputPathByDottedName`, which `findInputByDottedName` now uses too (`049f8c1e501`).
- **Review fix:** a failed form update now clears the job preview. Before, a stale blocking preview could keep Run disabled after the input was fixed (`728a8ee8d57`).
- **E2E:** `test_run_enabled_for_empty_batch` (`7b3ff91ff32`, reshaped in `d6f798bfb59`).

## Review

[subagents/rescope_review.md](subagents/rescope_review.md). One bug fixed, one reuse cleanup made, empty-batch recommendation adopted.

## Verification

- vitest `src/components/Tool/` + `Form/utilities.test.js`: 21 files, 162 tests pass.
- Pre-existing vitest failures in FormBoolean, FormCheck and FormOptionalText also fail at merge-base `5ff1e46b8c3`.
- `vue-tsc` clean; eslint and prettier clean on changed files.
- E2E at `d6f798bfb59`: `test_run_enabled_for_empty_batch` passes under headless Playwright and Selenium; `test_job_count_for_batched_collection` passes under Playwright.
