# Codex review — tool_form_job_count (re-harden pass)

Acted on the single finding (confirmed): a stale `batch_mismatch` preview could keep Run disabled after a conditional switch removed one of the mismatched inputs. Fixed red-to-green in `69205139b0d`. Nothing left un-acted.

Scope: `git diff origin/dev...HEAD` at `d4eeabe37dc` (after the second test-challenge and E2E-polish passes). Codex ran read-only; brief described intent only.

## Not acted on

- None.

## Details

**P1 correctness, `client/src/components/Tool/ToolForm.vue` `runBlocked` — CONFIRMED.**
Conditional test params render with `:refresh-on-change="false"` (`Form/FormInputs.vue:18`), so `ToolForm.onChange` updates `formData` without calling `onUpdate`, and `formConfig.job_expansion` stays the same. If you select a 3-element batch on a top-level input and a 2-element batch inside a conditional branch, then switch the conditional away, the request is now valid. Run still showed "Batch inputs must match…" and stayed disabled.

Fix: `ToolForm.vue` records the `formData` each build response was computed from (`jobExpansionFormData`) and resets it on a tool load. The new `jobExpansionIsCurrent` in `jobCount.ts` drops the preview once any input it lists has changed since that snapshot (JSON comparison). This is safe because `FormDisplay` emits a fresh object for each change. Once dropped, the preview hides until the next rebuild, so Run unblocks and no stale notice shows.

Test: `ToolForm.test.ts` "drops a blocking preview once a non-refreshing change edits a batched input". It failed before the fix (`expected 'true' to be undefined`) and passes after. vitest `src/components/Tool/` + `Form/utilities.test.js`: 21 files, 162 tests pass; `ToolForm.test.ts` 13/13. eslint has no errors; vue-tsc reports nothing in the touched files.

Codex coverage note: 52 Python + 72 client tests run by codex. API and Selenium tests were inspected but not run.
