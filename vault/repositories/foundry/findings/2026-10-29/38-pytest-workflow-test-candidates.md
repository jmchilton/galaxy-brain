# pytest-workflow pipeline tests have no candidate kind and no reference coverage

- Target: galaxyproject/foundry (`summary-nextflow` schema in `packages/summarize-nextflow`, the `component-nextflow-testing` research note, summarize-nextflow Mold §7). Nothing upstream. Foundry tracking needed: yes.
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-cutandrun-2026-10-31, phase 1 (summarize-nextflow rev 19, worktree `pipeline-run-chipseq` 38400847), 2026-10-31. Ledger `snf-cutandrun-pytest-workflow-has-no-candidate-home`.
- Existing issues/PRs: none (searched `pytest`, `pytest-workflow` in galaxyproject/foundry issues and PRs). Related: #67 (closed; profile selection research), #66 (test fixtures to Galaxy inputs), 08 item 2 (`TestCandidate` has no coverage field).

## Symptom
nf-core/cutandrun 3.2.2 has no nf-test. Its whole-pipeline tests are 91 pytest-workflow cases in 26 `tests/test_*.yml` files, run in CI with `pytest --tag` (`.github/workflows/ci.yml:248`). Each case is a full `nextflow run` command (`-profile` chain, `--param` overrides, `-c tests/config/nextflow.config`) plus expected output paths, `should_exist: false` checks and, for 20 cases, `exit_code: 1`. The run could only fold them into free-text `prose_assertions` on 5 profile candidates, so the per-case params and expected files never reach the test-plan Mold in structured form.

## Root cause
1. `TestCandidate.kind` is `nf-test | profile | pipeline-defaults` (`packages/summarize-nextflow/src/schema/summary-nextflow.schema.json:403`). A command-plus-assertions case has no kind.
2. Mold §7 (`content/molds/summarize-nextflow/index.md:366`) enumerates nf-test and profiles only. `:400` sends "external test harnesses" to `component-nextflow-testing`, but that note (`content/research/component-nextflow-testing/index.md`) covers nf-test and fixtures only; its "Open gaps" section (`:94`) does not list pytest-workflow.
3. The resolver has no pytest-workflow parsing (no `pytest` match in `resolver.ts`).

Pre-nf-test nf-core pipelines used pytest-workflow widely; cutandrun is the only pinned corpus fixture that still does.

## Evidence
- Fixture: `workflow-fixtures/pipelines/nf-core__cutandrun/tests/` (`_template.yml`, `config/`, `test_01_…` through `test_verify_output_*`); CI step at `.github/workflows/ci.yml:245-249`.
- Run: `.scratch/pytest_cases.json` (91 cases; profiles `docker,test` 73, `test_full_small` 8, `test_fasta_only` 6, `test_no_genome` 2, `test_no_control` 1, `test_tech_reps` 1). Two cases lack `tags:`, so YAML folds tag lines into `command` (`tests/test_04_bam_scaling.yml:50`, `test_06_consensus_peaks.yml:21`). Assertions are paths and `should_exist` only.
- Run summary eval row "test selection never hides ambiguity": ⚠️ pytest cases folded into `prose_assertions`.

## Proposed fix
1. `component-nextflow-testing`: add a pytest-workflow section: parse `command` (profile chain, `--param` overrides, `-c` configs), map `files[].path`/`should_exist`/`md5sum`/`contains`/`must_not_contain`, and `exit_code`; note the missing-`tags:` YAML trap.
2. Schema: add `kind: pytest-workflow` with `command`, `params_delta`, `effective_profiles`, `expected_exit_code` and structured `expected_files[]`; or document a mapping onto `profile` candidates with those fields. A new kind is cleaner because cases share a profile but differ in params.
3. Mold §7: enumerate pytest-workflow cases when `tests/*.yml` and a `pytest-workflow` CI step exist; fidelity order puts them beside nf-test pipeline tests. Add the cutandrun case to `scenarios.md` and a `changes.md` entry.
4. Optionally parse them in the CLI; until then the Mold says the LLM pass adds them.

## Draft issue
**Title:** summarize-nextflow: pytest-workflow pipeline tests have no TestCandidate kind

nf-core/cutandrun 3.2.2 (fixture `nf-core__cutandrun`) has no nf-test; its 91 whole-pipeline tests are pytest-workflow cases in `tests/test_*.yml`, each a `nextflow run` command with `-profile`, `--param` overrides and expected output files (20 expect `exit_code: 1`). `TestCandidate.kind` allows only `nf-test`, `profile` and `pipeline-defaults` (schema `:403`), Mold §7 enumerates only nf-test and profiles, and `component-nextflow-testing`, which the Mold names for "external test harnesses", has no pytest-workflow section. A run had to fold the cases into `prose_assertions`, losing per-case params and expected files for test planning.

Proposed: a pytest-workflow section in `component-nextflow-testing` (command parsing, file assertions, exit codes); a `pytest-workflow` candidate kind with params, profiles, exit code and expected files; Mold §7 enumeration plus a cutandrun scenario. Related: #67, #66.
