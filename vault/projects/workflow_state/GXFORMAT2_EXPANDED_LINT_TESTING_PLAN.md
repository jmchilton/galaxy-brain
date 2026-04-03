# gxformat2 Expanded Lint Testing Plan

Add declarative YAML expectation tests for lint features that currently only have non-declarative (Python unit test) coverage. The declarative tests run in both the Python gxformat2 test suite and the TypeScript galaxy-tool-util port via synced expectations.

## Context

- Expectations live in `gxformat2/examples/expectations/lint_format2.yml` and `lint_native.yml`
- Fixtures live in `gxformat2/examples/format2/` and `gxformat2/examples/native/`
- The declarative test runner is `tests/test_interop_tests.py` using `gxformat2.testing.DeclarativeTestSuite`
- Operations `lint_format2` and `lint_native` return `{errors: [...], warnings: [...], error_count: N, warn_count: N}`
- Lint ops in Python: `ensure_format2/ensure_native` -> `LintContext` -> `lint_format2/lint_ga` -> return dict

## Status

### Completed (gxformat2 dfb558e + galaxy-tool-util 1e6c8a1)

**Step 1: Group 1+2+3 fixtures and expectations** -- DONE

All structural, validation, and report lint tests implemented in both Python and TypeScript:

| # | Check | Format | Status |
|---|-------|--------|--------|
| 1 | Missing `class` key | format2 | done |
| 2 | Missing `steps` key (format2) | format2 | done |
| 3 | Missing `steps` key (native) | native | done |
| 4 | Invalid `format-version` | native | done |
| 5 | Invalid `a_galaxy_workflow` value | native | done |
| 6 | Non-integer step key | native | done |
| 7 | Nested subworkflow missing steps (format2) | format2 | done |
| 8 | Nested subworkflow missing steps (native) | native | done |
| 9 | Output without label | native | done |
| 10 | Step errors flag | format2 | done |
| 11 | TestToolShed ref | format2 | done |
| 12 | Bad outputSource ref | format2 | done |
| 13 | Bad int default | format2 | done |
| 14 | Bad float default | format2 | done |
| 15 | Bad string default | format2 | done |
| 16 | Report clean (format2) | format2 | done |
| 17 | Report bad type (format2) | format2 | done (via validate_format2 expect_error) |
| 18 | Report clean (native) | native | done |
| 19 | Report bad type (native) | native | done (via validate_native expect_error) |

21 new fixtures created, `value_any_contains` assertion mode added, subworkflow error messages fixed.

**Step 2: Best practices operations and expectations** -- DONE

`lint_best_practices_format2` and `lint_best_practices_native` operations added to both Python and TypeScript:

| # | Check | Format | Status |
|---|-------|--------|--------|
| 20 | Clean (basic warnings) | format2 | done |
| 21 | No annotation | format2 | done |
| 22 | No creator | format2 | done |
| 23 | No license | format2 | done |
| 24 | Disconnected input | format2 | done |
| 25 | Step no label | format2 | done |
| 26 | No annotation (native) | native | done |
| 27 | No creator (native) | native | done |
| 28 | No license (native) | native | done |
| 29 | Step no label (native) | native | done |
| 30 | Bad creator identifier | native | done |
| 31 | Untyped param (full bp check) | native | done |
| 32 | Disconnected input (native) | native | done |
| 33 | Untyped PJA (native) | native | done |

### Remaining Work

### Step 3: Training lint operations (lower priority)

Training lint checks are gated on `--training-topic`. Neither the Python declarative framework nor the TS port currently support passing parameters to operations.

**Option A**: Add `lint_native_training` / `lint_format2_training` operation with a hardcoded training topic.
**Option B**: Extend the declarative test case schema to support operation parameters.

| # | Check | Proposed Test ID | Fixture | Notes |
|---|-------|------------------|---------|-------|
| 34 | Missing tags | `test_lint_native_training_no_tags` | `real-unicycler-assembly.ga` | no tags field |
| 35 | Wrong tag | `test_lint_native_training_wrong_tag` | `real-hacked-unicycler-assembly-with-tags.ga` | has "assembly" tag but test uses different topic |
| 36 | Correct tag | `test_lint_native_training_correct_tag` | `real-hacked-unicycler-assembly-with-tags.ga` | |

### Step 4: Sync to TypeScript port (for future gxformat2 changes)

After any additional gxformat2 expectations are committed:
1. Run `GXFORMAT2_ROOT=... make sync-workflow-expectations sync-workflow-fixtures` in galaxy-tool-util
2. Wire up any new operations in `declarative-normalized.test.ts`
3. Implement any new lint functions in `packages/schema/src/workflow/lint.ts`

## Known Divergences (Python vs TypeScript)

- **Training lint**: Not ported to TS (GTN-specific, requires `training_topic` parameter)
- **`lint_pydantic_validation`**: Not ported; TS uses separate `validate_format2_strict` operations
- **`validate_galaxy_markdown`**: Report markdown Galaxy directive validation not ported
- **`re.match` vs `.test()`**: Python's untyped param regex uses `re.match` (start of string), TS uses `.test()` (anywhere) -- TS is arguably more correct
- **Best practices error handling**: Python's `_try_build_nf2` emits structured lint errors on model build failure; TS silently returns empty results (structural lint ops catch these separately)
- **YAML parser divergence**: `test_unlinted_best_practices_rejected_format2` skipped in TS due to null key handling difference

## Unresolved Questions

- Training checks: worth the effort for declarative tests or leave as Python-only?
- Galaxy markdown validation (`validate_galaxy_markdown`): separate effort?
