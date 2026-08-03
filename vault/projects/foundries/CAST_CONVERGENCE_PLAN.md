# Cast Convergence Plan

Converging the foundries along the **casting** axis: extract the caster into the shared
substrate *and* move its per-kind behaviour out of TypeScript literals onto the kind and
target declarations, in one migration.

> **Status (2026-08-03).** **Phases 0, 1 and 2 are done.** Phases 0–1 merged to
> galaxyproject/foundry `main` — **#433**, **#434**, **#438**, plus `foundry-pattern` **#31**.
> Phase 2 shipped `@galaxy-foundry/cast` — jmchilton/foundry-lib **#39** and **#41**, released
> as **0.2.0** (0.1.0 is the name-claiming stub). The flagship adopts it in **#440**, open and
> green.
> **Next: Phase 2.5** — extract the caster itself, which Phase 3 turned out to require.
> Details in **Progress log**; the split under **How the branch was split**.
>
> Three plan changes decided along the way, all recorded below: **#6 and #7 are dropped from
> Phase 1** (target-renderer work with no second target to justify it, after `8c73a44` deleted
> the only two candidates), **Phase 0's steps 2–3 collapsed** (the flagship narrows rather
> than the substrate deleting, so no cross-repo release exists), and **Phase 2's ships list is
> cut** — the verify manifest and the renderer turned out to be built from one instance's Mold
> vocabulary, so they stay put until Phase 3 produces a second implementation. A fourth followed:
> **Phase 2.5 was added**, because Phase 3 assumed a caster that Phase 2 had explicitly declined
> to extract.

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
| 5 | `args.target === "claude" ? .../skills/... : ...` | 1277 | target — **done, `42e4690`** |
| 6 | `runtimeProcedureBody` vocabulary rewrites (`Mold`→`skill`, …) | 1082–93 | target — **dropped, no second target** |
| 7 | Whole `SKILL.md` template — sections, order, Runtime Notes boilerplate | 1196–1251 | target — **dropped, no second target** |
| 8 | `[[summary-nextflow]]` lookup; `@galaxy-foundry/foundry` validator package | 1416, 1178 | the instance — **done, `f7d5d91`** |

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

**Done 2026-08-03, with a smaller ships list than planned.** See the Progress log entry for
what the code said and why. Shipped: placement, reconciliation, hashing, bundle hygiene, the
provenance record and carry-forward, and licence enforcement. Declined for now: ref resolution,
companion expansion, the verify manifest and the renderer.

The original scope, for the record:

**Ships:** ref resolution driven by the `cast:` declarations, companion expansion, hashing and
`reconcile`, provenance v4 emission and carry-forward, the `--check` drift gate, orphan pruning
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

### Phase 2.5 — Extract the caster itself (foundry-lib)

**Added 2026-08-03, because Phase 3 cannot start without it.** Phase 3 read as though installing
`@galaxy-foundry/cast` makes an instance able to cast. It does not. The package is the
deterministic *half* — placement, drift, hashing, the provenance shape, licence enforcement. The
thing that casts is `cast-mold.ts`, still 1,379 lines in the flagship's build-cli, and Phase 2
declined to extract it for want of a second implementation.

Statgen makes the gap concrete: it has no build-cli at all. Its only TypeScript lives under
`site/`, run by `vite-node`. No CLI package, no `cast` command, no validator binary. Installing
`cast` there gives it a library with no caller.

**What the survey found.** The 264-line main command is almost entirely generic orchestration.
Nine domain hooks are woven through it, and statgen needs none of them:

| Hook | Domain fact it encodes |
| --- | --- |
| `buildSlugMap`'s `tool`+`command` alias | Galaxy CLI commands are addressable two ways |
| `buildProducerIndex` / `buildVerifyManifest` / `readArtifactContracts` | `output_artifacts` / `input_artifacts` |
| `aggregateRequiredTools` + `_required_tools.json` | Galaxy tool requirements |
| `validateRuns` over `runs/*/summary.json` | harvested run output |
| `renderSkillMarkdown`'s `artifactRows` / `schemaValidationRows` | the same artifact contract |
| `_verify.json` emission | the verify manifest |
| `buildCliSidecar` / `resolveCliCommandMeta` | planemo command metadata |

