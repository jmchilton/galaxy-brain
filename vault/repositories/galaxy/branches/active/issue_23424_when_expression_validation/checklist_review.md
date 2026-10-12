# Polishing checklist review — 2026-10-12

Reviewed `d47f83c407c71649356c27065ea80e9ee360c531` against `origin/dev` (`9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`), all six changed files, the unchanged shared client specification, adjacent step loading, and implementation, test-challenge, normal-review, thermo-nuclear and scope debriefs. No substantive checklist failure remains. Human reading is still required before approval.

## General checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 identifies the step, label and obsolete root, with a nested-path example.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; the shared language-neutral contract is complemented by real import/update regressions.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? They explain the compatibility boundary between editor matching and strict import rejection.

<details>
<summary>General checklist evidence</summary>

`WorkflowContentsManager` raises `RequestParameterInvalidException` only for a tool step with a recognized pipe-containing root. The real HTTP import regression asserts status 400 and the text `Workflow step [1] ('gated')`, `inputs["cond|input1"]` and `inputs["cond"]["input1"]`. The editor-format update regression asserts rejection and downloads the previous expression unchanged. The guidance is explicitly an example; release notes additionally show `inputs.queries[0].input2` for the repeated connection `queries_0|input2`. No new client error display is introduced or claimed.

The six-file diff contains the loading-boundary check, isolated analyzer, symlink to an unchanged client YAML specification, shared-contract unit test, API regressions and release guidance. There are no generated bundles or unrelated refactors. `git diff --check origin/dev...HEAD` passes and the reviewed worktree is clean.

The 21-line unit test consumes independently authored client expectations for static paths and dynamic access. It checks a supported cross-language contract rather than duplicating private tokenization logic. Client-only edge matching remains outside the backend's production API. Real HTTP coverage checks observable acceptance, rejection, exact expression round trips, legal subworkflow pipe labels and failed-update persistence. The recorded targeted run passed 29 cases (28 API cases and the shared-spec unit test); the author also reproduced the primary rejection assertion on the base as an unexpected 200 instead of 400.

Comments explain current invariants: well-formed tool inputs use nested state rather than flat connection names; strict rejection requires a proved global input access; unsupported binding/literal syntax is conservative; dynamic child accesses retain a known prefix. The reference to editor permissiveness explains why the server deliberately does not port client input-to-edge policy. None recount obsolete fixes, dates or review history. The release note's migration discussion is user guidance, not comment archeology.

</details>

## Workflow-related checklist

- [x] Which existing workflows change behavior (if any)? Imports and updates using recognized obsolete flat tool-input roots now fail; stored execution semantics are unchanged.
- [x] Who hits this in practice and what is the evidence? Authors carrying removed flat aliases into tool-step conditions can silently get the wrong branch decision; #23424 and the actual evaluator reproduction establish the mechanism.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes; warnings, regex matching, full parsing, broader reference validation and editor repair were considered and bounded in the scope review.

<details>
<summary>Workflow checklist evidence and compatibility limits</summary>

A workflow with `$(inputs["cond|input1"] !== null)` on a tool step must be repaired before import or update succeeds. The supported spelling is `$(inputs.cond.input1 !== null)` or chained brackets; repeat paths require array indexing, not blind pipe splitting. Existing stored workflows are not rewritten, their invocation behavior is not changed, and no workflow schema field is added. A previously persisted broken condition can therefore continue its previous runtime behavior until the workflow is updated; this branch protects the import/update boundary.

Ordinary top-level access and extra expression inputs are preserved. A real subworkflow API fixture preserves a legitimate label containing a pipe. Fully computed accesses, local bindings/rebinding, Unicode identifiers, templates and undecoded escapes are accepted when analysis cannot prove an obsolete global root; sixteen real expressions round-trip unchanged and were separately evaluated successfully. These are deliberate detection false negatives, not a claim of complete JavaScript or reference validation. A proved flat root remains rejected alongside ordinary computed/template accesses or before a dynamic/escaped child, as five parametrized rejection cases establish.

The mechanism affects workflow authors and API clients who retained Galaxy's removed flat connection spelling in a nested conditional or repeated tool input. With nested state `cond.input1 = null`, Galaxy's actual `do_eval` returns true for `inputs["cond|input1"] !== null` but false for `inputs.cond.input1 !== null`, so the obsolete condition can run a step that should be skipped without raising an expression error. This is a concrete reproduction of the issue's mechanism, not proof that every reported workflow or JavaScript spelling is detected. The base rejection reproduction fails at the HTTP-status assertion, not on a branch-only API.

The scope evaluation considers warning-only persistence, full reference resolution, full JavaScript parsing/literal decoding, editor lint/automatic repair, runtime diagnostics, `value_from` and earlier validation placement. Warnings do not prevent silent incorrect execution and would require a usable warning channel. Raw regex matching cannot distinguish actual accesses from strings/comments/local bindings. The existing client analyzer is deliberately permissive for edge matching; strict server rejection requires a smaller conservative subset. A full parser/reference resolver would introduce broader language, tool-resolution and compatibility contracts. Editor repair and runtime diagnostics change other user contracts, and runtime errors do not reveal comparisons that silently return a boolean. The existing shared loader covers imports and updates without a schema change or new runtime repair behavior. Retaining this narrow scope is justified; the broader alternatives remain separate work.

</details>
