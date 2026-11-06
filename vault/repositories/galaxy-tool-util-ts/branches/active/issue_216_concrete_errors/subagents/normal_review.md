Run via claude-opus-5-5 at high effort.

Acted on the one behavior bug (`label: ""` disagreeing between reports), the test gaps the reviewer's mutations exposed, moving the label helpers into the CLI, and the test cleanup, in `f7cab7b8`. No P1 or P2 findings, and `concrete.ok === false` always produced entries across about 40 real runs.

Not acted on:

- `validationFailures` (`failures[]` in `validate-tree --json`) still has only the positional step. It's a template-rendering summary the issue doesn't name, so it's a follow-up rather than this branch.
- Entries for an unlabelled step can't be told apart: `label: null`, no `step`, maybe the same `tool_id`. Common for inner steps of a `.ga` subworkflow. The issue specifies null and no `step`, so this is John's call.
- `nativeStepLabel` reads as if it takes a native step. Renaming a function `toNative` and lint already use is churn this branch doesn't need.
- Integration coverage of step-level connection errors and `strict_structure`: covered by builder tests, and the reviewer saw both work in real runs. `strict_encoding` is a string-array pass-through.

<details><summary>Full review</summary>

No P1 or P2 findings. Five P3 findings.

**P3 1: `label: ""` not treated as "no label" everywhere.** `stepLabelPath` treats `""` as no label, but `graph-builder.ts` kept it, so `tool_state` had no label while `connection_report` and a `concrete_errors` connections entry had `""`. Real input: `synthetic-lint-unlabeled-steps.ga`. Fixed at `graph-builder.ts` as the reviewer suggested. That changed edge annotation keys and regressed `gxwf mermaid --annotate-connections`, so polish moved the fix to `report-builder.ts` (`0756cf04`).

**P3 2: Test gaps confirmed by surviving mutations.** Labelled outer with unlabelled inner; json-schema format2 walker using raw `step.label`; `_unlabeled_step_*` sentinels; `strict_state` filter widened to `status !== "ok"`. All four now have tests.

**P3 3: `stepLabelPath` and `withStepLabel` widen the public schema API.** Only the CLI walkers call them. Moved to `packages/cli/src/commands/step-label.ts`. The `nativeStepLabel` export is justified: it's the single rule `toNative` uses, so labels agree by construction.

**P3 4: Test cleanup.** Removed the assertion pinning the numbering mismatch as required behavior, since the issue says renumbering may follow. Removed schema tests that duplicate CLI ones.

**P3 5: `validationFailures` has only the positional step.** Not acted on, above.

**Decision for John:** null label on unlabelled inner steps. Not acted on, above.

Checked by the reviewer: labels agree across map form (explicit, null, numeric keys), list form (with and without `id`, numeric `id`, `id` plus `label`), sentinels, UDT `run:`, inline and external format2 and `.ga` subworkflows, nested drafts, a TODO step ahead of the failing one, `tool_state` steps and native `.ga`. lint, validate-tree and a gxwf-web POST return `label` without breaking; the POST returned 200 with `label` outside the openapi schema, which the issue accepts. Typecheck passed for schema, cli, gxwf-web, gxwf-client, gxwf-report-shell and gxwf-ui.

No security concerns.

</details>
