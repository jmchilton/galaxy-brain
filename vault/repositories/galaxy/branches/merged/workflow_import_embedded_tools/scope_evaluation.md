Retain the scope as implemented; no expansion or contraction is recommended. The branch already generalizes issue #24471 beyond the reported embedded user-tool case to the sibling admin dynamic-tool path, shares one resolver with standalone module construction, and applies the ordering guarantee recursively through existing subworkflow loading.

## Possible Decompositions

The existing commits provide a possible landing sequence: (1) the two passing baseline import cases, (2) the behavior-preserving embedded-tool resolver extraction, and (3) the dependency pre-pass with user/admin regression coverage and its transaction-side-effect documentation. Alternatively, baseline tests could land first and the extraction plus fix could land together. The user/admin regression cases belong with the ordering change because they fail on the base implementation; this describes possible splits for John without recommending one.

## As implemented: resolve embedded tool dependencies before steps

Preload both user and admin embedded definitions before parent step construction, using the same permission and ownership policy that standalone module callers use. Existing recursive workflow loading supplies the same lifecycle boundary for embedded subworkflows. This addresses the shared cause of the output and PJA failures rather than only the two known association cascades.

| Pros | Cons |
| --- | --- |
| • Covers the reported cases and the confirmed admin sibling bug.<br>• Reuses the importer’s dependency phase and the module’s existing resolution policy.<br>• Behavioral tests cover retained metadata and connections. | • A user-tool definition receives an additional ownership lookup/materialization during module construction.<br>• Tool creation retains its existing independent commits. |

## Contract to embedded user tools only

Limit the pre-pass and tests to `GalaxyUserTool`, leaving admin dynamic-tool creation in the step-building phase. This would omit a confirmed occurrence of the same database ordering defect even though the existing resolver already contains both creation paths.

| Pros | Cons |
| --- | --- |
| • Slightly fewer regression fixtures. | • Leaves the same failure in the directly adjacent admin path.<br>• Splits one lifecycle rule by tool class without a meaningful behavioral distinction. |

## Expand to atomic import transactions and write-free dry runs

Replace tool-manager commits during imports with transaction-aware creation and define rollback and dry-run behavior for all embedded dependencies. The current fix intentionally preserves the existing standalone tool-creation contract; the reviews found no new requirement that invalid later workflow content must roll back previously created tools.

| Pros | Cons |
| --- | --- |
| • Could make failed imports and dry builds leave no tool rows.<br>• Would establish a broader transaction policy. | • Requires new contracts across workflow, subworkflow and tool-manager callers.<br>• Changes pre-existing semantics rather than extending the ordering guarantee.<br>• No demonstrated remaining import failure requires it. |

## Expand to lookup optimization or a typed workflow-step boundary

Eliminate repeated user-tool materialization with cached resolution or a pre-resolved module mode, or introduce a typed representation for the resolver’s step dictionary. Normal and quality reviews considered these ideas and found neither necessary for this bug; the shared resolver and documented commit side effect already provide the reusable abstraction.

| Pros | Cons |
| --- | --- |
| • Could reduce work on large embedded-tool imports.<br>• A broader typed boundary could clarify future importer changes. | • No measured performance regression warrants a cache or lifecycle mode here.<br>• Trusted-resolution flags would introduce another ownership-sensitive path.<br>• A new step model for one helper would compete with the surrounding dictionary API. |

## Replace the pre-pass with deferred output/PJA persistence

Delay adding the two association types that currently cascade incomplete steps into the session. This could reduce the immediate diff, but would make the fix depend on knowing every association that can attach a step before tool creation commits.

| Pros | Cons |
| --- | --- |
| • Potentially smaller local persistence edit. | • Treats the observed triggers instead of the shared dependency lifecycle.<br>• A new association cascade could restore the failure.<br>• Would discard the already-tested general user/admin resolution boundary. |

No scope decision is needed from John. This evaluation reviewed scope only; it made no code, test, or Git changes and relies on the completed correctness and test-challenge reviews for validation evidence.
