Recommendation: retain the scope as implemented: reject proven obsolete flat nested tool-input roots at workflow import and update, with conservative acceptance when JavaScript analysis is uncertain. The recovery fixes improve compatibility within that scope; full reference validation, full JavaScript parsing, editor repair and runtime diagnostics should remain separate work.

# Scope evaluation — 2026-10-12

Reviewed [issue #23424](https://github.com/galaxyproject/galaxy/issues/23424), the branch against `origin/dev`, the recovery changes at `d47f83c407c`, implementation/test debriefs, normal review and thermo-nuclear code-quality review findings. This evaluates motivation and scope, rather than repeating correctness or test review.

The issue is motivated by removed pipe-prefixed tool input aliases: comparisons with an undefined value can silently make a step always run or always skip. Its proposed first pass specifically rejects static obsolete spellings on tool steps; it does not promise to prove every JavaScript reference valid. The original open questions and review suggestions are considered below.

## As implemented: narrow import and update rejection

Reject a statically recognized global `inputs` root containing a pipe on a tool step, including known roots followed by child access; report the step, reference and supported nested spelling. Preserve legitimate subworkflow pipe labels and accept unsupported scopes, rebinding, Unicode identifiers, templates or undecoded literals conservatively. Apply the same rule on workflow updates, with release guidance for repeat indexing.

| Pros | Cons |
| --- | --- |
| • Prevents the common silent failure for API and editor saves.<br>• Matches the issue's explicit first-pass rule.<br>• Preserves compatibility where static analysis cannot establish a global reference. | • Does not detect every spelling or arbitrary broken condition.<br>• Old broken workflows need repair before a rejected import/update can succeed.<br>• Maintains a Python scanner alongside client analysis. |

<details>
<summary>Boundary and review implications</summary>

The compatibility fixes are necessary to the proposed scope: a strict server rejection must not apply the editor's more permissive input-matching policy to local bindings or uncertain JavaScript. Shared supported-subset cases remain useful, but complete behavioral identity between editor matching and server rejection is not an appropriate requirement. Removing the unused Python client-policy helper reduces this burden.

A known obsolete root remains rejected alongside ordinary computed access; a global dynamic flag alone is not a reason to discard that root. Conversely, syntax that could change binding meaning is accepted when the scanner cannot prove the reference. This is deliberately incomplete detection, rather than a claim to validate all references.

The issue also identifies a degenerate tool connection whose parameter is not exposed by the tool and whose flat spelling can survive in runtime state. Supporting malformed/unloadable tool state through full connection resolution would be another scope, below; the first-pass rule is for well-formed tool inputs.

</details>

## Contract to warning-only imports and updates

Detect the same obsolete spellings but allow persistence with a warning. This addresses the original concern that blocking makes already-broken stored workflows harder to re-import, provided Galaxy gains a warning channel that API clients can actually consume.

| Pros | Cons |
| --- | --- |
| • Reduces migration friction for existing workflows.<br>• Allows repair after import. | • Still permits silently wrong execution.<br>• Requires a usable warning contract and client handling.<br>• Weakens the protection requested by the issue. |

Recommendation: do not contract. An unnoticed warning does not solve the motivating silent comparison failure; existing tool upgrade messages are not an import warning channel.

## Expand to full workflow reference resolution

Resolve static paths against loaded tool state, real connections and subworkflow input labels, rather than recognizing only removed pipe-prefixed tool roots. This could detect unrelated missing inputs and distinguish malformed or unavailable tool cases, with an explicit degradation policy when the tool cannot be loaded.

| Pros | Cons |
| --- | --- |
| • Finds more broken conditions.<br>• Could align server diagnostics with editor dangling-reference lint.<br>• Addresses unusual connection/state ambiguity. | • Needs tool-state and conditional/repeat resolution.<br>• Must define behavior for missing tools and deferred state.<br>• Introduces broader compatibility rules unrelated to the removed alias. |

Recommendation: separate follow-up. The original issue explicitly considered this valuable but too broad for the first pass.

## Expand to full JavaScript parsing and literal decoding

Use a JavaScript parser and binding analysis to identify global input references through declarations, assignments, templates and escaped property names. The narrower variant would decode supported literal escapes while retaining conservative fallback for other syntax.

| Pros | Cons |
| --- | --- |
| • Detects more equivalent obsolete spellings.<br>• Can distinguish local bindings from global inputs precisely.<br>• Reduces scanner-specific syntax exclusions. | • Adds dependency, parser-version and language-policy decisions.<br>• Binding analysis goes beyond tokenization.<br>• Narrow escape decoding still needs precise JavaScript semantics. |

Recommendation: separate follow-up. Independent reviews exposed false positives; conservative fallback addresses those without requiring the completeness this expansion would promise. Replacing the scanner with a broad regex would lose necessary literal/comment distinctions; executing expressions during import would also introduce a different contract and is not warranted.

## Expand to editor lint alignment and automatic repair

Change editor dangling-reference lint to judge known paths individually even when a separate access is dynamic, and optionally offer migration from flat aliases to nested tool-state paths. Repair must account for repeats and actual tool structure rather than blindly splitting every pipe.

| Pros | Cons |
| --- | --- |
| • Makes authoring guidance more consistent with server rejection.<br>• Could help users repair workflows before a failed save.<br>• Provides a visible migration path. | • Adds client behavior and browser coverage.<br>• Generic splitting can mishandle repeats or legitimate labels.<br>• Does not cover API-only authors by itself. |

Recommendation: separate follow-up. The issue says editor lint is a complement already present in related work; repeat-path release guidance belongs here, while a repair UI does not.

## Expand to runtime diagnostics and `value_from`

Provide safely constructed runtime expression diagnostics and consider corresponding validation for `value_from` expressions. These are distinct contracts from import-time rejection of removed `when` aliases.

| Pros | Cons |
| --- | --- |
| • Improves diagnostics for other failing expressions.<br>• Extends protection to another expression entry point. | • Runtime failures do not expose silent boolean comparison failures.<br>• Adds invocation presentation and separate expression semantics.<br>• Broadens the change beyond the issue's proposed first pass. |

Recommendation: separate follow-ups. Improving runtime messages alone cannot fix the motivating case because those comparisons do not raise.

## Relocate validation to an earlier workflow walk

Perform the same narrow check in the pre-construction workflow traversal instead of alongside resolved step validation. This is an integration alternative rather than an expansion of the user-facing feature.

| Pros | Cons |
| --- | --- |
| • Could reject before step objects are constructed. | • Must infer type from raw dictionaries.<br>• Moves the rule away from resolved step validation.<br>• Requires evidence of a lifecycle problem to justify the refactor. |

Recommendation: retain the current integration point. The original question merits consideration, but the reviewed import/update behavior provides no scope reason to relocate it. The quality review also considered extracting the already-large manager/test files: restructuring existing loading and upload helpers is unrelated to this contiguous change and should stay outside the branch.
