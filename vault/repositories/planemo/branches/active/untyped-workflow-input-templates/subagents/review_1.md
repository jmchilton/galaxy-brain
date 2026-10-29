Run via claude-opus-5-5 at low effort.

Approved as is; no code changes. Recorded the #1744 convergence note in both branch records.

Not acted on:
- Docstring nit: current one-liner already states the non-obvious rule (untyped means data).
- Typed gxformat2 `inputs()` models: bigger refactor than this fix.
- "Assert template content": already done; both tests compare the full generated job.

<details><summary>Full review</summary>

**Verdict: approve as is.** Minimal, correct, red-to-green tested; no bugs or security concerns.

- No other planemo code reads `type` from `inputs_normalized` output (`input_labels`, `required_input_steps` read label/optional/default only; `training/tool_input.py:62`, `shed/__init__.py:875`, `autoupdate.py:322` read native/raw steps).
- Reuse: helper beside `input_label` is the right place.
- should: converge with #1744's `input_kind` (`or DATA_INPUT` duplicates the default). Whichever merges second drops one default; preferred end state is `normalized_input_type(step)` owning the default and `input_kind` classifying without fallback.
- nit: docstring could be shorter.
- Tests well placed (one CLI test per command module, 5-line fixture), not trivial.

</details>