The generic core is the rest: argv, target config, ref resolution and `deriveDst`, companion
expansion, the stable `(kind, group, companion)` ordering, `castOneRef`, orphan reconciliation
under `references/`, drift reporting, provenance assembly and `cast_history`, and SKILL.md's
frontmatter, body and ref rows.

So this is a caster with declared extension points, not a lift. The flagship passes all nine
hooks; statgen passes none. That asymmetry is the test of whether the seam is in the right place
— and it is the evidence Phase 2 lacked.

**One blocker the survey turned up.** `mode: sidecar` dispatches unconditionally to
`buildCliSidecar`. The comment defends this — the target's `kinds.<kind>.modes` already gates
which kinds may take `sidecar`, so naming the kind again would be a second gate that could only
disagree with the first. That reasoning is sound and the conclusion is still wrong once there are
two instances: the gate says *whether* a kind may take a sidecar, never *which renderer builds
it*. `sidecar` has to become a named renderer chosen by declaration.

**Settled 2026-08-03. `sidecar` is not divergent — the licence model is.**

First pass on this read statgen's three `mode: sidecar` refs as a second meaning of the word. That
was wrong. `sidecar` is defined once, in `@galaxy-foundry/reference-contract`'s shared `modes`
data — *"Transformed into a structured runtime artifact beside the generated skill"* — and
statgen's own `content/meta/casting.md` documents exactly that meaning, routing `cli-command` to a
deterministic JSON sidecar at `references/cli/<slug>.json`. Both instances agree.

What the three refs actually expose is a **structural dead end**, and it is worth stating in full
because it is the first real finding the second instance has produced:

1. All three are `kind: research` pointing at paywalled papers — `beaulieu-omeara-2016-hisse`
   (`CC-BY-NC-ND-4.0`), `cunningham-1999-asr-limitations` and `tettelin-2008-openness` (both
   `LicenseRef-all-rights-reserved`).
2. In `license-policy.yml` both licences are `policy: own-words-only`, `allowed_modes:
   [condense]`.
3. Statgen **narrows `condense` out** of the inherited `modes` vocabulary —
   `SUPPORTED_MODES = ['verbatim', 'sidecar']`, recorded in `site/src/lib/reference-contract.ts`
   and defended in `casting.md` on the grounds that every carry here is deterministic.

So statgen narrowed away the only mode its own corpus's licences permit for a class of source it
uses heavily. `sidecar` was the improvised escape hatch — the nearest available thing that was
not `verbatim`. At first cast, `applyLicensePolicy` rejects all three under *any* mode statgen
admits.

**The table is what is wrong here, not statgen.** All three notes declare
`derived: own-words-summary` or `abstract-only-own-words-summary`. Their bodies are statgen's own
prose *about* the paper; the `license:` field describes the upstream work, not the note's
contents. Carrying such a note verbatim redistributes none of the paper — and the table already
knows this, saying so in prose at `CC-BY-NC-SA`: *"NC condition kept out of casts (own-words)."*
But `applyLicensePolicy` triggers on the mere **presence** of `license:`, so a derived note is
policed as though it were the source.

This is the same distinction #41 kept instance-side for the `license_file` *presence* rule — the
flagship's `upstream` scoping telling a Foundry-authored annotation from genuine third-party
redistribution. Nobody generalized it to the *mode* rule, because the flagship never needed to:
it has zero `derived:` notes and exactly one `condense` ref. Statgen has 99 research refs and a
corpus built on summarizing paywalled work.

**The rule already exists. One layer just doesn't implement it.** This is not new policy:

- `license-policy.yml`'s `global_rules` declares **`foundry_content_out_of_scope`** — *"This
  table governs third-party pass-through content only. Foundry-authored notes are covered by the
  root LICENSE and are never conflated with it."*
- Statgen's `site/src/lib/reference-contract.ts` states it in prose and cites that rule by name:
  *"`mode` does NOT answer 'may this text be redistributed' — that is a question about the
  SOURCE, decided at ingestion and recorded in a note's `derived:` posture."*
- Statgen already **enforces** it at ingestion. `licenseCoherence` in `site/src/types/context.ts`
  rejects verbatim carry under an own-words-only row and requires a `license_file` where one is
  owed — keying off `declaresVerbatimCarry(note.derived)`, never off `mode`.

`applyLicensePolicy` re-asks the same question at cast time using `mode`, and never reads
`global_rules`. That is the whole defect.

