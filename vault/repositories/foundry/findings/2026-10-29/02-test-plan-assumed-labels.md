# Test-plan Mold forces `assumed` labels after the concrete workflow exists

- Target: galaxyproject/foundry. The cause is in Foundry's own Mold text and eval; the schema and the downstream Mold already handle `draft`/`resolved`. Foundry tracking needed: no (the target is Foundry).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29, phase 7 (`workflow-brief-to-galaxy-test-plan`, Mold rev 4), 2026-10-29. Ledger id `brief-test-plan-ignores-concrete-draft-and-test-data-refs`.
- Existing issues/PRs: duplicate in substance of [#577](https://github.com/galaxyproject/foundry/issues/577) (open, `needs-triage`), which reports the same section in `freeform-summary-to-galaxy-test-plan`, and a follow-up comment there reports the same gap in `nextflow-test-to-galaxy-test-plan`. Related: [#694](https://github.com/galaxyproject/foundry/issues/694) / [PR 696](https://github.com/galaxyproject/foundry/pull/696) retire the freeform Galaxy design Molds. That would leave only the brief Mold, which PR 696 does not touch.
- Also seen in atacseq v0 (/home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 7, ledger `brief-test-plan-label-rule-ignores-ledger-interface-amendments`): the plan ran after the concrete draft, which had removed 7 inputs, left 2 outputs without a producer and changed some output kinds. The Mold binds labels to the interface brief and reads the ledger only for open-question decisions, so following the ledger amendments was a judgement call. The same fix applies: read the concrete draft and current ledger amendments.

## Symptom
Phase 7 received `galaxy-workflow.gxwf.yml` and `test-data-refs.json`. All 7 labels matched the draft by name, but the plan still set `workflow.label_source: interface-brief` and every `label_status: assumed` (galaxy-test-plan.yml:23,31,47,70,...). The interface brief was out of date relative to the ledger: it had no `multiqc_plot_data` output, FastQC outputs were flat in the ledger, and `multiqc_data` was a single table. As a result, the plan bound labels from the ledger and then had to label a verified match as an assumption.

## Root cause
Confirmed, high confidence. This is a deliberate rule in the Mold, not a limit of the schema:
- `content/molds/workflow-brief-to-galaxy-test-plan/index.md:139-146`: "This Mold consumes the template-era briefs, not the concrete workflow draft or the resolved test-data refs — those exist in the harness run-state by the time the plan is authored, but they are reconciled downstream". It requires `assumed` and `label_source: interface-brief`, and requires `storage: unresolved` for fixtures.
- Frontmatter `input_artifacts` (index.md:13-35) does not list `galaxy-workflow` or `test-data-refs`, so the cast skill has no official way to read them.
- `eval.md:22` turns `assumed`/`unresolved` + `interface-brief` into a deterministic eval property. A plan that resolves its labels would fail its own eval.
- The text was written for the freeform Mold in b437ce23 (2026-06-16, PR 316) and copied unchanged into the brief Mold in 691e6c02 (2026-09-20). In `workflow-brief-to-galaxy`, phase 7 runs after phases 5 (draft loop) and 6 (test data), per `content/pipelines/workflow-brief-to-galaxy/index.md:43-48`. The stated cause, a plan written as if the workflow did not exist yet, is correct. More precisely, the Mold knows the draft exists and is told to ignore it.

## Evidence
- Schema allows the right values: `packages/gxwf-foundry/src/schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.json:75-79` (`label_source` enum `draft|interface-brief|assumed`; "draft means ... read from a concrete gxformat2 workflow draft (verifiable)") and :129-133, :182-186 (`label_status: resolved` = "matches a concrete workflow draft"). Test fixture `packages/gxwf-foundry/test/fixtures/galaxy-workflow-test-plan/nextflow-translated.yml:12,21` uses `draft`/`resolved`.
- Downstream, `content/molds/implement-galaxy-workflow-test/index.md:25-27,112` already takes `galaxy-workflow` and `test-data-refs` and reconciles labels against them. Resolving labels in phase 7 would make that step confirm the labels rather than discover them.
- Worktree HEAD 8758f9ee; `git diff HEAD origin/main` is empty for the Mold and schema, so this is current on main. The last change to this Mold was 7c359325, which added ledger-following but left the rule in place.
- The run used foundry_head 9f83fd55; the ledger entry records Mold content_hash df02aa50…

## Proposed fix
In `workflow-brief-to-galaxy-test-plan`, and in the freeform Mold while it still exists:
1. Add optional `galaxy-workflow` and `test-data-refs` input artifacts.
2. Replace "Labels and fixtures are assumed, not bound" with a conditional rule. When the draft is supplied, read labels from it: `label_source: draft`, `label_status: resolved` for labels found in the draft. Use `unresolved[]` for brief or ledger labels missing from the draft (testability pressure). Without the draft, keep the current `interface-brief`/`assumed` behavior. When `test-data-refs` is supplied, copy the resolved location and checksum.
3. Say explicitly that current ledger decisions override the interface brief on labels and shapes.
4. Make the eval.md:22 property conditional on which inputs were present. Add a scenario that supplies the draft.
5. Recast. The ledger entry `test-plan-schema-single-fixture-per-collection-input` is a separate schema gap (no per-element fixtures) and is not part of this fix.

## Draft issue
Suggest posting this as a comment on #577 that widens its scope, rather than opening a new issue:

> **Same gap in `workflow-brief-to-galaxy-test-plan`, the Mold that will survive #694.** Its "Labels and fixtures are assumed, not bound" section (index.md:139-146) is a verbatim copy from 691e6c02. In `workflow-brief-to-galaxy`, phase 7 runs after the draft loop and test-data resolution, and the section even acknowledges that "those exist in the harness run-state by the time the plan is authored". Still, its inputs omit `galaxy-workflow` and `test-data-refs`, and eval.md:22 requires `label_status: assumed` and `label_source: interface-brief` as a deterministic property.
>
> In the nf-core/demo brief run (2026-10-29), the plan received the concrete draft. All 7 labels matched it by name, and one of them (`multiqc_plot_data`) was missing from the out-of-date interface brief. The plan still had to mark every label `assumed`. The schema already supports `draft`/`resolved` (galaxy-workflow-test-plan.schema.json:75-79, 129-133), and `implement-galaxy-workflow-test` already reads both artifacts.
>
> Proposed: add `galaxy-workflow` and `test-data-refs` as optional inputs. When present, use `label_source: draft` and `label_status: resolved` for labels found in the draft, put draft-missing labels in `unresolved[]`, and copy fixtures from the resolved refs. State that current ledger decisions override the interface brief. Make eval.md:22 conditional on inputs and add a draft-supplied scenario. Apply the same change to the freeform and nextflow siblings, or let #694 retire the freeform one.
