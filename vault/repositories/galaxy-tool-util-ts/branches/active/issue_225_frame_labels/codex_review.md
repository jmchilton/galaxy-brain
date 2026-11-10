Run via gpt-6-sol at medium effort.

Acted on 1 of 3 findings (non-frame `contains_comments` regression, fixed in `ac7ad741` with red-to-green test); 2 not acted on.

Not acted on:

- Dict-form explicit `label` beats map key: deliberate, matches Python `_format2.py` (`if "label" not in comment`); already in implementation_debrief.md.
- Nested frame lint errors use root `/comments/...` pointer: format2 subworkflow recursion reuses root `LintContext` for all its errors (pre-existing pattern); fixing means changing pointers for every subworkflow lint, out of scope here. Worth a follow-up issue.

<details><summary>Full Codex review</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      ".changeset/frame-contains-labels.md",
      "packages/cli/src/commands/convert.ts",
      "packages/cli/test/convert.test.ts",
      "packages/schema/src/index.ts",
      "packages/schema/src/workflow/index.ts",
      "packages/schema/src/workflow/lint-rules.ts",
      "packages/schema/src/workflow/lint.ts",
      "packages/schema/src/workflow/lint_profiles.yml",
      "packages/schema/src/workflow/normalized/comments.ts",
      "packages/schema/src/workflow/normalized/format2.ts",
      "packages/schema/src/workflow/normalized/labels.ts",
      "packages/schema/src/workflow/normalized/toFormat2.ts",
      "packages/schema/src/workflow/normalized/toNative.ts",
      "packages/schema/src/workflow/raw/gxformat2.ts",
      "packages/schema/test/to-native-frame-references.test.ts",
      "packages/schema/test/fixtures/expectations/lint_best_practices_format2.yml",
      "packages/schema/test/fixtures/expectations/lint_format2.yml",
      "packages/schema/test/fixtures/expectations/to_native.yml",
      "packages/schema/test/fixtures/workflows/format2/synthetic-comments-dict.gxwf.yml",
      "packages/schema/test/fixtures/workflows/format2/synthetic-frame-empty.gxwf.yml",
      "packages/schema/test/fixtures/workflows/format2/synthetic-frame-references.gxwf.yml",
      "packages/schema/test/fixtures/workflows/format2/synthetic-frame-step-id-shadowed-by-label.gxwf.yml",
      "packages/schema/test/fixtures/workflows/format2/synthetic-frame-unknown-comment.gxwf.yml",
      "packages/schema/test/fixtures/workflows/format2/synthetic-frame-unknown-step.gxwf.yml"
    ],
    "notes": "Reviewed the changed files and relevant surrounding code. Tests were not run in the read-only workspace."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "packages/schema/src/workflow/normalized/comments.ts",
      "line": 106,
      "title": "Dict-form comment keys no longer consistently become labels",
      "detail": "The spread at line 108 lets an explicit comment.label override the mapping key. Previously, toNative spread the comment first and assigned the key last. The new shared helper therefore changes both conversion and frame-reference validation for this case.",
      "failure_scenario": "With `comments: {note: {type: text, label: other}, frame: {type: frame, contains_comments: [note]}}`, the previously resolvable `note` reference is reported as unknown and conversion fails.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "packages/schema/src/workflow/normalized/toNative.ts",
      "line": 707,
      "title": "Unknown comment references outside frames now become undefined",
      "detail": "The previous child_comments mapping threw when a string was absent from commentLabelMap. The replacement non-null assertion does not check the map. unresolvedFrameReferences checks only comments whose type is `frame`, although conversion still maps child_comments on every comment. A shared comment-reference resolver would keep validation and conversion aligned.",
      "failure_scenario": "Calling toNative with a text comment containing `contains_comments: [missing]` returns a native comment whose child_comments contains `undefined` (serialized as `null`) instead of the previous error.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "packages/schema/src/workflow/lint.ts",
      "line": 395,
      "title": "Nested frame errors point to the root workflow's comments",
      "detail": "The recursive call reuses the root LintContext. The new validateFrameReferences then appends `/comments/...` without the subworkflow step path, so its JSON pointer identifies a root comment rather than the frame with the bad reference.",
      "failure_scenario": "A parent workflow with a `nested` subworkflow step whose frame contains `contains_steps: [missing]` receives a lint error at `/comments/0/contains_steps/0`; the bad entry is inside `nested`'s `run` workflow.",
      "confidence": "certain"
    }
  ]
}
```

</details>
