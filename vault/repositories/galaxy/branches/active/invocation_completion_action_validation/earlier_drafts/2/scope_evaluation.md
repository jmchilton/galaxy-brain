Recommend **EXPAND** modestly: validate registered completion actions’ immediately checkable configuration before history/invocation creation, starting with the export hook’s required object and nonempty string `target_uri`. Keep validation hook-owned, preserving plugin extensibility, config-free notification actions, existing export format fallback, and deferred destination resolution. This supersedes the prior keep recommendation under the revised scope policy.

## As implemented: registered action names

Reject unknown action names through the shared discovered registry before creating run configurations. This covers misspelled names while equally unusable known-export configurations still pass submission.

| Pros | Cons |
| --- | --- |
| • Direct, small guard.<br>• Real plugin discovery preserved.<br>• Existing controls pass. | • Missing required export URI is skipped later.<br>• Non-object export config can fail at execution.<br>• Submitted action contract only partially checked. |

## Recommended: hook-owned required configuration

Add a backward-compatible default no-op `validate_config` method on the hook base and call it through registered hook instances before run-config construction. Export overrides reject null/non-object config and missing/empty/non-string `target_uri`; leave other existing export option semantics intact.

| Pros | Cons |
| --- | --- |
| • Repairs the adjacent submission gap at the same boundary.<br>• Plugins own their configuration contract.<br>• Small reusable hook interface. | • Unusable exports previously accepted now get 400.<br>• Adds a hook-author method.<br>• Needs new negative API coverage and positive controls. |

<details>
<summary>Concrete implementation and validation boundary</summary>

`schema/workflows.py` documents `target_uri` as required but configurations remain `Any`. `completion_hooks/export.py` skips missing/falsy URI and calls `.get` on truthy malformed configs. The same early guard should reject these guaranteed-invalid shapes.

Validation must stay pure: no file-source lookup, access lookup, destination I/O, export tracking or execution at submission. Use default no-op rather than a new abstract requirement so existing/custom plugins load unchanged. Preserve notification `{}` and `None`, valid export configuration, unknown-name diagnostics, and export’s existing unrecognized-format fallback to `rocrate.zip`. Do not rewrite configurations.

Add API regressions for null/non-object export config and missing/empty/non-string URI, checking 400 and no new history/invocation; retain unknown-name, valid export, notification and no-action controls. Test the hook extension default/override contract where appropriate, then rerun completion units and independent normal review.

Prior normal, challenge and quality reviews expressly deferred hook payload validation; the strengthening review called it outside the previous agreement. The revised scope policy now explicitly favors this small adjacent generalization. Existing review evidence supports original wiring/name validation but does not validate the expansion.

</details>

## Broader option: fully typed configuration and live destination checks

Model every option and validate available file sources/access at submission, sharing full execution schemas. This requires compatibility and lifecycle decisions beyond obviously invalid required fields.

| Pros | Cons |
| --- | --- |
| • More complete feedback.<br>• Shared schema could simplify execution. | • Risks changing format fallback/coercion behavior.<br>• Destination state changes before completion.<br>• More context and integration coverage required. |

## Adjacent alternative: repeated-action semantics

The monitor queues every submitted name but export retrieves the first matching configuration. Deciding reject/deduplicate/execute-each is a separate API/execution contract rather than required-configuration validation.

| Pros | Cons |
| --- | --- |
| • Resolves neighboring ambiguity.<br>• Could prevent redundant tasks. | • Requires explicit repeat-action policy.<br>• Changes execution/scheduling semantics. |

## Contracted option: fixed schema action enum

Replace registry lookup with built-in names in the schema.

| Pros | Cons |
| --- | --- |
| • Smaller static validation. | • Rejects third-party hooks.<br>• Duplicates registry knowledge.<br>• Leaves bad export configurations accepted. |

Read head `163b1b36f6f44bd9bae875f7fa396921fffa483e`, current implementation/review/polish notes, request schema, registry/base/built-in hooks, completion monitor and API controls. This is a scope assessment, not new runtime evidence.
