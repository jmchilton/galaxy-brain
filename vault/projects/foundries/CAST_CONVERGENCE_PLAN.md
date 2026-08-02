# Cast Convergence Plan

Converging the foundries along the **casting** axis: extract the caster into the shared
substrate *and* move its per-kind behaviour out of TypeScript literals onto the kind and
target declarations, in one migration.

> **Status (2026-08-02).** Phase 1 partially done — hardcodes #1–#4 landed, plus two
> unplanned fixes the work surfaced. Four commits on `foundry` branch `cast-declarative`
> (worktree `~/projects/worktrees/foundry/branch/cast-declarative`), under review.
> Phase 0 not started; see "Ordering deviation" below. Details in **Progress log**.

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

## Progress log

### Phase 1, first tranche — done (4 commits, `cast-declarative`)

**Ordering deviation.** Phase 0 (retire condense) was specified first and was skipped — work
started at Phase 1 by request. No conflict resulted: Phase 1's gate is byte-identity, which
forced the `cast:` blocks to describe behaviour *as it is*, condense included. Phase 0 now
reduces to deleting `condense` from those declarations and the machinery behind it.

**`ddf9da2` — a real bug the baseline measurement found.** The plan assumed a clean starting
point for the byte-identity oracle. It was not clean: `content/research/planemo-asserts-idioms/index.md`
had been edited (a doc path renamed to `content/meta/casting.md`) and the 7 bundles carrying it
verbatim were never re-cast, so all 7 shipped a pointer to a file that no longer exists. The
stale provenance recorded `src_hash == dst_hash` — satisfying the verbatim guarantee against the
note *as it used to be*, self-consistent and wrong. Deterministic re-cast, one line per bundle.

**`91e7d7b` — the gate that would have caught it.** CI cast-checked exactly one Mold
(`summarize-nextflow --check`), so drift in the other 46 was structurally invisible.
`make check-casts` now runs `--check` over every Mold, reports every drifted one rather than
stopping at the first, and is wired into `make check` and CI. Verified red-to-green against
injected drift.

**`db35ea4` — hardcodes #1–#4 became declarations.** `cast:` blocks per kind, as designed.
Two design points resolved as the plan proposed: castability *is* the presence of the block
(no second list), and the target's `modes` became a **constraint** on the kind's rather than a
rival declaration. Byte-identical across all 47 Molds; `make check` green (240 tests).

**`8c73a44` — the `generic`/`web` targets deleted.** Both held only a `.gitkeep`, no
`_target.yml`, so neither was castable. The site's hardcoded `['claude','web','generic']` now
discovers targets by looking for a `_target.yml` — same move as a kind being castable when it
declares a `cast:` block.

**`14953a1` — review fixes.** An independent review verified byte-identity the hard way (re-cast
all 47 Molds with the pre-refactor caster from `git archive`, diffed the whole tree: only
`cast_at` and `commit` differ) and raised one high finding plus five smaller ones, all addressed.
The high one was a genuine defect: the load-bearing test overwrote the tracked
`reference_contract.yml`, racing every concurrent reader and stripping the file's comments.
Fixed with a temp root plus symlinks; verified by running the suite and `make check-casts`
concurrently.

**`9849556` — verification round found the trap in the fix.** The `14953a1` temp root symlinked
`content/` and `casts/` but not `LICENSES/`, and both Molds under test carry `license_file:`
refs — so with the contract *unmutated* the cast already failed, and `expect(code).not.toBe(0)`
was being satisfied by the environment. Only the substring assertions were doing real work. The
helper now asserts a clean **control** first and owns the invocation so `--check` cannot be
omitted (the root symlinks the whole real `casts/`; a caller that forgot it would rewrite
`SKILL.md`, rewrite `_provenance.json`, and unlink committed files while exiting 0). The same
overwrite-a-tracked-file hazard was still live in the stale-`_verify.json` test and is fixed the
same way. Verified: 60 polls during a run, no window where tracked files are dirty.

**The methodological lesson, worth carrying into every later phase.** Two rounds of review found
the same class of defect twice: *a check that passes for the wrong reason.* Byte-identity passed
while behaviour changed on inputs the corpus lacks; the declaration tests passed while the
environment, not the declaration, was failing them. Both were invisible from a green run. The
countermeasure now in the harness is the control assertion — a negative test must be paired with
a positive that proves the fixture is otherwise sound. Phase 2's extraction should ship the same
discipline rather than trusting a green suite.

