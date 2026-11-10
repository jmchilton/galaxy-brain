# Thermo-nuclear review debrief

Run via Claude Opus 5.5 at default effort.

The verdict is approve. Nothing regressed structurally. I made three small cleanups that keep behavior the same, in both repos where they apply:
- dropped the redundant `inDegree` from TS topo;
- moved the step-graph helpers into their own section and pulled the cycle wording out of the validation walk;
- removed a defensive fallback that hid the "deps only name step keys" invariant.

I left the one real code-judo move alone: a single resolved-edge index per level. It restructures validation and next-step code that predates this branch, which goes beyond #288, so it's John's call.

Heads: gxformat2 `5b962ba` (jmchilton fork), TS `1d163cf2` (origin). No messages, ordering or fixtures changed, so I didn't run the fixture sync.

Not acted on:

- **One resolved-edge index per level (scope change).**
  - Validation resolves every ref twice per level: once in `check_edge_ref` / `checkEdgeRef`, again in `_step_dependencies` / `stepDependencies`. Next-step resolves each ref again in `_collect_port_edges` and the graph.
  - All of these could share one `(consumer, in_key, ref) -> (label, port)` index.
  - A smaller version needs only validation, deps and port edges, and doesn't touch extract. It still restructures pre-existing code beyond #288.
  - Moving the `_split_source_ref` / `splitSourceRef` callers in `_walk_draft_steps` and extract onto the index would naturally go with it. That is the follow-up the normal review deferred (P3 1).
- **Two "source label" universes.** In the validation walk, `known_labels` is the inputs plus the dict steps only. `_source_labels` / `sourceLabels` also includes non-dict entries of dict-form `steps`. The difference can't affect cycles, because a non-dict step has no deps. Unifying the two would change edge-ref messages on malformed input, so it's out of this branch's motivation. It belongs with the edge-index follow-up.
- **File size.** `draft.py` went from 1187 to 1243 lines and `draft-checks.ts` from 1705 to 1748. Both were over 1k on the base, so the branch doesn't cross the line. Splitting validate, next-step and extract into separate modules is worth a follow-up, but it's a scope change.

<details><summary>Full review</summary>

**Verdict: approve.** Python and TS have the same shape, the new graph code is small and direct, and topo now reuses the shared graph instead of keeping its own copy. That removes a duplicated ref-resolution loop in both languages. Settled choices weren't relitigated (self-edges kept then stripped by topo, mutual reachability over Tarjan, reuse of existing graph utilities). The normal review already evaluated them.

## Findings acted on

1. **TS `topoOrderedSteps` kept two copies of the same state.** After the switch to `stepDependencies`, `inDegree.get(l)` always equals `deps.get(l).size`, and the loop updated both. I deleted `inDegree`: the ready test is now `deps.get(l)!.size === 0`, and placing a step only removes it from the dep sets. Python already had this shape. TS `f1eb7137`.
2. **Cycle handling was inlined in an already busy walk, and the graph helpers lived in the wrong section.**
   - The validation walk (~100 lines) had a 6-line message-building branch in its middle. It moved into `_cycle_diagnostics` / `cycleDiagnostics`, and the call site stayed in place (after outputs, before steps), so ordering is unchanged.
   - `_source_labels`, `_step_dependencies`, `_step_cycles` and `_reachable_from` (and their TS twins) sat under the `next_draft_step` heading, though validation uses them too. They moved to a new "Step graph" section after the shared iteration helpers.
   - gxformat2 `afed091`, TS `6d8ae546`.
3. **The defensive fallback in reachability hid an invariant.** `_step_dependencies` only keeps deps that are step labels, and every step label is a key. So `deps.get(label, ())` / `deps.get(label) ?? []` can never take the fallback. Both now index directly. gxformat2 `5b962ba`, TS `1d163cf2`.

## Findings not acted on

4. **Missed code-judo: one resolved-edge index (scope change).** Per level, `check_edge_ref`, `_step_dependencies` and `_collect_port_edges` each repeat the same nested loop: steps, then dict check, then `in` entries, then `_extract_source_refs`, then `resolve_source_reference`.
   - One index would remove those copies and pin a single answer to "what does this ref mean".
   - The branch didn't add a copy; it moved topo's copy into `_step_dependencies`. So this is a missed opportunity, not a regression.
   - A smaller version that leaves extract alone is possible. Migrating the extract callers of `_split_source_ref` is its natural companion, and that work is deferred.
5. **Two label universes.** Validation's `input_labels | step_out_ports.keys()` differs from `_source_labels` on non-dict dict-form steps. It isn't observable for cycles. Fold it into item 4.
6. **File size.** Both files were already over 1k lines on the base, and this branch adds about 50 lines to each.

## Checked

- gxformat2 gates after each commit: pytest (959 passed, 8 skipped), isort, ruff, flake8, black, mypy, pyrefly, flake8-docstrings.
- TS gates after each commit: `pnpm build`, `make check`, schema vitest (5169 passed).
- No fixture or expectation changes, so the synced fixtures are still byte-identical between repos.
- No security concerns.

</details>
