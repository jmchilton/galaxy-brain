Fix 🎯 #1759 - verify expression.json collection elements against their downloaded content instead of crashing on parsed JSON values.

A skipped mapped workflow step can produce a collection of expression.json datasets containing `null`. A `has_text` assertion for the literal text `"null"` currently aborts with `TypeError: 'NoneType' object is not subscriptable`. The same problem affects other JSON values. This change keeps each downloaded file available for collection assertions; passing assertions succeed and mismatches become ordinary output problems.

**This fixes Planemo's Galaxy collection assertion adapter; Galaxy's intentional CWL value conversion stays unchanged.** Collection nesting follows Galaxy element metadata, so a JSON array is verified as one dataset rather than mistaken for a nested collection.

**Coverage uses the real galaxy-tool-util converter and verifier with mocked metadata/downloads; no live Galaxy workflow was run.** Tests cover null, boolean, number, string, array and object content, flat and nested collections, unchanged CWL values, malformed element diagnostics, and mixed expression/ordinary datasets. Before the fix, 12 Galaxy regression cases failed while the 12 CWL cases passed. Afterward, all 43 related tests pass. `make lint` passes.

## Risks

Risks are minimal: this is a reversible change to output collection and assertion handling, with no persisted data migration. Top-level expression output behavior is unchanged.

## Context

The root cause is Planemo discarding downloaded file properties while adapting CWL-converted collection outputs to Galaxy file assertions. No upstream Galaxy change or new dependency release is required.

## Agentic Checks

### ✅ Normal review

<details><summary>No blocking findings; the suggested mixed dataset regression was added.</summary>

Reviewed ownership, file attachment, nested collections, CWL compatibility and malformed-element handling.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers or scope change recommendations.</summary>

Reviewed the adapter boundary and dataset map; independently verified the 43 related tests.

</details>