**Fix, in dependency order:**

1. **Substrate, upstream — independent of #440.** Lift `declaresVerbatimCarry` into
   `@galaxy-foundry/license-policy`, beside the `global_rules` it implements, and have
   `applyLicensePolicy` consult it. Guard **only** the mode check: `license_file_hash` stamping
   stays unconditional, because it is provenance rather than permission, and statgen declares
   `license_file` on 64 notes. Needs `derived?: string` on `ProvenanceRefEntry` — a widening of
   provenance v4, so no version bump.
2. **`allowed_modes: [condense]` on the 9 own-words-only rows becomes `[]`.** Behaviour is
   already identical, since no instance admits `condense`; this is a truthfulness fix so the
   table stops naming a retired mode.
3. **Statgen.** The three refs become `mode: verbatim`, which is what carrying your own prose is.
4. **Gate.** Per-kind allowed modes, so `mode: sidecar` on `kind: research` fails at validate
   time. Statgen has no such gate — the flagship's lives in `_target.yml`'s `kinds.<kind>.modes`,
   and statgen has no `_target.yml` at all, which is why three bad refs sat unnoticed.

**The fix discriminates rather than bypasses.** `declaresVerbatimCarry` is
`/license-aware|with-quotes|verbatim/i && !/own-words/i`, and it is correct on all seven `derived`
values in the corpus — including the free-prose one that keeps functional strings verbatim, which
`own-words` correctly excludes per the `functional_strings_verbatim` global rule. So **47
`license-aware-summary` notes stay policed** (all under verbatim-ok rows, all passing) and 64
own-words notes are exempted. Not a blanket exemption for statgen.

`sidecar` itself needs no change: it keeps one meaning, and statgen's `cli-command` kind keeps
using it. The Phase 2.5 point stands for a different reason — `castOneRef` dispatches `sidecar`
unconditionally to `buildCliSidecar`, so the *renderer* must still become a declared choice.

Two smaller corpus facts that also bear on the extraction: statgen's one `kind: cli-command` ref
resolves to `[[paml-manual]]`, which is `type: tutorial` and declares `mode: verbatim`. So no
statgen ref exercises the flagship's sidecar renderer at all, and statgen's kinds are not its note
types — `research` covers `paper`, `book` and `tutorial`. The flagship's near-identity between
the two is an instance fact the caster must not assume.

**Test gate:** the flagship's byte-identity oracle again — 47 Molds, 54 bundles, no byte moves
with all nine hooks injected. Then statgen casting with none of them, which is the real result.

### Phase 3 — statgen casts for the first time

**Blocked on Phase 2.5.** Step 1 as originally written is not sufficient.

1. Install the caster from Phase 2.5 (and `@galaxy-foundry/cast` beneath it); add `cast:` blocks
   to its three kinds; write `casts/claude/_target.yml`. Statgen needs a CLI entry point of its
   own — it has none today.
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

### Phase 0 — done, and step 2 of it was wrong as planned

Run after Phase 1's first tranche rather than before it; no conflict resulted, because
byte-identity had forced the `cast:` blocks to describe behaviour as it was, condense included.

- **`43caa36`** pins the premise as three checks over the corpus: no Mold declares
  `mode: condense`, no provenance entry is LLM-sourced or awaiting one, every verbatim ref
  satisfies `src_hash == dst_hash`. All passed before the deletion, which is the point.
- **`ebc56ab`** removes the machinery: the two-phase `castOneRef` branch, `pending_llm`,
  prior-ref carry-forward, prompt/model provenance, `condense_prompts`, the verifier's pending
  guard (now the stronger "a committed cast must be deterministic"), and the fields from the
  provenance schema. `source` survives as a single-valued enum — it is the claim provenance
  makes, not something a reader should infer from an absence. The mold kind's `casting.md`
  companion went too: its declared purpose was per-Mold condensation prompts, and no Mold has
  one. All 47 committed `_provenance.json` files still validate against the tightened schema.
