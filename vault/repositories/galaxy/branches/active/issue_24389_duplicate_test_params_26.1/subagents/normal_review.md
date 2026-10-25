# Normal review

Verdict: the `case.py` fix is correct and only rejects inputs that were already broken. I acted on the main finding by dropping the XSD `xs:unique` hunk. I reproduced the problem first: at profile 21.01, `<section name="s">` with `x` given twice (outer repeat elided) runs fine and fills `r_0` and `r_1`, but the new XSD hard-errors on it, and the XSD can't be gated on profile. The linter test now covers only `TestsCaseValidation`, parametrized for error at 25.1 and warning at 23.0. I added a pin test showing that below 24.2 a conflicting test still runs on the legacy inputs, with `request=None` and an "Ambiguous" reason. I also renamed the local `inputs_as_dict` to `inputs_by_name`. Amended into `85fdcfa736f`.

Not acted on:
- PR body must name sourmash sketch (25.0) and isoformswitchanalyzer (25.1): their tests go red at load. That's a polish-stage note, recorded in the debrief.
- Legacy runtime fills elided repeat instances in reverse order: predates this branch, out of scope.
- Tests for the XSD repeat/section constraints are moot now that the XSD hunk is dropped.

<details><summary>Full review</summary>

**Verdict:** `case.py` change correct and ready. XSD hunk is the one real problem: it rejects a legacy test shape that works today at profile ≤24.1. Drop it from 26.1, or keep it and flag the lint breakage. The PR body must say that 2 IUC tools at profile ≥24.2 go red at load on a point release.

**Real issues**

1. XSD `xs:unique` rejects a working legacy idiom: enclosing repeat elided. With `allow_unqualified_access`, `ParamContext.param_names` lets a test leave out an outer `<repeat>`, so same-name params inside one container fill successive outer instances. At 21.01 these shapes run with no error but now fail the XSD:
   - `repeat r > section s > x`
   - `repeat r > conditional c > x`
   - `repeat outer > repeat inner > x`

   `TestsCaseValidation` already only warned for these. Options: (a) drop the XSD hunk, (b) keep it and document.
2. Release-target impact. `DEFAULT_USE_LEGACY_API = "always"`. Before, profile ≥24.2 tools with conflicting duplicates still ran on the legacy API, last value winning. Now they become error tests: sourmash sketch (25.0) and isoformswitchanalyzer (25.1). The fix is right, but the PR body should name them.

**Q1, legitimate rejections in case.py:** none.
- Legacy bare repeats, unqualified repeat inside a conditional, and identical duplicates are unchanged.
- Newly rejected, all already broken: multi-select given twice, `data multiple` given twice, top-level `x` plus repeat `x` given bare twice. Base modern and legacy paths disagreed on all of them.
- Below 24.2: lint warning only, runtime unchanged.

**Q3, reuse:** good. Reuses `_resolve_matching_inputs` and `visitor.repeat_inputs_to_array`. Legacy `__raw_param_found` last-wins below 24.2 is a documented choice. Merge-forward: take dev's `test_case_validation`.

**Q4, tests:** solid. Baseline commit first; 3 placements × case/lint/runtime. Gaps: XSD repeat/section constraints untested; no pin for <24.2 behavior.

**Nits:** rename local `inputs_as_dict`. Legacy reverse-order fill predates this branch.

No security concerns. All imports at module top.
</details>
