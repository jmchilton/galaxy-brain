Run via Opus 5.5 at high effort.

Reviewed both `issue_215_draft_port_edges` branches. Acted on the wrong docs sentence, the `default: null` slip-through, the overclaimed "only place", the stale API docs and the test gaps. The ordering gaps it found (`$link`, cycles) predate this branch and stay as follow-ups.

Not acted on:

- `$link` connections aren't edges to the draft walkers (ordering, `check_edge_ref`, and now `consumed by`). Pre-existing, 0 of 189 real drafts use one, and fixing it means a shared step-edges helper across three call sites in two repos. Follow-up.
- Cycles validate as `draft valid`, and two comments wrongly say validation reports them. Pre-existing. Follow-up; the guide now says "cycles aside".
- A TODO-named output declared only on an embedded `GalaxyUserTool` emits no work item. Pre-existing and contrived.
- A slash-containing workflow input label that collides with a step port gives a false consumer. Same resolver behavior as the existing output index, and pathological.
- Survey count from the issue: left out deliberately; see [implementation debrief](../implementation_debrief.md).
- Taste: keeping `sourced from` duplicates as declared (order and multiplicity matter in a merge), and Python's two `setdefault` chains (one line each).

<details><summary>Full review</summary>

**Verdict:** the code does what the issue asks; no Python/TS divergence in the changed logic across about 60 hand cases and 40,000 fuzzed drafts.

1. (medium) `docs/guide/draft-format.md`: "Renaming a port only replaces a key" is false for out ports. Renaming `TODO_mid` without updating `second` fails validation with `references unknown port`. Fixed.
2. (medium) `$link` connections are missing from `consumed by` and from ordering: `aaa` with `state: {input1: {$link: zzz/TODO_m}}` validates and is offered before `zzz`. Latent; 0 of 189 real drafts contain one.
3. (medium) Cycles validate as `draft valid`, so "a step isn't offered while an upstream step still has work" is false for them. A property test over 4,794 valid random DAG drafts found 0 ordering violations.
4. (low) `TODO_x: {default: null}` passes and reads `no source: default value`. Fixed.
5. (low) A TODO-named output on an embedded `GalaxyUserTool` yields no out item, so a consumer could be offered with a TODO source.
6. (low) "The only place" overclaims; `gxwf mermaid` also shows the edge. Fixed in the guide; the first commit messages keep the wording.
7. (low) `docs/packages/schema.md` lacked the new rule. Fixed.
8. (low) A workflow input labeled `first/TODO_m` alongside step `first` with out `TODO_m` gives a false consumer.

Test gaps: slash labels, dedupe, `source: null` and a CLI end-to-end test were unasserted. Added. Subworkflow consumer scoping was run by hand and is correct, but stays unasserted.

Other consumers: no code in either repo parses the work strings, and nothing relies on `TODO_x: {}` validating. Across 208 real drafts the only rejection is the deliberately bad example quoted in the vault's #668 note. gxwf-web and the VS Code extension have no separate checkout here and weren't checked beyond this repo's `gxwf-web` packages.

Merge order: gxformat2 first, or a later `make sync` from its `main` would drop the TS fixtures.

</details>
