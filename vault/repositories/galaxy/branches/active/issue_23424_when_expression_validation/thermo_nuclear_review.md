# Thermo-nuclear code quality review — 2026-10-12

All three accepted recommendations were implemented and verified: the unused Python client-policy API was removed, conservative binding guards were corrected, and the final implementation has no remaining code-quality blocker.

## Acted recommendations

1. **Deleted the unused client-policy port.** `expression_references_input` had no production caller; repository search found only its definition and shared-spec test. The author deleted it, `_input_path_is_prefix`, and `Sequence`. The server now exposes only reference analysis, rather than carrying permissive editor edge-highlighting policy. Python tests still check every shared `static_paths` / `dynamic` expectation and explicitly skip client-only cases. The shared YAML and client policy tests remain unchanged. This removes unused behavior, rather than weakening assertions to accommodate failures.
2. **Distinguished arrow punctuation from quoted text.** The scope guard formerly compared `token.value == "=>"` regardless of token type. `$(inputs["cond|input1"] !== null && "=>" === "=>")` incorrectly produced no static paths. Requiring punctuation restores the proved root, and an API regression checks rejection alongside quoted arrow text.
3. **Treated assignments as unsupported binding syntax.** `$(inputs = JSON.parse('{"cond|input1":true}'), inputs["cond|input1"])` formerly produced a forbidden static root despite reading a replacement object. A strict-mode Node reproduction returns true. Standalone `=` punctuation now makes the expression unknown; existing distinct equality tokens remain supported. An API regression checks successful import and unchanged export. This conservative rule avoids a scope/assignment parser.

## Not acted on

- Do not replace the scanner with a broad regex or full JavaScript parser: the former cannot distinguish strings/comments/properties, while the latter broadens the supported language and dependency surface beyond this migration check.
- Do not decompose the pre-existing oversized workflow manager/API test suite in this branch: no file crosses the 1,000-line threshold, and extracting only these tests would duplicate or expose unrelated private upload/setup helpers.
- Do not generate guessed repeat-path rewrites in the server: `queries_0|input2` requires `inputs.queries[0].input2`; generic pipe splitting is insufficient without canonical repeat-path information. Include the repeat example in release/PR guidance instead.

## Details

### Structural simplification

Deleting the client-only policy layer is the high-confidence code-judo improvement. The remaining analyzer uses small typed token, access-path and result models. Its separate workflow module owns lexical/path analysis, while the manager adds one contiguous check to the existing step-loading boundary. No feature logic is scattered across import adapters or runtime execution. The same loader covers creation and update; a regression checks that a rejected update preserves the previous expression.

The shared fixture remains useful for the overlapping scanner subset. `ReferenceAnalysis.has_dynamic_inputs_access` and typed segments carry actual analysis semantics; deleting them merely because the manager currently consumes paths would blur that contract. No class hierarchy, validation mode or wrapper is warranted.

### Strict server versus permissive editor

The editor overmatches to show existing connected edges. The server rejects only a proved obsolete tool-state root. Server-specific Unicode, escaped literals, templates, scopes and assignment fallbacks therefore belong in backend boundary regressions, rather than changing editor policy to force identical outcomes.

A dynamic child or separate computed access must not erase an already proved flat root. The manager correctly inspects retained static paths independently of the dynamic flag, so `inputs["cond|input1"][someKey]` still rejects. Whole-expression fallback is appropriate when binding identity or lexical structure itself cannot be established. Tool-only validation deliberately preserves pipe-containing subworkflow input labels.

### Bounded scanner complexity

The recovery adds conservative binding/Unicode/escape guards and distinguishes dynamic literal tokens. The template reader skips quoted interpolation bodies and returns unknown for nested templates, interpolation regexes and comments. The final analyzer is 257 lines and separates tokenization from property-path reading. Hold this boundary: future lexical ambiguity should default to unknown rather than incrementally grow a JavaScript grammar. The assignment guard is an appropriately small rule.

The `with` statement is not an additional supported-binding finding: the actual runtime program uses strict mode, where `with` is invalid. Broader dangling-input validation, runtime expression repair and executing expressions during import remain outside scope.

### Diagnostics

The error identifies external step ID, label and offending root, and offers an explicitly illustrative nested form. For repeated inputs, release/PR guidance should show `queries_0|input2` becoming `inputs.queries[0].input2` rather than imply simple pipe splitting. This is documentation guidance, not a requirement to guess rewrites inside the manager.

### File-size criterion

No file moves from below 1,000 lines to above 1,000. The final new analyzer is 257 lines and unit test 21 lines. The manager grows from 2,802 to 2,819, and the existing API test module from 11,876 to 12,017. Both existing files are already large, but the new behavior remains one contiguous loading boundary and uses established upload/download helpers. This change does not justify restructuring unrelated infrastructure.

### Evidence

Reviewed `origin/dev...HEAD` and the final uncommitted recovery diff, client analyzer, unchanged shared YAML/symlink, adjacent manager loader, unit/API coverage, release note and recovered implementation debrief. Repository search confirms the removed API has no callers. `git diff --check` passes. Direct Python reproduction confirms quoted arrow text retains the forbidden path and assignment yields unknown. Strict-mode Node confirmed rebinding behavior. The test-challenge author/parent reports 29 targeted tests passed (28 API cases and shared-spec unit test), and all 16 allowed expressions evaluate true through Galaxy's actual evaluator. The follow-up normal review and scope evaluation are recorded separately for handoff.
