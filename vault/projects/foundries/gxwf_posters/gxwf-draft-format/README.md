# gxwf-draft-format

**The Galaxy Workflow Draft Format.** A standalone 44 × 44 in vector poster, in the Galaxy style, about the `GalaxyWorkflowDraft` format and how it is used in context.

The hero line is "Make 'I don't know yet' a typed, checkable state. Then burn it down."

## Purpose

To show someone walking past what the draft format is and the loop it supports:

**draft → `gxwf draft-validate` → `gxwf draft-next-step` → resolve → promote (`gxwf draft-extract`)**

- **Draft.** A workflow is valid while incomplete. Its topology is concrete. Typed `TODO` / `TODO_<hint>` sentinels and `_plan_*` intent fields stand in for the wrapper tier.
- **Validate.** `draft-validate` checks what is concrete and skips what is deferred.
- **Next step.** `draft-next-step` picks the next thing to resolve.
- **Promote.** A fully resolved draft promotes to ordinary gxformat2, with no translation layer.

The real DengueSeq run is the worked example, with nf-core/bacass as the second run. The Foundry appears only as context: one place drafts are used.

Source: copied from `../../biodata_poster/designs/known-unknowns-receipt-r4-galaxy/`. That directory is untouched.

**Format.** The poster is assumed to be 44 × 44 in, with `poster-bleed.pdf` adding a 0.125 in bleed.

## Rebuild

```
./build.sh
```

The build does the following, in order:

1. It replays `extract.py` → `receipt.json` and `extract_route.py` → `route.json` from `~/projects/foundry-runs`. When gxwf or the run dirs are missing, it falls back to the committed JSON.
2. `render.py` builds `poster.pdf`, `poster-bleed.pdf` and `preview.png` at 1496 px.
3. `audit.py` runs on both PDFs.
4. It writes `checks/` (25%, greyscale and 200 px thumb).

Deps and the uv cache live in `/private/tmp/claude-503/gxwf-gxwf-draft-format-deps/`. Override them with `POSTER_DEPS`, `GXWF`, `FOUNDRY_RUNS` or `UV_CACHE_DIR`. To set the deps up:

```
npm i --prefix /private/tmp/claude-503/gxwf-gxwf-draft-format-deps @galaxy-tool-util/cli@1.15.0
```

I ran `build.sh` twice. Both runs produced the same receipt and route numbers as SRC: every `todo`, `ts_ok`, `valid` and sha is identical, and `route.json` is byte-identical. Neither run left a date in the JSON or the PDF text.

## Names verified

I checked these against `galaxy-tool-util-ts` at `origin/main` `a0476900`, after a `git fetch`, using `git show`/`git grep` on the ref.

| Name on poster | Evidence |
|---|---|
| `GalaxyWorkflowDraft` (`class:`) | `docs/guide/draft-format.md`; `packages/schema/src/workflow/raw/gxformat2-draft.ts` |
| `gxwf draft-validate`, `--concrete`, `--connections` | `packages/cli/spec/gxwf.json` (draft-validate options). `--connections` only applies with `--concrete` (`draft-validate.ts:134`), so Get started shows `--concrete`. |
| `gxwf draft-next-step` | `packages/cli/spec/gxwf.json`; `commands/draft-next-step.ts` |
| Promote = `gxwf draft-extract` | `spec/gxwf.json`: "drop drafty steps, strip `_plan_*` fields, promote class when fully concrete". The library call is `promoteFullyConcreteDrafts`. **There is no `gxwf promote` command**, so the poster says "promote" as a verb and names `draft-extract`. |
| `TODO` / `TODO_<hint>` sentinels | `draft-format.md` ("Sentinels", `^TODO(_[a-zA-Z0-9_]+)?$`) |
| `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out` | `draft-format.md` ("Planning fields"). These are all four of the `_plan_*` fields. |
| "Always concrete: inputs, outputs, step labels and types, every edge" | `draft-format.md` ("Must be concrete"). The note-1 wording was changed to match; the SRC wording "`when:` guards" is not in the spec's list. |
| Leftover `_plan_*` on a resolved step fails validation | `draft-format.md` ("Planning fields", the contract check) |
| `draft-next-step` has no hidden state | `draft-format.md`: "pure and idempotent" |
| `@galaxy-tool-util/schema` exports validate, next step, extract and a JSON Schema | `packages/schema/src/index.ts` exports `validateDraft`, `nextDraftStep`, `extractConcreteSubset` and `galaxyWorkflowDraftJsonSchema` |
| "Only the boxes are incomplete, never the wiring" | Paraphrases `draft-format.md` ("Only the boxes are incomplete, never the wiring.") |
| `npm install -g @galaxy-tool-util/cli`, bin `gxwf` | `packages/cli/package.json` (`name`, `bin.gxwf`) |
| Docs URL `jmchilton.github.io/galaxy-tool-util-ts`, Guides → Draft Workflow Format | `curl` returns HTTP 200, and `…/guide/draft-format.md` serves the page. The label matches `docs/_sidebar.md` ("Guides" → "Draft Workflow Format"). |
| Foundry uses `draft-next-step` as the loop oracle and `draft-extract` to promote | `foundry` `origin/main`: `casts/claude/skills/advance-galaxy-draft-step/SKILL.md` |

