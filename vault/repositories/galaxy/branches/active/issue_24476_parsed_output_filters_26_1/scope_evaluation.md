Recommendation: retain the implemented scope; no expansion or contraction is needed. It already generalizes #24476 to every parsed output variant that supports XML filters and updates the Tool Shed client contract without changing tool authoring or execution.

## Possible Decompositions

The branch changes 103 non-generated lines counting additions and removals, including its baseline tests. It can be presented as two ordered units: (1) the existing passing baseline XML-parsing and user-tool rejection tests, then (2) the parsed-output metadata fix, regression tests, and generated Tool Shed types together. These units already have separate commits; splitting the second unit further would separate a public model change from its conversion or client contract.

## As implemented: preserve filters across all parsed outputs

Expose ordered expression strings on parsed data, collection, integer, float, boolean, and text outputs, using one parsed-only base and one conversion property. Keep empty lists for unconditional outputs, regenerate the six Tool Shed output types, and preserve the incoming authoring models. This covers the issue's data/collection examples and the same supported feature in the scalar sibling path.

| Pros | Cons |
| --- | --- |
| • Repairs all three conversion paths consistently.<br>• Gives consumers the conditions and their order.<br>• Keeps one unconditional representation and compatible defaults.<br>• Includes the generated consumer contract. | • Consumers still need the updated deployment and their own schema resync.<br>• Raw expressions are metadata, so consumers must decide how to use them. |

## Contract to data and collection outputs only

Implement only the two examples named in the issue, leaving the existing scalar conversion unchanged. This would remove a few inheritance changes and the four scalar regression cases.

| Pros | Cons |
| --- | --- |
| • Slightly smaller diff matching the issue's initial example set. | • Leaves the identical filter-loss bug for four supported output variants.<br>• Makes the public parsed-output contract inconsistent.<br>• Discards the useful modest generalization already implemented. |

## Expand with a derived conditional flag or filter evaluator

Add a boolean convenience field or input-aware evaluation alongside the raw expressions. The issue considers a boolean alternative, but its stated requirement is to retain the expressions so consumers can reason about the condition; no existing caller or proposed shared evaluator is part of this request.

| Pros | Cons |
| --- | --- |
| • A flag can simplify consumers that only need a warning.<br>• Evaluation could help a future consumer predict concrete output availability. | • A flag duplicates whether the filter list is nonempty.<br>• Evaluation introduces a separate runtime contract and input-context semantics.<br>• Neither closes another loss path in the touched conversion code. |

## Expand into authoring, execution, or output-model restructuring

Add YAML/UDT filter authoring, change runtime filtering, or redesign the broader output hierarchy and nested-element metadata. XML parsing already keeps the expressions and execution already uses them; this issue is the loss at model conversion. The reviews found no independent structural change or adjacent behavior defect needing repair here.

| Pros | Cons |
| --- | --- |
| • Could support separate future authoring or metadata features. | • Changes contracts beyond preserving existing parsed information.<br>• Broad hierarchy work would add migration without simplifying this fix.<br>• UDT authoring expansion contradicts the issue's explicit boundary. |

## Expand into external consumers and deployment

Resync galaxy-tool-util-ts and surface filters in galaxy-tool-cache, after the Galaxy schema is released and the serving Tool Shed is deployed. That is necessary for those consumers to benefit, but it is a dependent delivery task in another repository rather than a missing part of this Galaxy change.

| Pros | Cons |
| --- | --- |
| • Completes the end-to-end consumer rollout. | • Depends on the published Galaxy schema and service deployment.<br>• Does not require additional Galaxy implementation in this branch. |

The normal, test-challenge, code-quality, and baseline-history reviews requested no scope changes. Keep release_26.1 as the upstream target; the recommendation rests on complete coverage of the existing serialization boundary, rather than on release-branch conservatism.
