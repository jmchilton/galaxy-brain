# Test challenges debrief — gxformat2#278

- Profile: generic_test_challenger
- Model: Opus 5.5, effort medium
- Reviewed commit: a0adddbc0a025d31d1ec49dafb0975f94f5a4ade
- Worktree: `~/projects/worktrees/gxformat2/pr/278` (not modified)

## What the PR tests

No imperative unit tests added. Coverage is all declarative:

- New fixture `format2/synthetic-missing-class.gxwf.yml` (catalog entry lists `test_interop_tests.py` and `test_schema_rules_catalog.py`).
- `schema_rules.yml` rule `Format2MissingClass` (scope `both`) — `test_schema_rules_catalog.py` asserts the negative fixture fails lax and strict, and `synthetic-basic` passes both.
- Two `validate_format2.yml` expectations (`validate_format2`, `validate_format2_strict`, `expect_error: true`).

Full suite: `uv run --group test pytest tests/ -q` → 912 passed, 8 skipped.

## Challenge results

- Nothing to drop. No mocks, no implementation-mirroring tests. The fixture-driven approach matches repo convention (`Format2MissingSteps` has the same rule + expectation pair) and is the right layer per `CLAUDE.md` ("prefer declarative YAML-driven tests").
- The two expectations overlap with the schema-rule catalog test in Python, but the expectation file is what galaxy-tool-util-ts syncs (`sync-workflow-expectations`), so the overlap is earned. Keep.
- `require_workflow_class()` in `scripts/patch_generated_pydantic.py` has no direct test; the schema-rule negative fixture fails if a regen drops the patch, so a unit test of the string replace would be silly. A loud failure in the script itself would be better design than a test (see P3 2).
- galaxy-tool-util-ts: its Effect schemas (`packages/schema/src/workflow/raw/gxformat2.effect.ts:825`, `gxformat2-draft.effect.ts:807`) already declare `class: Schema.Literal("GalaxyWorkflow")` as required, so syncing the new fixture/expectations/schema rule there should go green without TS changes. Not run.

## Gaps found by probing

Probe ran every Format2 operation from `tests/test_interop_tests.py::OPERATIONS` on the new fixture and on an inline-subworkflow variant, PR head vs `origin/main` (temp detached worktree, since removed).

1. **Inline `run:` subworkflow without `class`** — on main, validate/normalize/to_native all accept. On PR head: `validate_format2` and `validate_format2_strict` still **pass** (the `run` union `GalaxyWorkflow | str | dict[str, Any] | None` falls through to `dict[str, Any]`), but `normalized_format2` and `to_native` now **raise** `ValidationError for GalaxyWorkflow`. So validation and conversion disagree, and nothing pins either behavior. No in-repo fixture or `tests/example_wfs.py` workflow has a classless inline `run:` (grep), so prevalence is likely low, but Galaxy's converter path goes through this.
2. **Draft validators** — `validate_format2_draft[_strict]` accept the classless fixture because `GalaxyWorkflowDraft.class_` still defaults to `"GalaxyWorkflowDraft"`. Possibly intended (the PR is about `GalaxyWorkflow`), but now a doc that fails `validate_format2` silently validates as a draft. No expectation pins this.
3. **Lint path is already consistent** — `lint_format2` on the fixture reports `expected to find key [class] but absent` (error_count 1). Not pinned by an expectation.
4. Downstream operations (mermaid, cytoscape, layout, ensure/expanded) now raise on the classless doc — expected consequence, not worth a fixture each.

## Test plan (recommendations)

- Add fixture `format2/synthetic-missing-class-inline-subworkflow.gxwf.yml` (outer has `class`, inner `run:` lacks it) and expectations that pin the chosen behavior across `validate_format2`, `validate_format2_strict`, `normalized_format2`, `to_native`. Either make validation reject it (consistent with the PR's intent; likely needs `run` to stop falling through to `dict[str, Any]` for inline workflow dicts) or keep normalization lenient for nested runs. Either way validate and convert should agree.
- Add `lint_format2` expectation on `synthetic-missing-class.gxwf.yml` asserting `errors` `value_any_contains: "class"` — cheap, cross-language, documents the lint/validate parity.
- Add `validate_format2_draft` expectation on the classless fixture pinning whichever draft behavior is intended.
- In `require_workflow_class()`, raise if the target string isn't found in a Format2 module, so a generator change fails at build time rather than via a downstream test.
