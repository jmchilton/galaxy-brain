# Cast Convergence Plan

Converging the foundries along the **casting** axis: extract the caster into the shared
substrate *and* move its per-kind behaviour out of TypeScript literals onto the kind and
target declarations, in one migration.

Decisions taken up front (see "Decisions" at the end for the reasoning):
- **Scope:** extract + declarative together.
- **Condense:** retire the unexercised LLM phase.
- **Order:** flagship first (its 54 bundles are the regression oracle), then statgen.

## Survey findings this rests on

Measured 2026-08-02 against `origin/main` for each repo (flagship skipped a 2-commit
fast-forward — staged in-progress work; those commits are site-helper adoption, not casting).

| | flagship `foundry` | `statistical-genomics-foundry` | TDA foundry |
|---|---|---|---|
| Molds | 47 | 11 | 0 |
| Typed refs | 253 across 6 kinds | 104 across 3 kinds | — |
| Caster | `packages/build-cli`: `cast-mold.ts` 1501 LOC, `assemble-pipeline.ts` 522, `validate.ts` 1511, `tests/cast-mold.test.ts` 1264 | none | none |
| Cast bundles | 54 | 0 | 0 |
| Targets declared / implemented | 3 / 1 (`generic` and `web` are `.gitkeep`, no `_target.yml`) | 1 / 0 | — |
| Casting spec | code + `casts/claude/_target.yml` | `content/meta/casting.md` — prose table | — |

Three facts drive the plan:

1. **The caster is ~95% substrate already.** Grepping 1501 lines of `cast-mold.ts` for domain
   terms turns up exactly two leaks: the `[[summary-nextflow]]` runs-validation lookup (L1416)
   and `@galaxy-foundry/foundry` hardcoded as the validator package (L1178). Everything else is
   pattern machinery living in a `private: true`, `version: 0.0.0` package inside one instance.

2. **The second implementation already exists, in prose.** statgen's `content/meta/casting.md`
   restates the flagship's `_target.yml` row-for-row (`references/notes/`, `references/patterns/`,
   `references/cli/<slug>.json`, `references/schemas/<slug>.schema.json`) and copies the
   provenance schema "essentially verbatim". It is unrunnable, so nothing will ever tell you
   when it drifts. `assemble-pipeline.ts` is a third restatement — its own header says it
   "mirrors `cast`'s `--check` drift gate". Three restatements, one implementation.

