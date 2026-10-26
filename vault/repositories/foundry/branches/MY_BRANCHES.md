# Open PR and branch queue

Snapshot: 2026-10-23 (recovered from live GitHub state, local worktrees and agent notes; earlier tracking lived in `agents/foundry/PULL_REQUESTS.md`).

## Open Foundry PRs — ready from our side (`ready`)

- [`issue-677-rename-syntax`](active/issue-677-rename-syntax/index.md) — Documents rename post-job action syntax (#677). [#702](https://github.com/galaxyproject/foundry/pull/702).
- [`feat/test-pipeline-test-data-branch`](active/feat-test-pipeline-test-data-branch/index.md) — Runs the test-data branch in test-pipeline, one worker per leg. Base `feat/test-pipeline-draft-loop`. [#690](https://github.com/galaxyproject/foundry/pull/690).

- [`issue-719-eval-draft-fixes`](active/issue-719-eval-draft-fixes/index.md) — Template and draft-loop evals stop failing correct output (#719). [#720](https://github.com/galaxyproject/foundry/pull/720).
- [`issue-724-shed-tool-id-version`](active/issue-724-shed-tool-id-version/index.md) — Shed tool_id is the full versioned GUID in implement-galaxy-tool-step (#724). [#727](https://github.com/galaxyproject/foundry/pull/727).
- [`issue-725-brief-scope-conflicts`](active/issue-725-brief-scope-conflicts/index.md) — Clear scope vs source conflicts become brief open questions (#725). [#728](https://github.com/galaxyproject/foundry/pull/728).
- [`issue-718-nextflow-scenarios`](active/issue-718-nextflow-scenarios/index.md) — Plain end-to-end nextflow-to-galaxy scenarios for nine more fixtures (#718). [#729](https://github.com/galaxyproject/foundry/pull/729).

## Open Foundry PRs — needs attention (`attention`)

- [`fix/data-flow-unique-element-identifiers`](active/fix-data-flow-unique-element-identifiers/index.md) — data-flow Mold: element identifiers unique per dataset. [#705](https://github.com/galaxyproject/foundry/pull/705).
- [`issue-694-direct-build-on-brief`](active/issue-694-direct-build-on-brief/index.md) — Builds the direct Galaxy routes on the Workflow Brief Molds (#694). [#696](https://github.com/galaxyproject/foundry/pull/696).
- [`feat/test-pipeline-draft-loop`](active/feat-test-pipeline-draft-loop/index.md) — Runs the draft loop in test-pipeline, one worker per call, capped and budgeted. [#686](https://github.com/galaxyproject/foundry/pull/686).
- [`fix/author-galaxy-tool-wrapper-optional-nextflow`](active/fix-author-galaxy-tool-wrapper-optional-nextflow/index.md) — Makes Nextflow evidence optional in Galaxy UDT authoring. [#545](https://github.com/galaxyproject/foundry/pull/545).

## Draft Foundry PRs — ready to undraft (`draft_ready`)

None yet.

## Draft Foundry PRs — waiting for CI (`ci_wait`)

None yet.

## Draft Foundry PRs — needs author work (`author_work`)

None yet.

## Foundry branches — implemented, work left (`branches_implemented_needs_ci`)

None yet.

## Foundry branches — implemented, work left, green (`branches_implemented`)

- [`fix/advance-draft-needs-tool`](active/fix-advance-draft-needs-tool/index.md) — Draft loop records a step that needs a tool instead of improvising one; close-enough rule. Stacked on #686. [Open PR](https://github.com/galaxyproject/foundry/compare/feat/test-pipeline-draft-loop...fix/advance-draft-needs-tool).
- [`docs/issue-labels`](active/docs-issue-labels/index.md) — Documents GitHub issue labels and triage rules (`content/meta/issue-labels.md`). [Open PR](https://github.com/galaxyproject/foundry/compare/main...docs/issue-labels).
- [`issue-534-concrete-nextflow-scenarios`](active/issue-534-concrete-nextflow-scenarios/index.md) — Replaces abstract summarize-nextflow scenarios with concrete pinned fixtures (#534). [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-534-concrete-nextflow-scenarios).

## Foundry branches — needs polish (`branches_need_polish`)

None yet.

## Foundry branches — ready for final review (`branches_ready_for_final_review`)

- [`issue-726-import-rejection-surface`](active/issue-726-import-rejection-surface/index.md) — debug-galaxy-workflow-output: workflow import rejection surface, evidence, bisection, routing (#726). [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-726-import-rejection-surface).
- [`issue-730-udt-run-recipe`](active/issue-730-udt-run-recipe/index.md) — run-workflow-test: external_galaxy route for UDT workflows, data-table detect-and-defer (#730). [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-730-udt-run-recipe).
- [`issue-731-igwt-cardinality-trace`](active/issue-731-igwt-cardinality-trace/index.md) — implement-galaxy-workflow-test: trace output kinds via `--connections`; stop overclaiming cross-check (#731). [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-731-igwt-cardinality-trace).
- [`issue-672-udt-authoring-note`](active/issue-672-udt-authoring-note/index.md) — UDT authoring note: collection inputs/outputs, vendoring recipes, `inputs.x` shape (#672). Draft [#710](https://github.com/galaxyproject/foundry/pull/710). [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-672-udt-authoring-note).

## Foundry branches — approved, opens when green (`branches_need_pr`)

None yet.

## Foundry branches — still deciding on (`branches_need_decision`)

- [`experiment/eval-philosophy-a`](active/experiment-eval-philosophy-a/index.md) — Eval philosophy experiment A; draft PR closed unmerged. [#594](https://github.com/galaxyproject/foundry/pull/594) (closed). [Open PR](https://github.com/galaxyproject/foundry/compare/main...experiment/eval-philosophy-a).
- [`experiment/eval-philosophy-b`](active/experiment-eval-philosophy-b/index.md) — Eval philosophy experiment B; draft PR closed unmerged. [#595](https://github.com/galaxyproject/foundry/pull/595) (closed). [Open PR](https://github.com/galaxyproject/foundry/compare/main...experiment/eval-philosophy-b).
- [`experiment/eval-philosophy-c`](active/experiment-eval-philosophy-c/index.md) — Eval philosophy experiment C; draft PR closed unmerged. [#596](https://github.com/galaxyproject/foundry/pull/596) (closed). [Open PR](https://github.com/galaxyproject/foundry/compare/main...experiment/eval-philosophy-c).
- [`experiment/eval-philosophy-d`](active/experiment-eval-philosophy-d/index.md) — Eval philosophy experiment D; draft PR closed unmerged. [#597](https://github.com/galaxyproject/foundry/pull/597) (closed). [Open PR](https://github.com/galaxyproject/foundry/compare/main...experiment/eval-philosophy-d).

## Foundry branches — reference only (`branches_reference`)

None yet.
