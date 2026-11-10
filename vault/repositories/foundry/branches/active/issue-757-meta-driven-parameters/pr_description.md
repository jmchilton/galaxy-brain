Fix 🎯 #757 - the channel-shape note gives no route for a per-sample value, computed into `meta`, that parameterizes that sample's later steps.

Galaxy already gives each element of a mapped step its own parameter, read from that element's file. The new verification workflow shows it:

| Case | Element | Its value | Job that ran |
|---|---|---|---|
| Values in data order | `a` | 1 | `head -n 1` |
| | `b` | 3 | `head -n 3` |
| Values in reversed order | `a` | 3 (`b`'s) | `head -n 3` |
| | `b` | 1 (`a`'s) | `head -n 1` |
| A `select` (`Cut1` delimiter) | `a` | `C` | `cutWrapper.pl … C` |
| | `b` | `D` | `cutWrapper.pl … D` |

```text
per-element values (list) ──> param_value_from_file (mapped) ──> integer_param ──┐
                                                                                 ▼
reads (list) ──────────────────────────────────────────> Show beginning1 (mapped, lineNum)
```

The first case is the route. The second shows that Galaxy pairs the two collections by position, not by identifier, so the values have to come out of a step mapped over the data collection, or be reordered to match it.

nf-core does this. A process computes a value per sample, writes it into `meta`, and a later process reads it as a tool argument. nf-core/rnaseq's `strandedness: auto` path does this with `meta.strandedness`. The note's `val(meta)` row stopped at "parameters", so a run had nothing to follow and invented a run-once-and-re-run substitute (#674).

***#674 proposed one workflow-level value as the rule. This PR keeps it as the last fallback, because its premise, that a mapped step takes one parameter value for the whole collection, is false.***

***This PR changes the research note, one Mold reference trigger, and verification fixtures. It doesn't settle whether a tool conditional's test parameter accepts a mapped connection. The note marks that target as Open and links #661 and #667.***

- **Route.** A new section, "Per-element parameters from `meta`", says to map `param_value_from_file` over a value collection and connect its typed output to the target parameter. It also says how to choose `param_type` and how to keep the two collections in the same order (`collection_element_identifiers` plus `__SORTLIST__`). The `val(meta)` row points at the section.
- **Evidence table.** Each target is listed with its evidence and a status.
  - Verified: integer, `select` and boolean parameters (the new fixtures), a text parameter (Galaxy's `map_over_expression` workflow test), and a per-element `when` (Galaxy's API test).
  - Wiring only: a parameter inside a conditional's case (IWC `consensus-peaks-atac-cutandrun`, where every element gets the same value).
  - Not tested: a float parameter.
  - Open: a conditional's test parameter.
- ***Fall back only for the Open target, or when a workflow test of the route fails.*** Wiring-only and Not-tested targets use the route, covered by a workflow test whose elements carry different values. rnaseq's strandedness reaches a Verified target, featureCounts' `select`, and the Open one, Salmon's `--libType`, which takes the fallback.
- **Fallback order.** The first fallback is one `when`-gated branch per value. The branches rejoin with a mapped built-in `pick_value`, never `__MERGE_COLLECTION__`, which yields one element per branch per sample (#661). Galaxy's `..._map_over_expression_tool_pick_value` API test covers that rejoin. The last resort is one workflow-level value, with a `kind: dropped` ledger entry and the computed values exposed as an output.
- **Mold trigger.** `implement-galaxy-tool-step` loads this note on demand. Its trigger now also covers wiring a per-element value into a mapped step's parameter, so the new section is reachable at that decision.

<details><summary>Verification and smaller edits</summary>

- `verification/workflows/per-element-parameter-from-file/` holds two workflows.
  - `per-element-parameter`: the workflow and test from #674's investigation, with `name:` changed to `label:` like its siblings, plus the reversed-order case.
  - `per-element-select-boolean`: text values `C` and `D` choose `Cut1`'s `select` `delimiter` per element (the jobs ran with `C` and `D`), and `true`/`false` set `wc_gnu`'s `include_header`.
  - All three cases passed on Planemo 0.75.48 against Galaxy `release_26.1`, and `planemo workflow_lint --skip best_practices` is clean. The values are passed in as a separate input, not computed from the data.
- The section writes out the `__SORTLIST__` and `pick_value` steps itself, because the three casts that bundle this note don't bundle the pattern pages it links.
- Checked against sources: Galaxy `release_26.1` (`walk_collections` indexes elements by position, plus both API tests and the workflow test), and IWC `main` (`consensus-peaks-atac-cutandrun`, steps "split min value" → "convert min nb of reads to parameter" → `samtools_view` `mode|subsample_config|subsampling_mode|target`).
- Unrelated to the new section: the note's intro no longer has its semicolon list, the evidence list cites the IWC ID instead of a local `$IWC_FORMAT2` path, and two table rows lost their semicolons. The `branch { ... }` row is untouched, because #758 covers it. `verification/README.md` now says notes other than patterns cite fixtures in prose.
- Casts and `content/Dashboard.md` were regenerated. The local `make check` targets pass, except `check-vendored`, which fails on drift in this machine's upstream checkouts, and `validate-roadmap`, which fails on unrelated issue labels (#768's sub-issue #783).

</details>

## Risks

Risks are minimal. This is a two-way door: a guidance note and a test fixture that a later edit can revise.

<details><summary>Risk Details</summary>

- The route covers targets whose rows aren't verified. A run that wires a float, or a parameter inside a conditional's case, this way relies on its own workflow test to catch a failure.
- The Open row cites two issue reports that conflict. Once #661 or #667 settles, the row and Salmon's fallback need updating.
- The first fallback's per-element boolean step ("a mapped comparison step") is described in general terms, not as a tested recipe.

</details>

<details><summary>Risk Review Advice</summary>

Check the trigger sentence: should a Wiring-only or Not-tested target use the route with a test, or take the fallback? The PR chooses the route, because missing precedent is something to record, not a reason to cut. Also check that the first fallback's rejoin advice matches what you expect from mapped `pick_value`.

</details>

## Context

Split from 🎯 #674, whose single-workflow posture landed in 🔀 #759. 🎯 #758 covers the `when` pages and the `branch { ... }` row. 🎯 #661 and 🎯 #667 own the conditional test-parameter question. 🎯 #267 is the data-shape counterpart.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>No confirmed defects, and a doc-string overclaim was fixed.</summary>

Codex said the case-1 test `doc` claimed the values were computed. They're passed in as an input, so the `doc` was reworded. It also said the text-parameter row had no Galaxy assertions behind it. That was refuted: the assertions are in `map_over_expression.gxwf-tests.yml`, which the row now cites.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-757-meta-driven-parameters/codex_review/). Run via gpt-6-sol at medium effort.

</details>

Closes #757.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