3. **Both casters are 100% deterministic.** 231 `verbatim` + 22 `sidecar` + 0 `condense` live
   refs in the flagship; 0 `"source": "llm"` entries across all 54 bundles. statgen narrows
   `modes` to drop `condense`; the flagship moved its last condense refs to verbatim in
   `convert-nfcore-module-to-galaxy-tool` rev 4 ("the prior condense was always a verbatim
   passthrough, so the cast is fully deterministic"). The two-phase `pending_llm` machinery is
   dead code in the only instance that has it.

## The declarative gap

What the kind model already declares: `ManifestKind.shape` (file/directory) and
`companions[]` with `requirement` + `disposition` (`foundry-only` / `cast-input` / `bundled`).
What `reference_contract.yml` declares: `kinds` with `label` / `description` / `href` /
`ref_shape`. What `_target.yml` declares: `dst_dir` / `dst_extension` / allowed `modes` /
`required_outputs` / `skill_constraints`.

Still TypeScript literals in `cast-mold.ts`:

| # | Hardcode | Line | Belongs on |
|---|---|---|---|
| 1 | `SUPPORTED_KINDS` / `NOT_IMPLEMENTED_KINDS` | 189–197 | nowhere — a **fourth** copy of the kind list |
| 2 | `defaultMode = kind === "cli-command" ? "sidecar" : "verbatim"` | 255 | ref kind |
| 3 | Resolution `if/else`: note-file / `package://` export / prompt payload companion / `tool:` slug override | 269–328 | ref kind |
| 4 | `if (r.kind !== "research" && r.kind !== "pattern") continue` | 372 | ref kind |
| 5 | `args.target === "claude" ? .../skills/... : ...` | 1277 | target |
| 6 | `runtimeProcedureBody` vocabulary rewrites (`Mold`→`skill`, …) | 1082–93 | target |
| 7 | Whole `SKILL.md` template — sections, order, Runtime Notes boilerplate | 1196–1251 | target |
| 8 | `[[summary-nextflow]]` lookup; `@galaxy-foundry/foundry` validator package | 1416, 1178 | the instance (domain leaks) |

**#1 and #4 are the bug the pattern already documented once.** `kind-catalog.md` records that
`_target.yml`'s hand-written `forbid_packaged_files` "named two of the eight its kinds declare",
and `dispositions.ts` now derives that set instead — six of nine tests written against the
derived set passed under the old hand list, drift measured rather than asserted. The same
hand-list-vs-declaration shape is still live twice in the same file.

**Where the split falls.** The kind declares *strategy* — how to resolve, default mode, whether
its notes may carry companions — because those are facts about the kind. The target declares
*placement* — `dst_dir`, `dst_extension`, bundle path, template — because those are facts about
the target. Today it is split the wrong way round: strategy in TS, placement in YAML.

**Not in scope:** deriving bundle membership from a kind's companion listing. What a note carries
stays declared per-note (`companions:` frontmatter), never inferred from what sits in the
directory. #4 only governs which *kinds* may carry companions at all — layout vocabulary, not
membership.

## Plan

### Phase 0 — Retire condense (flagship, in place)

Do this first and alone: it deletes ~120 lines the extraction would otherwise have to carry,
and it is independently reviewable.

1. Delete the `mode: "condense"` branch of `castOneRef`, the `pending_llm` bookkeeping, the
   prior-refs carry-forward for LLM output, the `prompt`/`model` provenance fields, and
   `condense_prompts` from `_target.yml`.
2. Drop `condense` from `modes` in `@galaxy-foundry/reference-contract` (minor version bump —
   it is a vocabulary removal, and both consumers are in hand).
3. Retire statgen's `narrow: { modes: SUPPORTED_MODES }` and the `SUPPORTED_MODES` constant;
   `NARROWED_GROUPS` drops back to `['kinds']`. Its `registry-drift.test.ts` should still pass.
4. Re-scope the pattern site's claim. `the-model.md` §Cast and `case/01-skills-package-not-source.md`
   present "deterministic-first, LLM-second" as description; it is capacity with an empty
   denominator. Rewrite to say the ordering is a *trust ordering the pattern fixes*, and that
   both current instances land fully deterministic — which is a stronger claim than the current
   one, not a weaker one, and one the corpus actually backs.

**Test gate (red→green):** before touching anything, add a test asserting no bundle's
`_provenance.json` contains `pending_llm` or `"source": "llm"` and no Mold declares
`mode: condense`. It passes today — that is the point: it pins the fact the deletion depends on,
and it will fail loudly if someone authors a condense ref while the deletion is in flight.
After deletion, `foundry-build cast --check` over all 47 Molds must stay clean and all 54
bundles byte-identical.

### Phase 1 — Declarative per-kind casting (flagship, in place)

Still no package boundary. Move #1–#4 onto the ref-kind declaration and #5–#7 onto the target,
proving the declarative model against the instance that has bundles to diff.

1. Extend `reference_contract.yml`'s kind rows with a `cast:` block:

   ```yaml
   kinds:
     cli-command:
       label: CLI Command
       ref_shape: wiki-link
       cast:
         resolve: note              # note | package-export | payload-companion | slug-from-field
         default_mode: sidecar
         modes: [sidecar]
         companions: forbid         # may this kind's notes carry per-note companions
     cli-tool:
       cast:
         resolve: slug-from-field
         slug_field: tool
         default_mode: verbatim
         modes: [verbatim]
         companions: forbid
     prompt:
       cast:
         resolve: payload-companion  # the kind's single `bundled` companion; already derived
         default_mode: verbatim      # by dispositions.ts — this just names the strategy
         modes: [verbatim]
     schema:
       cast:
         resolve: package-export     # note declares package + package_export
         default_mode: verbatim
         modes: [verbatim]
     research:  { cast: { resolve: note, default_mode: verbatim, modes: [verbatim], companions: allow } }
     pattern:   { cast: { resolve: note, default_mode: verbatim, modes: [verbatim], companions: allow } }
   ```

   `resolve` replaces the `if/else` chain; `default_mode` replaces the ternary; `companions`
   replaces the two-kind allow-list; the presence of a `cast:` block replaces `SUPPORTED_KINDS`
   (a kind without one is not castable, which is `example` today, stated where the kinds live
   rather than in a second literal).

   Open question flagged in the schema: `modes` now appears both here (per kind, domain-scoped)
   and in `_target.yml.kinds[].modes` (per kind per target). Resolve by making the target's list
   an *intersection constraint* the loader enforces, not an independent declaration — a target
   may refuse a mode the kind allows, never permit one it doesn't.

2. Extend `_target.yml`: `bundle_path: skills/{mold}` (#5), a `vocabulary:` map for the
   Mold→skill rewrites (#6), and a `template:` naming the skill renderer (#7). For #7, do **not**
   invent a template language — introduce a target-neutral **cast document**: the structured
   intermediate `renderSkillMarkdown` already builds in its head (summary, inputs, outputs,
   required tools, upfront refs, on-demand refs, validation rows, procedure body). Emit that as
   data; a per-target renderer turns it into `SKILL.md`. This is what makes `generic` and `web`
   cheap, and it is the thing statgen would need for any non-Claude target.

3. Fix the two domain leaks (#8): the `[[summary-nextflow]]` runs-validation lookup becomes a
   target/instance-declared `runs_schema_ref`; `@galaxy-foundry/foundry` becomes an instance
   config value.

**Test gate (red→green):** the oracle is byte-identity. For each of the 47 Molds, `cast --check`
must report clean and every one of the 54 bundles must be unchanged after each step. Any diff is
a behaviour change and has to be justified in the commit, not absorbed. Add, per hardcode
removed, one test that the declaration is *load-bearing*: change the declaration in a fixture
repo and assert the cast output changes — the `dispositions.ts` precedent, where the value of
deriving was measured by tests that fail under the hand-written list.

### Phase 2 — Extract `@galaxy-foundry/cast` (foundry-lib)

Now that the per-kind behaviour is data, the package boundary is mechanical.

**Ships:** ref resolution driven by the `cast:` declarations, companion expansion, hashing and
`reconcile`, provenance v3 emission and carry-forward, the `--check` drift gate, orphan pruning
under `references/`, license-policy enforcement, the verify manifest, the cast document, and a
default renderer.

**Declines (stays per-instance):** the kind definitions and the composed reference contract, the
slug map (one instance keys by basename + Mold `name` + `tool command`, another by dashed
collection id), the target configs, the validator binaries, and every domain leak from #8. Same
seam `kind-schema` already uses — generic over an instance-supplied context, no I/O in the main
barrel.

Migrate `packages/build-cli/src/commands/cast-mold.ts` to a thin composition point, the way
`build-cli/src/lib/reference-contract.ts` is already a shim over `note-schema`. `tests/cast-mold.test.ts`
(1264 lines) splits: substrate assertions move into the package, instance assertions stay.

**Park:** `assemble-pipeline.ts`. It hand-mirrors the drift gate and would benefit, but the
Pipeline concept is under reconsideration — cite it as evidence for extraction, do not touch it.

**Test gate:** same oracle. `pnpm -r test` green in flagship and foundry-lib, `cast --check`
clean over 47 Molds, 54 bundles byte-identical.

### Phase 3 — statgen casts for the first time

1. Install `@galaxy-foundry/cast`; add `cast:` blocks to its three kinds; write
   `casts/claude/_target.yml`.
2. Replace `content/meta/casting.md`'s prose table with a generated view of the actual
   declarations, or delete the table and link the declarations. The unrunnable copy is the
   thing being removed.
3. Cast the four Molds its own `casting.md` nominates as the minimum exercise
   (`audit-method-validity`, `derive-null-and-calibration`,
   `map-question-to-established-method`, one with a planted-invalid example), review
   `SKILL.md` + `_provenance.json` by hand, then cast all 11.

**Test gate:** genuinely red-to-green — statgen has no casts today, so the first `cast --check`
fails because nothing exists, then passes. Its 104 refs resolve through 3 kinds, exercising the
`note` resolve strategy heavily and `sidecar` once; the `package-export`, `payload-companion`
and `slug-from-field` strategies stay flagship-only, which is the honest coverage picture and
worth stating rather than papering over.

### Phase 4 — The instructions document

`standing-up-a-foundry.instructions.txt` has Parts 1–8 and **no Part for the caster**. A foundry
stood up by it today gets a KB, kinds, a validator and a site, and cannot cast — which is
precisely what statgen is.

Add a short Part 7 (renumbering the external check and composition), because casting moves from
the MECHANICAL column to INSTALLED: install `@galaxy-foundry/cast`, write the `cast:` blocks in
`reference_contract.yml`, write one `_target.yml`, done. Update the "INHERITED vs SUPPLIED"
table — the INSTALLED grade gains a seventh package, MECHANICAL shrinks. Update
`anatomy-of-an-instance.md` (Cast row) and `kind-catalog.md`, which will now have a second
declaration to report on.

This satisfies the CONVERGE_PROMPT in both directions at once: the document gains a *short* Part
while the result of running it becomes a foundry that actually produces artifacts.

## Decisions

- **Extract now, on a prose second-implementation.** The instructions doc's own rule says extract
  on the second implementation, "never the first", and casting has zero second *code*
  implementations. The judgment: statgen's prose table is the second implementation in a medium
  that cannot be run, diffed, or `--check`ed — strictly worse than a code duplicate, so the rule
  is satisfied in substance.
- **Declarative together with extraction, not after.** Extracting first would port eight
  TypeScript hardcodes into the shared package and then pull them back out — two migrations of
  the same code, with the flagship's 54-bundle oracle spent twice.
- **Flagship first.** A byte-identical re-cast of 54 existing bundles is a regression oracle no
  new instance can provide.

## Unresolved questions

- `generic` and `web` targets: real near-term, or delete the empty dirs? Decides whether the cast
  document (Phase 1.2) is load-bearing now or speculative.
- Does statgen actually want to cast, or is it upstream of that?
- TDA foundry is greenfield with no site at all — is it the intended proving ground for the
  revised instructions (Phase 5, unwritten)?
- `@galaxy-foundry/note-schema` (flagship-local) vs `kind-schema` + per-instance types (statgen):
  two arrangements of the same seam. Reconcile as part of Phase 2, or leave?
- Does retiring `condense` need a deprecation window in `reference-contract`, or is
  "both consumers are in hand" enough for a straight removal?
