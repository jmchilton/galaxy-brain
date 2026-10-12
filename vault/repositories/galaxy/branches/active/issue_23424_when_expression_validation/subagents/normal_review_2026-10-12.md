# Normal implementation review — 2026-10-12

The review reproduced false-positive import rejections for dynamic template keys, Unicode identifiers and locally shadowed inputs; the test-challenge phase will add API regressions and correct the conservative boundary before further reviews.

Unacted suggestions at this point: full JavaScript parsing and full workflow reference resolution are beyond this narrow validation rule. Repeat-path repair guidance and update coverage are being evaluated during recovery.

## Details

Read-only review of the branch against dev, including the client specification, runtime evaluation, import/update boundary, API tests and tracking records.

1. Computed templates were tokenized as strings. `$(inputs[`cond|${"input1"}`] === undefined)` evaluates true through Galaxy do_eval but analysis emits a static pipe root, leading to false import rejection. Templates must remain dynamic; a genuinely static pipe root before a computed child must still reject.
2. Unicode identifiers and local binding scopes were ignored. `${ const πinputs = {"cond|input1": true}; return πinputs["cond|input1"]; }` and `${ const inputs = {"cond|input1": true}; return inputs["cond|input1"]; }` evaluate true yet emit a forbidden root. Unsupported lexical/binding syntax should fall back conservatively without introducing a full JavaScript parser.
3. String escapes were stripped without JavaScript decoding. A unicode-escaped pipe is missed, and other escapes can produce misleading references. Decode only supported escapes or classify uncertain forms as dynamic; account for the existing client contract.

The tool-only restriction correctly preserves subworkflow pipe labels. A static forbidden root alongside a separate dynamic access must continue to reject. The manager path also handles workflow updates; add black-box boundary coverage. Generic repair guidance is less useful for repeats: queries_0|input2 needs inputs.queries[0].input2.
