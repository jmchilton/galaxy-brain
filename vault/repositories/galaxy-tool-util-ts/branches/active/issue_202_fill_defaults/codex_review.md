# Codex review — issue_202_fill_defaults

Acted on all 3 Codex findings (each confirmed, red-to-green, one commit each): `92f6c0ab` connected paths now materialize repeat instances in `expandToolStateDefaults` (walker counts connection instances under `repeatMinPad` too); `1f8aa641` format2 JSON-string `tool_state` now warns and is left as-is instead of being exploded into char keys; `7acce6db` format2 `$graph` entries are now filled (`#id` run refs no longer warn as non-inline).

Not acted on: none.

<details><summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      ".changeset/conditional-completeness-fill-defaults.md",
      "docs/guide/workflow-validation.md",
      "docs/packages/cli.md",
      "packages/cli/spec/gxwf.json",
      "packages/cli/src/commands/draft-validate.ts",
      "packages/cli/src/commands/fill-defaults.ts",
      "packages/cli/src/commands/lint.ts",
      "packages/cli/src/commands/strict-options.ts",
      "packages/cli/src/commands/validate-tree.ts",
      "packages/cli/src/commands/validate-workflow-json-schema.ts",
      "packages/cli/src/commands/validate-workflow.ts",
      "packages/cli/src/commands/embedded-tool.ts",
      "packages/cli/src/commands/resolve-tool.ts",
      "packages/cli/src/commands/workflow-io.ts",
      "packages/cli/src/commands/clean.ts",
      "packages/cli/src/index.ts",
      "packages/cli/src/programs/gxwf.ts",
      "packages/cli/test/fill-defaults.test.ts",
      "packages/schema/src/index.ts",
      "packages/schema/src/schema/parameter-defaults.ts",
      "packages/schema/src/workflow/fill-defaults.ts",
      "packages/schema/src/workflow/index.ts",
      "packages/schema/src/workflow/walker.ts",
      "packages/schema/src/workflow/walk-helpers.ts",
      "packages/schema/src/workflow/state-merge.ts",
      "packages/schema/src/workflow/stateful-convert.ts",
      "packages/schema/src/workflow/normalized/format2.ts",
      "packages/schema/src/workflow/normalized/toNative.ts",
      "packages/schema/src/workflow/normalized/stateful-runner.ts",
      "packages/schema/src/workflow/clean.ts",
      "packages/schema/src/workflow/serialize.ts",
      "packages/schema/src/workflow/detect-format.ts",
      "packages/schema/test/fill-defaults.test.ts",
      "package.json",
      "packages/schema/package.json",
      "vitest.config.ts",
      "packages/cli/vitest.config.ts"
    ],
    "notes": "All changed files reviewed. Used read-only Node reproductions; did not run the full Vitest suite."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "packages/cli/src/commands/fill-defaults.ts",
      "line": 109,
      "title": "String-encoded format2 tool_state is corrupted during default filling",
      "detail": "The format2 path passes a verbatim tool_state directly into expandToolStateDefaults without parsing it or applying the native path's string guard. The type assertion does not convert strings. walkNativeState then treats every character index as an unknown key and fills defaults instead of preserving the encoded parameter values. Existing format2 normalization already parses tool_state strings.",
      "failure_scenario": "A format2 tool step has no state and tool_state equal to the JSON string '{\"c\":{\"choose\":\"yes\",\"n\":42}}', with n defaulting to 7. fill-defaults replaces tool_state with an object containing character-indexed keys such as \"0\":\"{\" and c.n equal to 7, losing the authored value 42.",
      "confidence": "certain"
    },
    {
      "severity": "P1",
      "category": "correctness",
      "file": "packages/schema/src/workflow/fill-defaults.ts",
      "line": 67,
      "title": "Connection-implied repeat instances receive no defaults",
      "detail": "connectedPaths only suppresses leaf defaults. Expansion still walks with an empty connections map and repeatMinPad enabled, so repeat instance counts ignore connections. Validation's existing injectConnectionsIntoState does infer instances from connection paths. Consequently, filling and validation disagree about which conditional instances are reachable.",
      "failure_scenario": "A repeat rep has min=0 and contains a data input plus conditional c with a default test value. State is {}, and input_connections contains rep_0|data. fill-defaults emits {\"rep\":[]}. Subsequent strict-state validation materializes instance 0 from the connection and fails with \"rep_0|c: missing conditional test parameter 'choose'\". A Node reproduction confirmed this.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "packages/cli/src/commands/fill-defaults.ts",
      "line": 76,
      "title": "Format2 graph documents are silently left unfilled",
      "detail": "The new raw workflow traversal only reads wf.steps. Supported format2 $graph documents keep their steps inside graph entries, so this path visits nothing and reports zero filled steps. normalizedFormat2 already handles main-entry extraction and graph references; duplicating format2 traversal here omits those semantics. This traversal should share that handling or use a reusable raw-document traversal.",
      "failure_scenario": "A valid format2 document has $graph containing an id: main GalaxyWorkflow whose cached tool step has state: {} and a conditional with a static default. fill-defaults succeeds with \"Filled defaults on 0 step(s)\" and outputs unchanged state; validate --strict-state still rejects the missing conditional test.",
      "confidence": "certain"
    }
  ]
}
```

</details>
