Run via gpt-6.1-sol at high effort.

Codex reported no findings on `f7cab7b8`, so I changed no code and made no commits. Treat this as a limited pass, not a full clean review: Codex's shell never worked here, so it read only the diff and 15 source files I embedded in its prompt, and it could not run anything or open other files.

Not acted on:

- Nothing refuted and nothing needs a decision, since there were no findings to triage.

How the run differed from the planned brief:

- The first run came back empty because every shell command failed with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`. It read no files, so I discarded its empty result. I kept `-s read-only` and did not disable any sandbox.
- The second run had the diff and sources embedded after the same brief, plus a note that the shell might fail. Codex reported its effort as `none`, with no findings.
- The third run is the one reported here: the same prompt, with `-c model_reasoning_effort=high` for that run only. `~/.codex/config.toml` sets no effort.
- I chose the embedded files, which is a small dent in independence: `report-models.ts`, `draft-validate.ts`, `validate-workflow.ts`, `validate-workflow-json-schema.ts`, `step-label.ts`, `embedded-tool.ts`, `render-results.ts`, `validate-tree.ts`, `lint.ts`, `graph-builder.ts`, `report-builder.ts`, `connection-validator.ts`, `toNative.ts` and the `draft_validate` and `connection_section` report templates. Nothing from the debriefs went in.

<details><summary>Full Codex review</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      ".changeset/concrete-errors-step-labels.md",
      "docs/guide/draft-format.md",
      "packages/cli/src/commands/step-label.ts",
      "packages/cli/src/commands/validate-workflow-json-schema.ts",
      "packages/cli/src/commands/validate-workflow.ts",
      "packages/cli/src/commands/draft-validate.ts",
      "packages/cli/src/commands/embedded-tool.ts",
      "packages/cli/src/commands/render-results.ts",
      "packages/cli/src/commands/validate-tree.ts",
      "packages/cli/src/commands/lint.ts",
      "packages/cli/test/concrete-errors.test.ts",
      "packages/cli/test/user-defined-tool-step.test.ts",
      "packages/connection-validation/src/graph-builder.ts",
      "packages/connection-validation/src/report-builder.ts",
      "packages/connection-validation/src/connection-validator.ts",
      "packages/schema/src/index.ts",
      "packages/schema/src/workflow/index.ts",
      "packages/schema/src/workflow/normalized/index.ts",
      "packages/schema/src/workflow/normalized/toNative.ts",
      "packages/schema/src/workflow/report-models.ts",
      "packages/schema/test/report-models-draft.test.ts",
      "packages/cli/src/workflow/templates/reports/draft_validate.md.j2",
      "packages/cli/src/workflow/templates/reports/connection_section.md.j2"
    ],
    "notes": "Reviewed the complete supplied diff and embedded source. Shell commands failed before execution, preventing additional surrounding-file reads and test execution. Files supplied only as diffs were reviewed to that extent."
  },
  "findings": []
}
```

</details>
