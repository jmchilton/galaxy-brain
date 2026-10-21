# Implementation debrief

STATUS: READY (needs CI)

Custom build PUT (`len|type=fasta`) now maps `NoConverterException` to a 400 `RequestParameterInvalidException` naming the conversion, where it used to wrap every exception in a 500 "Failed to convert dataset.". Other errors are no longer wrapped. Base `release_26.0`, head `96113857dae` (fix + test hardening).

Hardening:
- Test challenge ([test_challenges_debrief.md](test_challenges_debrief.md)): API test now pins error code `400008` and the converter message. Green with the fix, red (500) without it.
- Codex review ([codex_review.md](codex_review.md)): no findings. `ConverterDependencyException` stays a 500, matching `services/datasets.py`.
- Baseline refactor ([baseline_refactor.md](baseline_refactor.md)): none. The fix is too small, and a shared helper with `datasets.py` was rejected because the two callers build different errors.
- Scope evaluation ([scope_evaluation.md](scope_evaluation.md)): recommended a retarget to `release_25.1` / folding into #24310. John chose to keep `release_26.0`. The eval found the 25.1 sibling (#24310) merges forward cleanly over this branch.
- Skipped: E2E polish (no E2E tests), thermo-nuclear review (under 50 lines, not plumbing), screenshots (no client changes; `CustomBuilds.vue` already shows `err_msg`).

Not covered: if only `len_to_linecount` is missing, an orphan `fasta → len` job is queued before the 400 is raised. Stock datatypes ship both converters.
