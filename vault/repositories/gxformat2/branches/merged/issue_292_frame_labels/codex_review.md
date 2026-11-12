Run via gpt-6-sol at medium effort.

Acted on nothing. A subagent fixed both P2s (nested frame pointers, nested empty frames) in `f55f5a7` and `4e78927`. The coordinator dropped both commits and reset the branch to `c0e5f73` to keep this PR scoped to the issue, and the TS port matches. No messages or fixtures changed.

Not acted on:
- **P1, out-of-range integer or digit-string indices:** these lint clean and convert to dangling `child_steps`/`child_comments`. That's out of scope per the implementation debrief and the normal review, so it's a follow-up.
- **P2, nested lint pointers:** frame errors inside a subworkflow carry the parent's `/comments/...` pointer. Every nested `lint_format2` message has the same pre-existing behavior (dangling `outputSource`, duplicate labels, …). Fixing it changes the pointer for all of them, which is its own follow-up, paired with the TS port.
- **P2, `FrameIsEmpty` in subworkflows:** `lint_best_practices` checks only the top level, for every rule. Making one rule recurse would put it out of step with its siblings. Make all best-practice rules recurse together as a follow-up.

<details><summary>Full Codex review</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "gxformat2/examples/catalog.yml",
      "gxformat2/examples/expectations/lint_best_practices_format2.yml",
      "gxformat2/examples/expectations/lint_format2.yml",
      "gxformat2/examples/expectations/to_native.yml",
      "gxformat2/examples/format2/synthetic-frame-empty.gxwf.yml",
      "gxformat2/examples/format2/synthetic-frame-references.gxwf.yml",
      "gxformat2/examples/format2/synthetic-frame-step-id-shadowed-by-label.gxwf.yml",
      "gxformat2/examples/format2/synthetic-frame-unknown-comment.gxwf.yml",
      "gxformat2/examples/format2/synthetic-frame-unknown-step.gxwf.yml",
      "gxformat2/lint.py",
      "gxformat2/lint_profiles.yml",
      "gxformat2/lint_rules.py",
      "gxformat2/normalized/_conversion.py",
      "gxformat2/normalized/_format2.py",
      "gxformat2/_comment_helpers.py",
      "gxformat2/linting.py",
      "gxformat2/schema/gxformat2.py",
      "tests/test_comments.py",
      "tests/test_interop_tests.py"
    ],
    "notes": "Reviewed the changed code, fixtures, expectations, and relevant surrounding paths. Pytest could not start because the read-only environment has no writable temporary directory; read-only Python probes confirmed the scenarios below."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "gxformat2/normalized/_format2.py",
      "line": 264,
      "title": "Out-of-range frame indices pass lint and become dangling native references",
      "detail": "The new check accepts every digit string without checking whether that step index exists, and skips integer entries entirely. Conversion then passes those values through via `_ConversionContext.step_id` or directly in `_build_native_comments`. This duplicates part of the conversion resolver without checking its result against the workflow’s steps and comments.",
      "failure_scenario": "Changing the reference fixture to `contains_steps: [\"999\"]` and `contains_comments: [999]` produces zero lint errors and native `child_steps: [999]`, `child_comments: [999]`, although neither target exists. Confirmed with a read-only Python probe.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "gxformat2/lint.py",
      "line": 191,
      "title": "Nested frame errors point to the parent workflow’s comments",
      "detail": "`lint_format2` recurses into a subworkflow with the original lint context. The new frame check appends `/comments/...` to that context, so its JSON pointer identifies a parent comment instead of the nested frame.",
      "failure_scenario": "An inline subworkflow containing the unknown-step frame emits the correct message with pointer `/comments/0/contains_steps/0`; the offending entry is inside the subworkflow. Confirmed with a read-only Python probe.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "gxformat2/lint.py",
      "line": 435,
      "title": "Empty frames inside subworkflows receive no warning",
      "detail": "`_lint_empty_frames` is called only for the workflow passed to `lint_best_practices`. That function iterates its steps but never recurses into an inline subworkflow, so the new warning omits nested frames.",
      "failure_scenario": "A parent workflow whose inline subworkflow is the `synthetic-frame-empty` fixture produces no `FrameIsEmpty` warning. Confirmed with a read-only Python probe.",
      "confidence": "certain"
    }
  ]
}
```

</details>
