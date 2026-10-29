# debug-galaxy-workflow-output has no defined behaviour or handoff for a passing run

- Target: galaxyproject/foundry. The gap is in a Foundry Mold, its eval, and the pipeline harness; nothing upstream is involved. Foundry tracking needed: no (the issue is the tracking issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29, phase 11 (`debug-galaxy-workflow-output`, after `run-workflow-test`), 2026-10-29. Foundry `pipeline-run-demo-v1` @ 9f83fd55 (= origin/main) + local 8758f9ee; harness `pipeline-workflow-brief-to-galaxy` source revision 6; debug Mold revision 5.
- Existing issues/PRs: no duplicate. Related: galaxyproject/foundry#662 (open; green job roster with unevaluated assertions has no debug path; proposes a "zeroth branch" in the same Mold). PR #732 (open, adds an import-rejection surface to this Mold) does not touch the pass case. The local feedback ledger entry `debug-mold-undefined-on-passing-handoff` (status open, issue null) records this.

## Symptom
Phase 10 ran `planemo test` and got 1/1 passed, 13/13 jobs ok (`workflow-test-result.json` `"status": "pass"`). Phase 11 then ran with nothing to do. Nothing in the Mold, pipeline or harness says whether to skip it, write a "no failure" report, or audit assertion strength. The orchestrator told the subagent not to write a report. It marked the phase `done` with `artifacts: []`, though the Mold declares a required `workflow-debug-report.md`. The orchestrator also did the open-requirements ledger's terminal close pass itself (2 resolved, 5 surrendered), because no phase owns that pass.

## Root cause
Confirmed (high confidence). The stated cause is correct, and it appears at every layer:
1. **Mold**: it is written for failing runs only. Its input and every step assume a failure ("Triage a failing Galaxy workflow test", step 1 "Classify the first failure surface"), and its single output is required. There is no entry check on `workflow-test-result.status`.
2. **Upstream handoff**: `run-workflow-test` step 6 says `test-definition-missing`/`not-run` are "not a debug target". It says nothing about `pass`, so the debug Mold inherits no rule either.
3. **Pipeline**: phase 11 is an unconditional `mold:` entry. The pipeline phase schema cannot express a condition: `moldPhase` is `.strict()` with only `mold` and `loop`. No `harness_note` makes the phase conditional.
4. **Harness**: the generated SKILL.md says only "invoke the `debug-galaxy-workflow-output` skill" and never mentions `skipped`. The run-record model already accepts phase status `skipped`, but nothing tells the harness to use it.
5. **Eval**: every debug property is conditional ("given a failed ... handoff", "when a Galaxy job is in a terminal failure state", ...). So "N/A on all 5 properties (green)" is a correct reading of the eval's wording. But that verdict passes the phase without checking anything: no property covers a pass handoff, such as "no fabricated failure, no repair recommendation, and a recorded outcome". The pipeline `eval.md` has no property for the test/debug tail or the terminal ledger close.
6. **Ledger close**: the ledger research note says `surrendered` is set "at the end of a run", and it admits no one owns that terminal surrender of non-blocking entries ("Nothing owns that pass today").

## Evidence
- `content/molds/debug-galaxy-workflow-output/index.md:12` summary "Triage failing Galaxy run outputs"; `:15` input "the observed failure modality"; `:17-20` required output `workflow-debug-report.md` (no `optional: true`); `:81` "Triage a failing Galaxy workflow test"; `:87` step 1. No step reads `status`.
- `content/molds/debug-galaxy-workflow-output/eval.md:12,20,28,37,47`: all five properties are conditioned on failure.
- `content/molds/run-workflow-test/index.md:80` covers handoff states; only the not-run states are declared "not ... a debug target".
- `content/pipelines/workflow-brief-to-galaxy/index.md:51` unconditional phase; `harness_notes` `:12-35` have no condition. The same unconditional tail is in `nextflow-to-galaxy:33`, `interview-to-galaxy:31`, `update-interview-to-galaxy:29` and `paper-to-galaxy:32`. `galaxy-workflow-maturation:19,27-28` already handles it differently: the debug Mold is a `related_molds` entry invoked by the user on red.
- `packages/gxwf-foundry-note-schema/src/types/pipeline/schema.ts:20-25`: `moldPhase` is strict, with only `mold` and `loop`.
- `casts/claude/skills/pipeline-workflow-brief-to-galaxy/SKILL.md:78` is the phase line; `:37` says to mark a phase `done` "after success". `grep -c skipped` = 0.
- `packages/build-cli/src/lib/run-model.ts:23` and `run-record.ts:63` accept `skipped`.
- `content/research/open-requirements-ledger/index.md:180,226` "Nothing owns that pass today".
- Run: `foundry-run.yml` phase 11 `status: done, artifacts: []`; `run-summary.md` P11 row "N/A on all 5 properties (green)" and "orchestrator did the terminal ledger close pass"; `foundry-feedback.ledger.yml:299-312`.

## Proposed fix
Put the rule in the Mold, so all five Galaxy pipelines that share this tail inherit it. Then make the harness and evals agree with it:
1. Debug Mold: add **step 0, "Read the handoff status"**. On `pass` with evaluated assertions, there is no failure surface: write no report and recommend nothing. Optionally flag existence-only or trivially weak assertions as feedback, without changing the test. On `test-definition-missing`/`not-run`, stop and report "no runtime evidence". On green-but-unevaluated, follow #662's zeroth branch. Mark `workflow-debug-report` `optional: true`.
2. Debug eval: add a property for a pass handoff: no failure classification, no repair recipe, no edited test or workflow, and the outcome recorded. Name the N/A rule for the five failure properties.
3. Pipelines: add a harness_note to the Galaxy pipelines: "Run the debug phase only when `run-workflow-test` reports `fail`; otherwise record it `skipped` in the run record and the feedback ledger." The generator then puts that note in SKILL.md. A schema-level `when:` is not needed yet.
4. Ledger close: assign the terminal surrender pass to the harness `## Done` section, or to a named phase. Add a pipeline `eval.md` property: "no `open` entry remains at a complete run". This closes ledger note `:226`.

## Draft issue
**Title:** debug-galaxy-workflow-output is undefined on a passing run; harness and eval have no conditional or skip

In the Galaxy pipelines, `debug-galaxy-workflow-output` always runs after `run-workflow-test`, but the Mold only describes a failing handoff. In a WORKFLOW BRIEF → GALAXY run (nf-core/demo golden brief, 2026-10-29), Planemo passed 1/1 (13/13 jobs ok). Phase 11 had no defined action: whether to skip, write a "no failure" report, or audit assertion strength. The orchestrator decided ad hoc to write no report and mark the phase `done` with no artifacts, although the Mold declares `workflow-debug-report.md` as required output. It also did the open-requirements ledger's terminal surrender pass itself, because no phase owns it.

Where it is missing:
- Mold `debug-galaxy-workflow-output`: no step reads `workflow-test-result.status`; the output is not `optional`.
- `run-workflow-test` step 6 rules out `test-definition-missing`/`not-run` as debug targets, but not `pass`.
- Pipelines (`workflow-brief-to-galaxy`, `nextflow-to-galaxy`, `interview-to-galaxy`, `update-interview-to-galaxy`, `paper-to-galaxy`): the phase is unconditional, no harness_note covers it, and the generated SKILL.md never uses the `skipped` phase status that the run record already accepts.
- Debug `eval.md`: all five properties are failure-conditioned, so a green run scores "N/A" on everything. No property says what a correct pass outcome looks like.
- `open-requirements-ledger` note: "Nothing owns that pass today" for terminal surrender of non-blocking entries.

Proposed:
1. Add a step 0 to the debug Mold: on `pass`, write no report and recommend no repair (optionally note weak assertions as feedback). On `not-run`/`test-definition-missing`, report no runtime evidence. On green-but-unevaluated, follow #662. Mark the output `optional: true`.
2. Add a debug eval property for the pass handoff.
3. Add a harness_note to each Galaxy pipeline: run the debug phase only on `fail`, otherwise record it `skipped` in `foundry-run.yml` and the feedback ledger.
4. Have the harness `## Done` own the terminal ledger surrender pass, and add a pipeline eval property that no entry stays `open` at `complete`.

Related: #662 (green but unevaluated assertions), #732.
