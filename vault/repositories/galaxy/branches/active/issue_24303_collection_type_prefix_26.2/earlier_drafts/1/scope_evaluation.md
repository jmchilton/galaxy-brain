# Scope evaluation: #24303 `type_prefix` (+ replaces #24190)

**Recommendation: EXPAND (modest).** Keep everything that's implemented and add two small fixes in code the branch already touches:

1. **Subworkflow export over-prepend.** Fix the over-prepend in `WorkflowContentsManager._resolve_collection_type` (path 4 of the queued `type_source_direct_match_before_map_over.md`).
   - This is new evidence: the bug was confirmed by a probe on this branch (galaxy-brain `3a2e515c`, 20:45), after John deferred the resolution-order issue (`36be9862`, 19:14).
   - It's a double-counted map-over, not the runtime "direct match before map-over" ordering John deferred. It touches the editor export only, so it has none of the DB-op-tool blast radius.
   - It breaks this branch's headline case: a mapped prefixed output inside a subworkflow exports `list:list:list:paired`; it should be `list:list:paired`. The issue's stated outcome is "all consumers see the same type".
2. **Legacy `<output type="collection" collection_type_prefix=…>`.** Fix it, or drop it.
   - The branch adds this spelling to the XSD and the parser remap. But the remap sets `attrib["type"] = unicodify(None)`, and lxml raises `TypeError` on that. A `type_source` output normally has no `collection_type`, so the new spelling fails to load in its normal use.
   - No test covers it. Either guard the `None` assignments (a 2-line fix plus a red test) or remove the legacy spelling from the XSD and parser.

Everything else stays deferred as queued. John's decisions hold: base 26.2, replaces #24190, Nest 1.1.0 alongside 1.0.0, `sample_sheet` normalization, parser-only, 26.2 lint gate, and resolution order handled separately.

## Possible Decompositions

The branch is about 1,750 non-generated lines (1,955 total, minus the two `schema.ts` files and the generated `collection_semantics.md`); about 1,110 of those are tests. These constraints apply to every option:
- The baseline commit `2e0c137cfe9` lands first.
- The server `get_all_outputs` commit lands before the client commit that reads `collection_type_prefix`.
- Nest 1.1.0 needs the whole `type_prefix` feature.
- The `get_collection()` mapped-slice fix in `NestTool` is a separable fix for an existing bug, and it applies to 1.0.0 too.

**A. Two PRs (feature, then Nest)**

| PR | Contents |
| --- | --- |
| 1 | Baseline + parser/lint + runtime helper + workflow server + editor + test tool + framework tests + collection_semantics "Output Collection Types" (about 1,150 lines) |
| 2 | bernt-matthias's cherry-pick + Nest 1.1.0 + Nest API/framework tests + Nest semantics example (about 600 lines) |

**B. Three PRs (Nest bug fix split out)**

| PR | Contents |
| --- | --- |
| 1 | Baseline + `NestTool` `get_collection()` slice fix + `test_nest_map_over_list_of_pairs` (1.0.0). Could go to an older release. |
| 2 | `type_prefix` feature (as in A1) |
| 3 | Nest 1.1.0 (as in A2) |

**C. Four PRs (server and client split)**

| PR | Contents |
| --- | --- |
| 1 | Baseline |
| 2 | Parser, XSD, lint, runtime helper, test tool, API tests (the tool-runtime half) |
| 3 | Workflow server `get_all_outputs` + subworkflow export + editor terminal + vitest + framework workflow tests + semantics docs |
| 4 | Nest 1.1.0 |

**D. Single PR (as implemented)**

One PR, the way #24303 frames it ("Nest is the motivating consumer"). This is the easiest story for reviewers, but it's large.

---

## Scope: As implemented

The branch adds `type_prefix` on `type_source` outputs. It covers the parser, XSD, lint, runtime (non-mapped and mapped precompute), workflow server, editor and docs. `sample_sheet*` is normalized to `list*`. It also adds Nest 1.1.0 (`list,list:paired`, prefix `list`), keeps 1.0.0, and fixes the mapped-slice bug for both Nest versions.

| Pros | Cons |
| --- | --- |
| Meets every outcome #24303 asks for, and every test it proposes | Subworkflow export is still wrong for mapped prefixed outputs (path 4), against the issue's "all consumers agree" goal |
| Matches John's decisions exactly | The legacy `collection_type_prefix` spelling ships broken |
| Reuses `CollectionTypeDescription` (`multiply`/`append`), with one shared helper | Large for a release branch (about 1,750 lines) |
| Gives #24190 a home on 26.2 with credit kept | 26.0/26.1 don't get the Nest fix |

## Scope: Modest expansion (recommended)

As implemented, plus:
- **Over-prepend fix.** In `_resolve_collection_type`, apply the step map-over to the *sliced* upstream type rather than the full upstream type.
- **Legacy remap fix.** Guard the `None` attribute assignments in the legacy `<output type="collection">` remap, or drop the legacy prefix spelling.

| Pros | Cons |
| --- | --- |
| Both fixes are in functions the branch already edits | The over-prepend fix is part of a queued issue John chose to file separately |
| The over-prepend fix is editor-only, with no runtime behavior change | `get_step_map_over` returns the step-wide maximum map-over. Stripping it is right only when the `type_source` input drives the map-over, so this needs a multi-input test |
| The over-prepend bug was confirmed after the deferral | Adds a few dozen lines, plus an API test in `test_workflows.py` |
| The legacy fix is about 2 lines plus a red parse test, and turns shipped-but-dead syntax into working syntax | |

