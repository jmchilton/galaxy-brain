Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review: issue-781-plan-state-resolved-args

I reviewed `39522711` against `origin/main` `df991d0d`, covering the authored Mold and research Markdown only. Casts are generated, so I didn't review them. The branch changes no authored code (0 lines). Verdict: the structure is acceptable for this branch. Its biggest weakness is that three LLM-judged Molds re-derive Nextflow config semantics that `summarize-nextflow` owns. That is the follow-up below, and it doesn't block. Fixes are in one commit on top of `39522711`: `dbca2bc5`, pushed to `jmchilton`.

## Acted on

- **Rule restatement in implement.** implement's **Source arguments** paragraph restated the ledger's disposition list and its precedence/override rule. The ledger is loaded `upfront` + `verbatim` anyway, so a rule change meant edits in 4+ places. The paragraph now keeps only what's local to implement:
  - bind the effective entries' flags the wrapper can express;
  - drop a flag rather than approximate it, citing `parsed_tool`;
  - record every entry per the ledger, which also says which entry takes effect.
- **Dead defensive branch.** I deleted implement's "an entry whose selector names a different call than `invoked_as` gets `not_applicable`". The template's contract and eval already exclude those entries, so the line kept unsupported input alive as a third disposition path.
- **Tie rule.** The rule was ambiguous and had its own shape. "Record both as usual" didn't say what `state` binds when the tied entries conflict (`-F12` vs `-F4`). The extra tie entry was a plain entry with a top-level `step`, the one flag record that broke the "flag records name their step only in `source_arg`" rule. Now:
  - tied entries are all effective;
  - a flag they all set the same way is recorded as usual;
  - any other tied flag is an open gap with `source_arg`, whose `missing` names each tied entry's `selector` + `config`, and it stays out of `state`.

  This reuses the existing `gap` kind ("the source pinned no value"), drops the special shape, and makes "each flag of an effective entry has one record" uniform. Implement's eval was updated to match.
- **Eval discrimination.** The tie rule had no scenario. I added an implement case where the same `withName:SAMTOOLS_VIEW_MAP_MAP` sits in two configs with `-F12` / `-F4`. It fails on base, and also fails for a Mold that binds either tied `-F` value.
- **Wording collision.** The advance eval's "a record … for every carried entry" collided with `disposition: carried`. It now reads "every entry `_plan_state` listed". Advance step 1's "carry … forward" is now "keep".
- **`flags` omission was implicit.** It was implied by "a whole `ext.prefix` is one flag" plus a YAML comment. The rule now says it outright: a prefix record and an overridden-entry record omit `flags`.
- **Canonical dropped example.** Its `because` was a bare placeholder, which breaks the citation rule the example illustrates. It now shows the citation's shape (`parsed_tool` for the wrapper and version, inputs quoted). I didn't assert a real wrapper gap, because I didn't verify one.

## Not acted on

- **Lead finding: the precedence ranking belongs in `summarize-nextflow` (follow-up, not blocking).** Several pieces exist only because `attachConfigDirectives` (`packages/summarize-nextflow/src/resolver.ts`) matches selectors per process but never ranks them per call, and gives no entry a stable id:
  - the precedence rule;
  - the overridden-entry `not_applicable` records;
  - the tie rule;
  - Codex's open profile-vs-root question;
  - the 7-field `source_arg` join key.

  Nextflow's ranking is deterministic, and the resolver already sees aliases, labels, subworkflows, configs and profiles. If the summary emitted, per call, the effective entry for each `key` (and flagged real ties), plus an id per `resolved_args` entry:
  - the template would copy only effective entries;
  - implement would never rank;
  - the override records would disappear;
  - `source_arg` would shrink to `{step, arg, flags?}`.

  It isn't done here because it changes the `summary-nextflow` schema under a 4-branch stack whose children join on today's `source_arg`. Draft issue below.
- **Template Resolved-step branch has no scenario.** That's the template binding flags and writing dispositions itself. The eval property covers it. A scenario would need a pattern-covered nf-core step with `resolved_args`, and I didn't find one I could cite without building a draft. Optional.
- **Top-level `step` exception in the protocol** ("except for a flag record"). It is a special case, but `source_arg` is the join key and `step` is part of it. Keeping it also keeps #796's removed-step check simple, so I left it.
- **Ledger vocabulary.** Earlier reviews settled this, and I agree: `decisions` + `kind: dropped` + now `gap` are all existing kinds. `source_arg` and `disposition` are the only new fields.
- **File sizes.** All touched authored files stay well under 1k lines: ledger 280, template 224, advance 191, implement 173.

## Draft follow-up issue (not filed)

Target: `galaxyproject/foundry`.

> **summarize-nextflow: rank `resolved_args` per call**
>
> `resolved_args` lists every `withName` / `withLabel` assignment matching a process, unranked and keyed by nothing. The draft Molds therefore re-derive Nextflow's selector priority in prose: withLabel < withName(process) < withName(alias) < fully qualified. They also give each overridden entry its own ledger record, treat same-rank ties as open gaps, and join ledger records on a 7-field `source_arg`. Proposal: give each entry a stable `id` and emit, per call (`invoked_as`), the effective entry per `key`, with `tie: true` when two entries share the top rank. Settle profile-vs-root order while doing it. The ledger's precedence, override and tie rules then collapse, and `source_arg` becomes `{step, arg, flags?}`.

<details>
<summary>Full review</summary>

Scope:
- the content diff of the three Molds (index, eval, scenarios), template `refinement.md`, the ledger's **Source arguments** section and protocol line, and the draft-format note;
- `resolver.ts`: `attachConfigDirectives`, `collectScopedSelectors`, `selectorMatchesProcess`;
- the earlier normal and Codex reviews.

1. **Structural, missed simplification:** ranking lives in prose instead of the resolver. See the lead finding. The resolver emits root-chain entries in BFS include order and then profile entries, so not even order encodes precedence. The prose rule is the only one.
2. **Spaghetti, tie rule:**
   - It had two problems: the rule was ambiguous, and its record shape broke the flag-record convention. Fixed.
   - The resulting set of record kinds is carried / not_applicable / dropped / gap, all per flag and all keyed by `source_arg`. Before, there was a fifth kind, a plain step entry.
3. **Duplication:** implement's restatement of ledger mechanics went against the ledger's own "a Mold's page states only what is local to it" rule. Fixed. I kept the evals' explicit clauses (one record per flag, one per overridden entry, no top-level `step`), because judges may not load the ledger. Those clauses are what makes the evals discriminate.
4. **Dead branch:** the defensive different-alias line. Fixed by deletion.
5. **Testability:**
   - The red→green for every property is by construction: base Molds never read `resolved_args`.
   - The tie scenario and the alias-override scenario each fail under a Mold that binds every entry it sees.
   - The bamtofastq scenarios pin real values.
   - No deterministic fixture exists, and building a full draft isn't proportionate, as the debrief already argued.
6. **Wording collision:** "carried" was both a verb and a disposition value. Fixed in the advance eval and advance step 1.
7. **Minor, not acted:** the template's eval property is long, but each clause is checkable, so I left it.

Gate after fixes: `make -k check` is green except the known `validate-roadmap` (#803/#805 live drift) and `check-vendored`. 496 tests pass.

</details>