- **`adb7da5`** — **the plan's step 2 was wrong.** It said to drop `condense` from `modes` in
  `@galaxy-foundry/reference-contract` with a minor bump. The shared vocabulary is the
  *pattern's*: `the-model` names condensation as one of two transform modes, so deleting the term
  would assert that no Foundry may ever have an LLM phase, and would need a package release to
  reverse. The standing-up checklist already singles this exact term out as *capacity rather than
  description*, to be declined with `narrow: { modes: [...] }` — the mechanism statgen already
  uses. So the flagship narrows instead. **Consequence: steps 2 and 3 collapse — neither
  `foundry-lib` nor statgen needs any change, and the cross-repo release this phase was said to
  be blocked on does not exist.** The narrowing is load-bearing on contact: the validator now
  rejects `mode: condense`, which is what moved two fixtures off it.
- **`23a8cad`** (foundry-pattern) re-scopes the site's claim. `the-model` and
  `anatomy-of-an-instance` both implied a mixed pipeline; the honest version is stronger — the
  pattern fixes the *ordering*, how far the deterministic half reaches is a domain question, and
  both instances reached "all the way," which is what makes a cast byte-stable.

### Round 3 review, and the four commits it produced

The third review pass covered `43caa36`, `ebc56ab`, `adb7da5`, `23a8cad`. It was asked to assume
a check-passing-for-the-wrong-reason defect was present, as in rounds 1 and 2. **It found two.**
It also confirmed independently that all 47 committed records validate against the narrowed
schema, and it tried and failed to break `adb7da5`'s reasoning.

- **`eb1fc82` — the verifier was wired into nothing.** `scripts/cast-skill-verify.ts` appeared in
  no Makefile target, no npm script and no CI workflow; its only callers were two tests against
  `summarize-nextflow`. So the schema that `content/schemas/cast-provenance.md` calls the contract
  of record was enforced on 1 of 47 records, and the guard `ebc56ab` rewrote never executed
  outside a test. **This is the same defect `91e7d7b` fixed for the caster, in the same shape** —
  and that one had already shipped seven broken bundles. `make check-verify` mirrors
  `check-casts`; verified it bites by injecting `pending_llm: true` into a committed record.
- **`a56c612` — the pinning tests passed on zero.** All three scan and assert an empty offender
  list, which is as green on nothing as on everything. The reviewer proved it: with all three
  violations present, renaming `_provenance.json` turned two of them green, because
  `if (!existsSync(provPath)) continue` cannot distinguish a pipeline harness from a total scan
  collapse — and that skip already fired seven times per run. Now the skip is accounted for
  (no provenance ⇒ must have `_assembly.json`) and each test asserts a floor on what it read.
  Re-ran the probe to confirm both now fail.
