---
related_records: foundry/issues/723
---

# #678 `galaxy-tool-discovery` `status` has no `unsuitable` case; a capability miss routes to authoring a wrapper that exists

[Issue](https://github.com/galaxyproject/foundry/issues/678) — opened by scottcain's AI assistant, currently only `needs-triage`. No comments, no PR or branch addresses it (`gh pr list --search 678` empty; no `*678*` branch).

## Proposed labels

- `roadmap/substep`: a contract gap in one schema and its routing, not backbone work.
- Parent: #318 "Revise how skills working on draft coordinate - more direct, more deterministic, more YAML" (`roadmap/main`, `priority/mvp`). Its research comment has discovery outcomes pick the next Mold (recommendation 3) and floats a `kind` enum including `repair-topology`, which is where this status would map. #501 is weaker: this issue is about not authoring. #723 is staged under #501, so a merge would change this parent.
- `priority/mvp`: wrong routing yields wrong results. #723's rnaseq run shows the outcome, duplicate UDTs for wrappers that exist.
- `work/ready-research`: more than the status name is open (see Findings), so an implementer would stop on design questions. A comment settling them comes first.
- No blocker labels.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3: labels are staged in `issue_tags.md`. Once applied as proposed it becomes `queued_research`.

## Findings

Verified on `origin/main` `51338d1d`, 2026-11-06.

- Schema: `status` enum `["hit","weak","miss"]` at `packages/gxwf-foundry/src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json:18`. The allOf branch at :47 requires `candidate` for `hit`/`weak`; :56 forces `candidate: null` for `miss`. So a `miss` can't carry the right wrapper, as the issue says.
- `content/molds/discover-shed-tool/index.md:105-107` and :158-160 define the statuses; `miss` means "falls through to author-galaxy-tool-wrapper".
- **Discovery can't currently detect this case.** Its inputs are a free-text need and hints (no draft, no `input_artifacts`), it classifies from search score and pin resolution, and it never reads the wrapper. The port contract only appears at `summarize-galaxy-tool`, in `advance-galaxy-draft-step` step 3. So `unsuitable` needs either a capability check added to discovery or a different emitter.
- **The routing fix is mostly not in the schema.** `advance-galaxy-draft-step` never mentions `hit`/`weak`/`miss`. It routes in prose: `:169` "if no acceptable shed candidate emerges, fall through", and `:182` a wrapper-choice mismatch goes back to discovery or to authoring. Neither offers topology repair. Only `discover-shed-tool` and `author-galaxy-tool-wrapper` (`:67`, `:84`) name the statuses in routing text.
- **Topology repair excludes this case.** `repair-galaxy-draft-topology/index.md:92` says wrapper-tier gaps "are not this case", and `implement-galaxy-tool-step/index.md:161` says the same for a missing wrapper. #669 reports the same trigger problem and the missing deletion shape, which this issue's fold-into-consumer repair needs.
- Corrected from the earlier triage: `harness-pipelines.md`, `glossary.md` and `implement-galaxy-tool-step` use discover-or-author language but don't name the statuses. `molds.md` and `roadmap.md` don't touch this routing. `build-cli/src/lib/run-preview.ts` has no status literals.
- Status text a change must touch: `content/schemas/galaxy-tool-discovery.md`, `content/cli/foundry/validate-galaxy-tool-discovery.md:33-34`, `packages/gxwf-foundry/test/galaxy-tool-discovery.test.ts`, and the cast copies `casts/claude/skills/discover-shed-tool/SKILL.md:86-88` and `references/schemas/galaxy-tool-discovery.schema.json`.
- The STAR example holds: `iuc/rgrnastar` `rna_star` with a history genome runs `--runMode genomeGenerate` inside the alignment job (`tools/rgrnastar/macros.xml:84-93`) and has no index output.
- Changeset `d8d32326fbfb` from the issue isn't among today's 24 installable `iuc/rgrnastar` revisions. `gxwf tool-revisions` resolves `2.7.11b+galaxy1` to `6e8618432bea`. The repo updated 2026-10-26, after the issue, so this may just be a newer revision. Doesn't affect this issue; #645 covers installable-pin checking.

Not verified: `galaxy-tool-pin.R7.json` and the claim that STAR was already pinned elsewhere in that workflow. The run artifacts aren't linked. The run itself is presumably the nf-core/rnaseq one behind #655 and #669.

Related, all open:

- #723: asks to separate existence from installation, version and capability, and bans UDTs when a tool exists. Close to a superset. It would send a capability gap to a wrapper enhancement or an unresolved requirement, where this issue sends it to topology repair.
- #669: the repair path this issue routes to.
- #655: other gaps in the same `advance-galaxy-draft-step` step 2 cascade.
- #318: recommendation 3 would make discovery write its outcome into the draft, so a new status must fit that.

Closed and related: #549 (reuse an already-pinned wrapper), #573.

Not an upstream issue: the schema and Molds are Foundry-owned, so no upstream drafts.

## Next

After labels: research comment answering the questions below, with the file list above as scope. Implementation then adds the status to the schema (candidate required, like `hit`/`weak`), the routing text and repair trigger, evals, a validator fixture and a recast.

Questions for John:

1. Merge into #723, or sequence? Same question as #723's question 1. If separate, #678 can supply the enum #723 builds on.
2. Who emits the status: discovery with a new wrapper check, or `advance-galaxy-draft-step` after summarize, with no schema change at all? The second fits the existing `:182` route.
3. Where does a capability gap go: topology repair (this issue), or an enhancement note or open requirement (#723)? Possibly both, depending on whether a rewire can absorb the gap.
4. Name: `unsuitable` or `capability-miss`? Only matters if the answer to 2 keeps a status.
