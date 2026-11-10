Run via Claude Opus 5.5 at low effort.

Acted on: deduped the two copy-paste loops in `unresolved_frame_references` and flattened nested `_child_context` chains via a `_comment_context` helper (`90029f9`). Coordinator-added fix (`2601790`, red-to-green): non-frame comments with unknown `contains_comments` labels hit bare `KeyError`; restored base guard/message in `_build_native_comments` (mirrors TS `ac7ad741`) plus imperative test. Messages, rules, fixtures, expectations unchanged. Not acted on: items below.

Not acted on:
- Out-of-range indices / subworkflow recursion of lint pointers and best practices — prior decisions stand.
- `comment_labels` set in `_format2.py` and `comment_label_map` in `_conversion.py` both derive comment labels — different shapes (set vs index map), merging would add a property for one caller; minor.
- `_build_native_comments` takes the whole workflow just to read `comments` + `unresolved_frame_references` — acceptable; the gate belongs at conversion entry and this is the only comment builder.

<details><summary>Full review</summary>

Verdict: clean, small change; no file crosses 1k lines due to this diff, no spaghetti growth. Resolution logic lives in one canonical place (`NormalizedFormat2.unresolved_frame_references`) feeding both lint and conversion, replacing the old ad-hoc `Exception` in conversion — the right "judo" move already made.

1. Duplicated loop bodies (fixed). `contains_steps` and `contains_comments` loops differed only in field name, noun and resolver. Now one table-driven loop over `(field, kind, refs, resolves)`, with a typed `FrameField` alias so `field` stays a `Literal`.
2. Nested context chains (fixed). Four-deep `_child_context` nesting in `_validate_frame_references` and two-deep in `_lint_empty_frames`; added `_comment_context` mirroring existing `_native_step_context`.
3. Duplicate comment-label derivation (not acted on; see above).
4. `_build_native_comments(wf, ctx)` signature widening (not acted on; see above).
5. Types/boundaries: `UnresolvedFrameReference` NamedTuple is an explicit typed contract; `_is_index_string` stricter than `int()` — good.
6. Tests: exact-message assertions, subworkflow case covered; no weakening.

</details>