- **`152b4ed` — schema v3 had been narrowed in place.** `mode` lost `condense`, `source` lost
  `llm`, and three fields were deleted under `additionalProperties: false`, while the `const`
  stayed at 3 — one version number naming two incompatible contracts. Widening survives without
  a bump; narrowing does not. `cast-provenance.md` had already written the procedure down before
  the case arose. Bumped to 4, all 47 re-cast, contract note revised (its title had said "schema
  v2" since the v3 bump). The re-cast touched exactly three fields; no `SKILL.md` or reference
  byte changed.
- **`b9c8ae8` — `ebc56ab` updated no documentation at all**, and four of the survivors were
  *operative*: `.claude/commands/cast.md` told an agent to write `prompt`/`model` into provenance
  (now rejected) **and to author `SKILL.md`, which the caster renders deterministically and
  drift-checks** — so following the command produced a bundle the next `make casts` overwrites.
  That last part the review did not catch; it turned up while fixing the part it did.
  `review-mold.md` and `review-pattern.md` were also stale and also missed by the review.
- **`9223206`** (foundry-pattern) — `23a8cad` corrected `the-model` and left `glossary.md`
  contradicting it, **and `the-model` itself names the glossary "the page that wins where two
  others disagree."** Also fixed the statgen overclaim (below).

**Two things worth carrying forward.** First, the reviewer verified the *reasoning* in `adb7da5`,
not just the code, and found the substrate's own `narrow` docstring naming `modes.condense` by
name as capacity to be declined — so the collapse of steps 2–3 is what the code says, not a
convenient reading. Second, it named a **substrate gap**: `narrow` is prescribed but has no
declarative surface, because `loadInstanceKinds` actively refuses an instance that declares an
inherited group. Both instances therefore hardcode the same list in TypeScript. That is an
upstream issue for foundry-lib, not a change to this branch — **still unfiled.**

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
- ~~**`site/src/lib/casts.ts` still hardcodes `target === 'claude'`**~~ **Resolved (`42e4690`).**
  It was six literals, not one — and the caster, verifier and pipeline assembler each carried the
  same ternary. All four now read `bundle_path` through `lib/target-layout.ts`.
- **`narrow` is the substrate's answer for declining capacity, and it now has two users.** Worth
  remembering in Phase 2: when the extracted `@galaxy-foundry/cast` meets a capability one
  instance lacks, the move is to let the instance decline it, not to delete it from the shared
  package. The plan got this backwards once already.
- **The pattern site's vendored instance data is stale — already, and for both instances.**
  `npm --prefix site run check:instances` reports 4 stale files (`kinds.json` and `meta_tags.yml`
  for each instance). This is *pre-existing*, not caused by the `casting.md` companion removal:
  the sync script reads `~/projects/repositories/foundry` (at `0479ad6`, behind `origin/main`
  and carrying uncommitted work), not the `cast-declarative` worktree, so it has not yet seen
  that change at all. Do **not** run `sync:instances` until `cast-declarative` merges and the
  main checkout is clean — doing it now would vendor an unreleased mid-edit state. After the
  merge it needs one sync, and it will then also pick up the dropped `casting.md` companion,
  which the kind-catalog page reports on.

### Phase 1 — done

**`42e4690` — #5 `bundle_path` and the sidecar dispatch.** The
`target === "claude" ? ".../skills/..." : ...` ternary was written out four times (caster,
verifier, pipeline assembler, site) for one fact about one target. Now `_target.yml` says it and
`lib/target-layout.ts` is the only reader; the site loses five of its six `'claude'` path literals
(the two that remain *name the target* in functions about the Claude target, which is different).
The sidecar dispatch's `&& kind === "cli-command"` was a second gate behind the target's `modes`
list — the third instance on this branch of a hand-written check duplicating a declaration.
**A trap the new test found:** `bundle_path: {mold}` is not a string — unquoted braces are YAML
flow-mapping syntax, so it loads as `{ mold: null }` and the old code died on
`template.includes is not a function` three frames away. Validated where it is read now.

**`f7d5d91` — #8, both domain leaks.** `@galaxy-foundry/foundry` was *inferred* ("has a
subcommand" ⇒ the multi-command CLI ⇒ that package name), in the caster **and** in `validate.ts`.
Notes declare `validator_package` now, defaulting to `package`; exactly one note needs it. The
`[[summary-nextflow]]` lookup became "the schema the Mold declares for its own output" — and the
*fallback* was the worse half, since for any other Mold it picked a schema with no stated
relationship to the runs. Two bugs fell out of testing it: `loadAjvForSchema` threw a bare
`SyntaxError` naming no file, for a file the caster chose rather than one the author pointed at,
and the throw escaped to the top instead of joining the finding list.

Both commits: all 54 bundles byte-identical, `make check` green (251 tests).

**#6 and #7 are dropped, not deferred silently.** Both are target-renderer work, and the only two
targets that would have paid for them were deleted in `8c73a44`. Building a target-neutral cast
document against a single target invents an abstraction with no second implementation — the rule
the instructions doc states, and the one this plan already invoked to justify extracting the
caster. Re-open them when a second target is real; the `refKindLabel` literals ride along with #7.

### Phase 2 — done, and the ships list was too long

Shipped as `@galaxy-foundry/cast` 0.1.0: foundry-lib **#39** (merged) and **#41** (open, green).
The flagship's adoption is on `cast-package-adopt`, two commits, blocked on the release.

**What moved.** Bundle placement, drift reconciliation, content hashing, bundle hygiene
(`copyVerbatim`, `pruneEmptyDirs`, `gitHead`), the provenance record's shape at v4 with
carry-forward, and licence-policy enforcement.

**Two contracts restated rather than copied.** Placement takes a target *directory*, not
`(repoRoot, target)` — `casts/` appears nowhere in the pattern spec, so hardcoding it would
export one instance's layout as the pattern's. Carry-forward reads text rather than a path, so
the record's shape is testable without a filesystem. Both leave the composition in the
instance, which is what `build-cli/src/lib/target-layout.ts` now is.

**What the code refused, with the evidence.** Three of the planned ships are built out of one
instance's Mold vocabulary, not the pattern's:

- `buildVerifyManifest` reads `meta.output_artifacts` and `meta.input_artifacts`. statgen's
  `mold` kind declares `type`, `name`, `summary`, `references`, `tags` — and nothing else.
- `schemaValidatorInvocation` resolves a wiki-link to a `schema` note and reads
  `validator_package` / `validator_subcommand`. statgen has no `schema` kind at all.
- The renderer renders those same artifact sections.

`expandCompanions` is a fourth, for a different reason: 25 lines needing three instance
callbacks, and it deliberately omits `verification` and `package_source` when building a
companion — so the obvious generic version (spread the parent) changes the emitted record. The
flagship also narrows `kind` to a six-member union that a shared signature widens back to
`string`.

What is genuinely left is the `cast.resolve` dispatch skeleton, while the three resolvers
behind it stay instance-shaped. **Decision: stop here and let Phase 3 supply the second
implementation**, which is the rule foundry-lib's own README states and which this extraction
already had to write an explicit exception for.

**One fact that was declared twice, now once.** `_target.yml` carried
`provenance_schema_version: 4` while the caster is what writes the shape — a target could name
a contract nothing emits, which is the v3-narrowed-in-place defect in a new place. The caster
emits `PROVENANCE_SCHEMA_VERSION`; the JSON Schema stays the contract of record and
`check-verify` cross-checks them. Tested red-to-green with a target declaring `99`.

**Oracle.** Re-casting all 47 Molds moves `commit` and `cast_at` and nothing else — no
`SKILL.md`, no reference byte. The licence path is genuinely covered rather than vacuously
passing: 32 of 47 bundles carry licensed refs and 42 `license_file_hash` values reproduce.
`make check` green, 267 tests / 17 files, site 374 pages.

**A flake fixed on the way.** `vitest.config.ts` set no `testTimeout`. Two different files
timed out at the 5s default on separate runs — always a timeout, never a wrong answer — because
these tests spawn `tsx` or read all 374 built pages. Now 60s.

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

### How the branch was split. Shipped 2026-08-02 as three stacked PRs.

**The first test asked the wrong question.** It cherry-picked the three Phase 0 commits out from
*under* Phase 1 — a reorder. That worked (`ebc56ab` applied clean, the other two took three
mechanical resolutions, 247 tests passed on `origin/main` + Phase 0, `cast --check` reported
exactly the 7 bundles already drifted on `main`), but it priced the split at one rebase of every
Phase 1 commit, paid later, hitting the same conflicts from the other direction.

Nothing needed the reorder. The history is already linear and the repo merges with merge commits,
so cutting by **prefix** costs nothing: branch at a SHA, PR it, base the next on it. No SHA
rewriting, no rebase, no cherry-pick. Re-tested that way, building each cut in a scratch worktree:

| PR | range | commits | `make check` | tests | vs. current `main` |
|---|---|---|---|---|---|
| [#433](https://github.com/galaxyproject/foundry/pull/433) | `ddf9da2..91e7d7b` | 2 | green | 236 / 15 | clean |
| [#434](https://github.com/galaxyproject/foundry/pull/434) | `db35ea4..adb7da5` | 7 | green | 246 / 15 | clean |
| [#438](https://github.com/galaxyproject/foundry/pull/438) | `eb1fc82..f7d5d91` + sweep | 7 | green | 266 / 17 | **1 conflict** |

(#438 replaces [#435](https://github.com/galaxyproject/foundry/pull/435) — see "What actually happened" below.)

`casts/` clean at every cut — no tranche ships a bundle the next one fixes. The test count
climbing 236 → 246 → 251 is what makes them separately reviewable: each tranche brings its own
coverage rather than leaning on the next one's.

The branch had gone **20 commits behind `main`**, and merging it whole conflicts on
`site/src/lib/casts.ts`, where main's site-helper work landed on the function `42e4690` rewrote.
Splitting confines that to the last tranche: **13 of 15 commits land with no conflict work at
all.** So the split is not a trade of rebase-cost for smaller reviews — it costs nothing *and*
isolates the one merge that needs thought.

`foundry-pattern`'s two commits went up as [#31](https://github.com/galaxyproject/foundry-pattern/pull/31);
15 behind `main` but merging clean, and independent of the flagship PRs.

**What actually happened.** #433 merged, #434 took one review comment ("drop this archeology") and
merged, and then **#435 was merged into its own base branch instead of into `main`**. GitHub does
not retarget a stacked PR when its base merges — it only does that when the base branch is
*deleted* — so #435 still pointed at `cast-declarative-kinds`, and merging it put `9823da1` on a
side branch `main` does not contain. Nothing was lost, but the PR list read as shipped when a
third of the work was not. Caught by `git merge-base --is-ancestor 9823da1 origin/main`.

The recovery: rebase `cast-declarative` onto `main` (`--onto origin/main adb7da5`), resolve the one
conflict, and open **#438** as a replacement, since a closed PR cannot be retargeted. So the real
cost of stacking was not the rebase the first test predicted — it was that **a stacked PR's base
silently stays stale after the base merges**. Next time: retarget each PR to `main` the moment the
one below it merges, before merging it.

Two things the rebase surfaced. Main's `7fa8525` had replaced `defaultRepoRoot()`'s three-hop
`fileURLToPath` walk with `REPO_ROOT` — the conflicting function — because after `astro build` the
hops landed on `site/` and 54 pages went unbuilt, green at 316 instead of 370. **This branch's own
"site build 316 pages" verification line had been quoting that bug**; post-rebase it is 374. And
`42e4690` had reformatted `site/src/lib/casts.ts` to double quotes against `site/`'s single-quote
convention — the prettier hook is scoped to `^packages/.*/(src|test)/.*\.ts$`, so nothing flagged
it. Restoring it removed 44 of the 110 changed lines: the conflict was smaller than it looked.

## Unresolved questions

- ~~`generic` and `web` targets: real near-term, or delete the empty dirs?~~ **Resolved
  2026-08-02: deleted** (`8c73a44`). The cast document is therefore speculative until a second
  target is real.
- Does statgen actually want to cast, or is it upstream of that?
- TDA foundry is greenfield with no site at all — is it the intended proving ground for the
  revised instructions (Phase 5, unwritten)?
- ~~`@galaxy-foundry/note-schema` (flagship-local) vs `kind-schema` + per-instance types
  (statgen): two arrangements of the same seam. Reconcile as part of Phase 2, or leave?~~
  **Wrong axis, 2026-08-03.** The arrangement is fine and mostly already extracted —
  `note-schema.ts`, `kind-manifest.ts` and `reference-contract.ts` are ~250 lines of composition
  over shared packages, and the package exists because the flagship's kinds have two consumers
  (the site *and* build-cli) where statgen's have one. The real finding is **duplication inside
  `context.ts`**: both instances hand-build the `reference` zod object with byte-identical error
  strings (`on-demand ref "…" requires a trigger`, `hypothesis-evidence ref "…" requires a
  verification`), and they have already drifted two ways — the flagship encodes each vocabulary
  as `z.string().refine(…)` and statgen as `z.enum(keys(group))`, and statgen's shape carries a
  tenth field, `recheck`. `licenseId` and `tag` are duplicated the same way. The base envelope is
  *not* a candidate: 12 fields against one. **Next move: extract the reference-entry schema and
  its two cross-field rules into `@galaxy-foundry/reference-contract`, beside the vocabularies
  they validate against, and settle `recheck` while doing it.**
- ~~Does retiring `condense` need a deprecation window in `reference-contract`?~~ **Moot** — the
  term was never removed from the shared package; the flagship narrows it away locally.
- ~~Land Phase 0 (and `ddf9da2` + `91e7d7b`) ahead as separate PRs, or merge the branch whole?~~
  **Resolved 2026-08-02: three stacked PRs**, split by prefix rather than by phase, so there is no
  rebase to weigh. See "How the branch was split".
- ~~File the `narrow`-has-no-declarative-surface gap upstream on foundry-lib?~~ **Filed
  2026-08-02** as [jmchilton/foundry-lib#35](https://github.com/jmchilton/foundry-lib/issues/35).
  Verifying it sharpened the claim: the checklist says a narrowed group is AUTHORED, and
  `loadInstanceKinds` refuses an authored inherited group — the two statements contradict, and
  refusing `modes:` is *correct*, so the gap is that narrowing has no surface distinct from
  declaring. Both instances hold the identical `SUPPORTED_MODES = ["verbatim", "sidecar"]`, and
  neither consumes it as a type, so a YAML surface would cost nothing either one uses.