## What changed from SRC

**Title and masthead**
- The title is now "The Galaxy Workflow Draft Format", with "Draft Format" in gold. It replaces "The Galaxy Workflow Foundry".
- A subtitle line, `class: GalaxyWorkflowDraft · gxformat2 that can say "not yet", checked by gxwf`, fills the space the authors left.
- The logo moved to the right edge, where the live tile was.

**Thesis**
- The hero is kept.
- The description now says what a draft is: concrete topology, deferred wrapper tier, what `gxwf` does, and "Only the boxes are incomplete, never the wiring."

**Metro: "What a Foundry run does" becomes "Where drafts fit"**
- The stations and both runs are the same.
- The Mold/cast line is gone.
- Station 4 is relabelled "write draft".
- A highlighter swatch covers stations 4–5, captioned "Highlighted, the loop: validate → next step → resolve, then promote."
- The gate tag at 5 now reads `draft-validate`. The tag at 9 stays `gxwf`, because a longer tag ran into "you are here … below".
- One clause says the route comes from a Galaxy Workflow Foundry run.

**Receipt**
- It is unchanged, except that the header's run date and times are replaced by "worked example".
- The refs are renumbered: [1] DengueSeq, [2] bacass.

**Notes**
- **1 Known knowns:** reworded to match the spec's must-be-concrete list.
- **2 Known unknowns:** as SRC.
- **3:** renamed "Valid at every step". It names `draft-validate --concrete`.
- **4:** "An agent, or you," so it covers the loop as a person runs it too.
- **5 Promote, don't translate:** as SRC.
- **6 Rails, not reminders → Reviewable intent:** each resolution is one commit; `_plan_*` intent can't go stale; `draft-next-step` has no hidden state.
- **7 Unknown unknowns:** the bacass evidence is kept. The quoted sentence is paraphrased without quote marks: "Checks prove shape, not biology. A validated workflow is a hypothesis about the analysis until it has run." I found no source for the original quote in `biodata_poster/research/` or `foundry-paper`.

**New cards**
- **"The format"** (left, in the old "Use it" slot): always concrete / may wait / intent / promote.
- **"Get started"** (bottom left): `npm install -g @galaxy-tool-util/cli`, `gxwf draft-validate --concrete …`, `gxwf draft-next-step …`.
- **"Read more"** (bottom right): the docs URL as plain text, the schema package, and a one-line Foundry context.

**Build**
- `extract.py` no longer records commit timestamps (the `at` field). It also re-runs `draft-validate` once if a cold ToolShed cache skipped a tool. The first build in this copy hit that and flipped one row to FAIL; a retry fixes it.
- `audit.py` now excludes the title, subtitle and refs from the body word count.
- The body word band is re-baselined to **626–692**, which is 659 ± 5%. SRC was 567: the format card and the Read more card add about 90 words.

## Dropped

- **Authors and affiliations.** This covers `meta.json` `authors`/`affils` and the audit exclusions tied to them. SRC had no `set document(author:)`.
- **Every QR.** The Foundry, Install the skills, Draft format docs and Preprint codes; the `[[QR: live results]]` tile and its caption; `make_qr.py` and its build step; `assets/qr-*.svg` and `qr.json`; `qr-code`, `tile`, `qr-tile`, `placeholder`; and the QR size gate.
- **Orbit and the preprint.** Note 6 as a whole ("Rails, not reminders", the Orbit text, `tximport`) and ref `[1] Baker …`.
- **Claude Code plugin-install lines.**
- **The run date and times** in the receipt header.

## Flagged, not decided

- **Pinned gxwf version.** "replayed with gxwf 1.15.0" stays in the receipt footnote as evidence. `extract.py` also pins `@1.15.0` in its install hint. Bump it, or keep it as the receipt's provenance?
- **Counts that drift.** None remain beyond the receipt's own numbers, which are pinned to commits.

## Open questions

1. Is the docs URL under `jmchilton.github.io` the right public pointer, or should there be a shorter or redirect URL? It is the one deliberate `chilton` hit in the final grep.
2. In the subtitle, "gxformat2 that can say 'not yet'": keep it, or name the CLI ("checked by gxwf") only?
3. Should "Get started" also show `gxwf draft-extract`? It is named in "The format" card's Promote line, and left out of Get started to keep each command on one line at 28 pt.
4. The highlighter swatch is a light grey in greyscale (`checks/preview-gray.png`). It is still visible, and the bold station labels back it up. Is that OK?
5. Slashed zeros (carried from SRC): Atkinson Mono's `0` in "BALANCE DUE 0".
6. **Word order of the name.** The docs page and sidebar call it "Draft Workflow Format". The masthead says "Galaxy Workflow Draft Format", as briefed, which matches `GalaxyWorkflowDraft`. Pick one, and align the docs or the poster to it.
