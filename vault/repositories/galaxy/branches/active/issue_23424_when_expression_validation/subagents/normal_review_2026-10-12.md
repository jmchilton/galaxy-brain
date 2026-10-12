# Normal implementation review — 2026-10-12

The review reproduced false-positive import rejections; conservative scanner fixes and API regressions address every finding, and the follow-up review found no remaining compatibility blocker.

Unacted suggestions: full JavaScript parsing and full workflow reference resolution remain outside this narrow validation rule. Repeat-path migration guidance was added to the release note, and API coverage now verifies editor-format updates and persistence after rejection.

## Details

Read-only review of the branch against dev, including the client specification, runtime evaluation, import/update boundary, API tests and tracking records.

1. Computed templates were tokenized as strings. `$(inputs[`cond|${"input1"}`] === undefined)` evaluates true through Galaxy do_eval but analysis emits a static pipe root, leading to false import rejection. Templates must remain dynamic; a genuinely static pipe root before a computed child must still reject.
2. Unicode identifiers and local binding scopes were ignored. `${ const πinputs = {"cond|input1": true}; return πinputs["cond|input1"]; }` and `${ const inputs = {"cond|input1": true}; return inputs["cond|input1"]; }` evaluate true yet emit a forbidden root. Unsupported lexical/binding syntax should fall back conservatively without introducing a full JavaScript parser.
3. String escapes were stripped without JavaScript decoding. A unicode-escaped pipe is missed, and other escapes can produce misleading references. Decode only supported escapes or classify uncertain forms as dynamic; account for the existing client contract.

The tool-only restriction correctly preserves subworkflow pipe labels. A static forbidden root alongside a separate dynamic access must continue to reject. The manager path also handles workflow updates; add black-box boundary coverage. Generic repair guidance is less useful for repeats: queries_0|input2 needs inputs.queries[0].input2.

## Follow-up review after fixes

The independent review checked eight permissive examples covering shadowed and Unicode identifiers, escaped roots, simple and nested templates, quoted interpolation braces, and braces inside interpolation regexes/comments. Four known static pipe-root examples still reject, including computed children and separate dynamic accesses. The shared specification unit test passed independently.

The follow-up identified a nested-template edge: braces in interpolation regexes/comments could expose inner literal input-like text. Both reproduced valid expressions evaluate true through do_eval; conservative unsupported-interpolation handling now covers them with API regression tests. The reviewer also recommended punctuation-only arrow detection and removing an extra EOF blank line; both were corrected. The strict quality review additionally identified bare assignment rebinding and removed unused client-policy helpers; the final API/shared-spec run passed 29 cases.

No remaining compatibility blocker was found.

## Final committed-head signoff

Reviewed committed `d47f83c407c71649356c27065ea80e9ee360c531`: no new substantive findings. Assignment fallback and punctuation-only arrow handling close the remaining gaps, with API regressions for both. Removed client-policy helpers leave no dangling references, repeat guidance matches the runtime path, whitespace checks pass and the worktree is clean. Unsupported JavaScript remains accepted conservatively while recognized static pipe roots reject.
