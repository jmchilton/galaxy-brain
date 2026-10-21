# Scope evaluation (round 2): #24303 `type_prefix` (+ replaces #24190)

**Recommendation: KEEP AS IMPLEMENTED (no scope change).** Round 1's two expansion items are both resolved:
- The subworkflow export over-prepend is fixed (`0e4b83691a0`), with API and unit tests.
- The broken legacy `<output type="collection">` prefix spelling is dropped. The new syntax no longer ships broken.

No new evidence outweighs John's decisions in `plan.md`. Everything the reviews raised since round 1 is either:
- pre-existing and unrelated to the prefix (multiple connections, last wins);
- part of the deferred resolution-order issue (the client/server slice mismatch); or
- already queued in `gx_issues/to_file/` (`legacy_output_collection_form_broken.md`, `type_source_direct_match_before_map_over.md` with path 4 marked fixed here, `mapped_output_over_sample_sheet_invalid_type.md`, `tool_api_collection_input_type_not_validated.md`).

Those are follow-ups, not reasons to park the branch.

One thing for John to weigh is a decomposition choice, not a scope change. The re-scope also changes `get_step_map_over` for *every* subworkflow editor export:
- `paired` into a `paired_or_unpaired` input, and `sample_sheet` into a `list` input, are now direct connections;
- `list:paired` into a `paired_or_unpaired` input now maps over `list`.

These are improvements, but it's a behavior change on a release branch beyond `type_prefix`. Option B below isolates it.

## Possible Decompositions

The branch has 13 commits and about 1,950 non-generated lines (2,148 total, minus the two `schema.ts` files and the generated `collection_semantics.md`); about 1,230 of those are tests. Constraints:
- The baseline `2e0c137cfe9` lands first.
- The server `get_all_outputs` commit (`95de0d86251`) lands before the client commit (`6790b3b7daa`).
- Nest 1.1.0 needs the whole `type_prefix` feature.
- The `NestTool` `get_collection()` mapped-slice fix (`5ad02f1deb8`, part) applies to 1.0.0 too.
- The subworkflow export fix (`0e4b83691a0`) also fixes plain `type_source`, but it's written on top of `_prefixed_collection_type` from `95de0d86251`.

**A. Two PRs (feature, then Nest).**

| PR | Contents |
| --- | --- |
| 1 | Baseline + parser/lint + runtime + test tool/API tests + server exposure + subworkflow export fix + editor + framework tests + semantics "Output Collection Types" (about 1,350 lines) |
| 2 | bernt-matthias's cherry-pick + Nest 1.1.0 + Nest API/framework tests + Nest semantics example (about 600 lines) |

**B. Three PRs (subworkflow export fix split out).**

| PR | Contents |
| --- | --- |
| 1 | `_input_map_over` / `get_step_map_over` on `CollectionTypeDescription` + sliced `type_source` resolution for plain `type_source`, with its API and unit tests. This is a bug fix and could target an older release; it needs a small rework to drop its `_prefixed_collection_type` dependency. |
| 2 | The `type_prefix` feature (A1 minus PR 1) |
| 3 | Nest 1.1.0 (as in A2) |

**C. Three PRs (Nest bug fix split out).**

| PR | Contents |
| --- | --- |
| 1 | Baseline + the `NestTool` `get_collection()` slice fix + `test_nest_map_over_list_of_pairs` (1.0.0). Could go to an older release. |
| 2 | The `type_prefix` feature (as in A1) |
| 3 | Nest 1.1.0 |

**D. Four PRs (B + C combined).**

| PR | Contents |
| --- | --- |
| 1 | Nest slice fix |
| 2 | Subworkflow export fix |
| 3 | `type_prefix` |
| 4 | Nest 1.1.0 |

This gives the smallest reviews but the most rebasing.

**E. Single PR (as implemented).**

This matches the issue's framing ("Nest is the motivating consumer"), but it's large for a release branch.

---

## Scope: As implemented (recommended)

