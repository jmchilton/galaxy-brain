# Normal review debrief (expansion D)

I reviewed `00f05a6de6b`, which updates the schema descriptions, fixes a typo and regenerates `schema.ts`. There was nothing must-fix. I acted on the one should-fix in `57bf3eebd77`:

- **Should-fix:** `STEP_PARAMETERS_DESCRIPTION` could be read as saying the `'<inner step_index>|<name>'` keys are top-level. In fact they go inside the subworkflow step's own dict. It also mentioned the 400 only for an unknown inner index, but a malformed key is rejected too. I replaced the sentence with the reviewer's wording, regenerated `schema.ts` and re-ran the lint, which passes.

## Not acted on

Nothing. There were no nits.

<details><summary>Review</summary>

- **Checked as accurate:**
  - The normalized flag sentence (`run_request.py:175-181`, set from `parameters_normalized` at `:351`).
  - "Subworkflow keys require parameters_normalized" (`:188-192`).
  - The nested form `'<i>|<j>|<name>'` (the `step_parameters_by_id` recursion).
  - The 400 for an unknown inner index (`KeyError` → `RequestParameterInvalidException`).
  - The reused text in `schema/invocation.py:647`, which matches what the export produces.
- **`schema.ts`:** only the 4 descriptions changed.
- **Typo fix:** correct.
- **Should-fix (`schema/workflows.py:50`):** the suggested replacement, now applied: "For a subworkflow step, its dict is keyed '<inner step_index>|<name>' ('<i>|<j>|<name>' for nested subworkflows); this requires parameters_normalized, and a malformed key or unknown inner step index is rejected with a 400 error."

</details>
