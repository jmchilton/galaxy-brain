# PR #219 CI follow-up — 2026-10-11

Resolved the reported CI failure and pushed [7b52756](https://github.com/galaxyproject/gxformat2/commit/7b52756eb9ec3501988c5e7d07b5383adaec0dae) to the existing `model_record_fields_214` branch. No merge or public review/comment was performed.

## Failure and cause

[Python CI run 38153816346](https://github.com/galaxyproject/gxformat2/actions/runs/38153816346) at `025bc24` failed on Python 3.10 because Ruff **0.17.0** reported three `TRY004` errors in `_semantic_validators.py`: it recommends `TypeError` for nonmapping input, nonlist column restrictions/suggestions, and nonstring collection type. The previous local verification used Ruff 0.15.15 and did not detect these findings.

The failing job's unit suite passed (**881 passed, 8 skipped**) and mypy passed (97 source files). Other Python matrix jobs were cancelled by fail-fast; package build, Java, docs, in-repo TypeScript, and Codecov succeeded.

## Fix and validation

These semantic validators intentionally raise `ValueError`: Pydantic wraps it as a validation error, and draft validation catches it to collect diagnostics. Switching to `TypeError` would break that behavior. The fix adds three line-specific `noqa: TRY004` annotations and documents the exception contract. Runtime behavior and tests are unchanged; no rule is disabled globally.

- Reproduced the three findings with Ruff 0.17.0 before editing; full `ruff check` passes after the fix.
- Exact CI lint versions all pass: Ruff 0.17.0, Black 26.10.1 (99 files unchanged), flake8 7.4.1 with flake8-bugbear 26.9.30.
- Full Python suite with IWC enabled: **1,857 passed** in 15.92 seconds.
- Local mypy: no issues in 97 source files.
- [Independent review](ci-review.md): no findings, executable AST unchanged, seven existing regression reproductions pass.

## Delivery status

Published head: `7b52756eb9ec3501988c5e7d07b5383adaec0dae`. New [Python CI run 38158508290](https://github.com/galaxyproject/gxformat2/actions/runs/38158508290) and other required workflows are queued at the final check. Await their results before merging. Companion TypeScript #190 still has its original checks queued; this fix needs no TypeScript change.