<details><summary>Details</summary>

- **Over-prepend.**
  - The current code copies the full upstream `collection_type`, then prepends `map_over`. For a `list:list:paired` upstream connected to an input that accepts `list:paired`, it gives `list:list:list:paired`.
  - The fix: when the `type_source` input itself is mapped, resolve against the subcollection, which is the upstream type with the map-over prefix removed. The queued issue file should then drop path 4, or mark it fixed by #24303.
  - Red test: extend `test_export_editor_subworkflow_collection_type_source` with a mapped input.
  - Same bug without a prefix, so plain `type_source` subworkflow export gets fixed too.
- **Legacy remap.** In `xml.py`, the `out_child.attrib["type"] = unicodify(out_child.get("collection_type"))` line already existed on base. It breaks any legacy collection output that has no `collection_type`.
  - Option 1, guard: set each attribute only if it is present. This also fixes legacy plain `collection_type_source`.
  - Option 2, contract: remove `collection_type_prefix` from the XSD `Output` element and from the remap.
  - No in-tree tool uses the legacy collection form.

</details>

## Scope: Full `type_source` resolution unification (queued issue, all four paths)

Use one resolution rule (direct match first, then map-over) in `create_collection`, `tool_output_to_structure`, the editor and the subworkflow export.

| Pros | Cons |
| --- | --- |
| Fixes the root inconsistency that `type_prefix` inherits | John explicitly deferred it to a separate issue |
| The natural extension point is the shared helper this branch adds | Changes every `type_source` DB-op tool (filter_*, relabel, sort, tag, merge, harmonize), so each needs an audit |
| | Needs an editor design decision (connected vs. declared type) |
| | Latent today: Nest 1.1.0 is unaffected |

## Scope: Mapped output over a `sample_sheet` (queued issue)

Fix `Tree.multiply` / `map_over_collection_type` so they don't produce invalid `sample_sheet:list…` outer types (raised in the phase 3 review).

| Pros | Cons |
| --- | --- |
| `type_prefix` makes this reachable for prefixed outputs | Existing bug for *every* collection output, not specific to the prefix |
| `type_description.py` is already touched | Open design question: keep `sample_sheet` metadata, or normalize to `list` |
| | Not reproduced, only read from code |

## Scope: Validate directly passed HDCA collection type in the tool API (queued issue)

`DataCollectionToolParameter.from_json` rejects a directly passed HDCA whose type the input doesn't declare.

| Pros | Cons |
| --- | --- |
| Gives Nest 1.1.0 + `paired` an earlier, clearer 400 | Unrelated code: parameter validation |
| | Back-compat risk for lax API clients |
| | The test already passes either way |

## Scope: Editor/server `sample_sheet` disagreement and failed prefix + map-over

Raised in the phase 4 and phase 5 reviews:
- The editor shows `list:list` where the server rejects a `sample_sheet` matched to a declared `list`.
- A failed prefix under map-over leaves the bare map-over type.

| Pros | Cons |
| --- | --- |
| Small editor-visible inconsistencies | Normalization (Nest review) already removed most of the `sample_sheet` disagreement |
| | The rest is the resolution-order issue (deferred) |
| | The failed-prefix case matches today's unresolved `type_source` behavior |

## Scope: YAML `type_source` `or` quirk

In `parser/yaml.py`, sibling `type_source` / `collection_type_source` use `or`, which drops `""` (raised in the phase 2 review; the prefix version was already fixed).

| Pros | Cons |
| --- | --- |
| One line, in the touched file | Cosmetic: an empty `type_source` is invalid anyway; it changes the error rather than the behavior |
| Makes the sibling consistent with the prefix code | |

Optional rider.

## Scope: `type_prefix` for `structured_like`

This is an open question in the issue.

| Pros | Cons |
| --- | --- |
| Symmetric with `type_source` | No known consumer |
| | `structured_like` resolution is separate, and has a "probably not right" comment of its own |
| | Speculative |

## Scope: Convert sample sheet transform / general type expressions

Give `convert_sample_sheet` (`sample_sheet:X` → `list:X`) a declarative type.

| Pros | Cons |
| --- | --- |
| Removes the "type_source is a lie" comment the issue cites | It's a substitution, not a prefix, so it needs a different attribute or an expression language |
| | The issue's own alternatives section defers it |

## Scope: Nest 1.1.0 accepts more `list:X` (`list:paired_or_unpaired`, `list:record`, `list:list`) or a `list:*` wildcard

| Pros | Cons |
| --- | --- |
| The prefix generalizes for free per accepted type | `list:list` triggers the deferred resolution-order bug (a `list:list` can map over `list`) |
| | There's no input wildcard; adding one is a new feature |
| | No demand: IWC only nests flat lists |

## Scope: Contract (drop Nest, ship only `type_prefix`; or Nest-only hook as in #24190)

| Pros | Cons |
| --- | --- |
| Smaller PR | Contradicts John's decision to replace #24190 here |
| | Without Nest, the feature has no in-tree consumer |
| | The hook option leaves the editor wrong, which is the bug the issue exists for |

Use the decomposition options above instead, if size is a concern.

## Scope: Other debrief follow-ups (populator `wait`, Nest 1.0.0 XML `<tests>` in CI, mapped-DCE parent fragility)

| Pros | Cons |
| --- | --- |
| Small cleanups | Test infra, or the deferred resolution-order work |
| | Nest 1.0.0 is covered by API tests |
| | Better as their own follow-ups |