**Declined, with reasons.** Two review suggestions were not taken. `validate.ts:1402` calls
`loadReferenceContract()` with no argument so it walks up from cwd — flagged as "cheap to align"
with the caster, but `--root` is implemented as a `process.chdir` (`validate.ts:1501`), so the
walk-up already resolves relative to the root; the reported bug does not exist, and the reviewer
withdrew it on the second pass. `validateDirectory` additionally takes no root option, and
`tests/validate.test.ts` builds its temp vaults inside the repo root with no contract, so they
depend on that walk-up regardless. And `site/src/lib/casts.ts` re-`readdirSync`es per Mold — true, but it is one readdir of a
one-entry directory per Mold, and caching would add staleness risk in the dev server for no
measurable gain.

### Findings that change later phases

- **A fifth kind-name hardcode was missed in the original survey.** `castOneRef` dispatches the
  sidecar builder on `mode === "sidecar" && kind === "cli-command"` (cast-mold.ts:949), with a
  related guard at :872. The table above said four. Still outstanding.
- **Two declarations are dormant — no content exercises them.** Every committed reference names
  its own `mode`, so `default_mode` never fires; no `cli-tool` note's directory differs from its
  `tool:`, so `slug_field` is a no-op. First attempts to test them passed vacuously. Both now
  have fixtures built to discriminate. **This matters for Phase 3:** statgen will inherit
  declarations that no corpus exercises, so the shared package must carry these tests rather
  than relying on either instance's content to cover them.
- **Two latent bugs fell out of the refactor.** Schema `dst` used `basename()`, which would have
  produced `index.schema.json` the moment that kind became directory-shaped — the exact failure
  `deriveDst` already documents for another kind. And the wiki-link address precheck, previously
  applied only to `schema`, now answers to the declared `ref_shape` instead of assuming every
  castable kind is wiki-link-shaped.
- **Temp-repo test fixtures were incomplete Foundries.** 19 of them wrote a `_target.yml` but no
  reference contract; they now seed the real one. Worth knowing before Phase 2 moves tests into
  the shared package.
- **`@galaxy-foundry/reference-contract`'s parser silently drops unknown keys**, so a `cast:`
  block written by an instance whose caster does not read it does nothing, quietly. Flagged as a
  Phase 2 follow-up: the shared parser should reject rather than drop. (Confirmed inert *in this
  repo* — `loadCastContract` re-reads the raw YAML rather than going through `parseTerm` — so it
  is a hazard for the shared package, not a live bug here.)
- **Two behaviour changes byte-identity provably cannot see.** `resolveWikiLink` accepts bare
  inner text, so an unbracketed ref used to resolve for all five non-schema kinds and now does
  not; and a declared `slug_field` a note lacks used to fall back silently. Both are now
  deliberate, tested, and documented. The general lesson for Phase 2: byte-identity over one
  corpus proves *no regression on inputs that exist*, never *no behaviour change*. Extraction
  needs the same treatment — enumerate what the corpus does not exercise, and test that
  separately.
- **`site/src/lib/casts.ts` still hardcodes `target === 'claude'`** for the `skills/` bundle
  layout, in the same function `8c73a44` de-hardcoded. That is hardcode #5 (`bundle_path`) seen
  from the site side; both should move to `_target.yml` together.

### Remaining in Phase 1

#5 `bundle_path`, #6 vocabulary rewrites, #7 the cast document (which also owns the
`refKindLabel` literals at cast-mold.ts:1128–1132), #8 the two domain leaks, and the
newly-found sidecar dispatch. **#7 is now unblocked in the negative direction:** with
`generic`/`web` deleted, a target-neutral intermediate is speculative until a second target is
real, so the SKILL.md template can stay TypeScript for now.

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

- ~~`generic` and `web` targets: real near-term, or delete the empty dirs?~~ **Resolved
  2026-08-02: deleted** (`8c73a44`). The cast document is therefore speculative until a second
  target is real.
- Does statgen actually want to cast, or is it upstream of that?
- TDA foundry is greenfield with no site at all — is it the intended proving ground for the
  revised instructions (Phase 5, unwritten)?
- `@galaxy-foundry/note-schema` (flagship-local) vs `kind-schema` + per-instance types (statgen):
  two arrangements of the same seam. Reconcile as part of Phase 2, or leave?
- Does retiring `condense` need a deprecation window in `reference-contract`, or is
  "both consumers are in hand" enough for a straight removal?