The branch adds `type_prefix` on `type_source` outputs. It covers the parser, XSD (`<collection>` only), lint (profile 26.2), runtime (non-mapped and mapped precompute), workflow server, editor and `collection_semantics` docs. `sample_sheet*` is normalized to `list*`. It also includes:
- the subworkflow export map-over fix, rebuilt on `CollectionTypeDescription`;
- Nest 1.1.0 (`list,list:paired`), with 1.0.0 kept and the mapped-slice fix applied to both.

| Pros | Cons |
| --- | --- |
| Meets every outcome #24303 asks for, and every test it proposes; all consumers agree for the tested cases | Large (about 1,950 lines); see the decompositions |
| Both round 1 expansion items are done | `get_step_map_over` behavior changes for all subworkflow exports (improvements, but on a release branch) |
| Matches John's decisions; reuses `CollectionTypeDescription` | Known display mismatch: the server export gives the per-job slice, the client gives the declared accepted type (`paired` vs `paired_or_unpaired`) |
| Gives #24190 a home on 26.2 with credit kept | 26.0/26.1 don't get the Nest fix |

## Scope: Also reject the legacy `<output type="collection">` form (queued)

Replace the remap that has been broken since 20.09 with a clear load-time error, drop the legacy XSD attributes, and add a linter error.

| Pros | Cons |
| --- | --- |
| Small, in `xml.py`, which the branch touches | The branch no longer touches the legacy remap; this is unrelated cleanup |
| Turns a cryptic `TypeError` into a clear message | Removing XSD attributes is a separate, outward-facing decision |
| | It would park the branch for something with no users. Better as its own small PR |

## Scope: Full `type_source` resolution unification (queued, paths 1–3 remaining)

One rule (direct match first, then map-over) in `create_collection`, `tool_output_to_structure` and the editor client.

| Pros | Cons |
| --- | --- |
| Removes the remaining client/server mismatch | John deferred it explicitly; the round 1 reasons stand |
| The shared prefix helper is the natural extension point | Changes every `type_source` DB-op tool (filter_*, relabel, sort, tag, merge, harmonize) |
| | Needs an editor design decision (connected vs. declared type) |
| | Latent: Nest 1.1.0 is unaffected |

## Scope: Contract back to the original scope (`_alt_original_scope`)

| Pros | Cons |
| --- | --- |
| Smaller; no `get_step_map_over` behavior change | Ships the broken legacy prefix spelling |
| | Subworkflow export is wrong for mapped `type_source` outputs, against the issue's "all consumers agree" goal |
| | Undoes work John accepted |

## Scope: Other queued or minor items (unchanged since round 1)

The candidates:
- mapped output over `sample_sheet` producing an invalid type;
- validating the tool API collection input type;
- the YAML `type_source` `or` quirk;
- `type_prefix` for `structured_like`;
- a declarative `convert_sample_sheet` type;
- wider Nest 1.1.0 input types;
- the populator `wait` fix and other test-infra follow-ups.

| Pros | Cons |
| --- | --- |
| Each is small or adjacent | Round 1's reasons hold: unrelated code, speculative, or the deferred resolution-order work |
| | None has new evidence |
| | Each is queued or noted as a follow-up |

<details><summary>Details</summary>

- **Round 1 → round 2.** The expansion was implemented as recommended, with one variation: the legacy spelling was dropped rather than repaired. The re-scope review found the whole legacy form has failed to load since the 2020 lxml switch, so fixing only the prefix path would have been pointless. Dropping it is the contract option that round 1 listed.
- **`get_step_map_over` side effect.** The old string `endswith` matching mis-split `paired_or_unpaired` and `sample_sheet`. The new `accepts` / `can_map_over` split matches runtime semantics more closely. It only affects the subworkflow editor export (the display of map-over on the subworkflow step), not invocation. It's covered by unit cases in `test/unit/workflows/test_modules.py`.
- **Multiple connections, last wins.** `_resolve_collection_type` loops over `multiple` connections and keeps the last one. This is pre-existing and a `type_source` on a multi-connection input is unusual, so it's not scope.
- **Security.** No security concerns are in scope.

</details>
