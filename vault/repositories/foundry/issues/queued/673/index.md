# #673 Source-read posture is set per-Mold; the Runtime Note reads as a blanket ban and adjacent phases disagree

[Issue](https://github.com/galaxyproject/foundry/issues/673) — opened 2026-10-12 by scottcain (AI-assisted), currently only `needs-triage`. No PR addresses it (`gh pr list --search 673 --state all` empty). No comments.

## Proposed labels

- `roadmap/off`: three small corrections (cast boilerplate wording, one Mold paragraph, one Mold section); none is backbone work. Alternative `roadmap/substep` needs a parent and none fits (see Parent).
- Parent: none. Closest `roadmap/main` are #59 (Nextflow process -> wrapper mapping) and #318 (draft-skill coordination); neither covers source-read posture. Not forcing one. If John wants it on the roadmap, a new `roadmap/main` for "run-feedback fixes from the rnaseq pipeline walk" would be needed (it is one of a family with #666, #672, #579, #580, #588).
- `priority/mvp`: it cost a real run (16 assets surrendered as unverified; a phase 7 correctness decision needed the Mold overridden). Could be `v2` for the pipeline-level part.
- `agent/implement`: all three fixes are specified in the issue. Part 1 (pipeline-level posture) has a design choice, so split or decide first.
- No blocker labels. gxwf/Galaxy not involved.

## Derived status

`queued`: from the proposed `agent/implement` (rule 4). Roadmap placement and fix shape are open questions below.

## Findings

Verified against `origin/main` (4b828886, 2026-10-23):

- The "Runtime Note" is not authored per-Mold. It is boilerplate emitted by the cast generator, `packages/build-cli/src/commands/cast-mold.ts`, and lands verbatim in 56 `casts/claude/skills/*/SKILL.md` files (e.g. `advance-galaxy-draft-step/SKILL.md:112`: "Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts."). So fix 2's first half is a one-line generator change plus recast, not a per-Mold edit. The issue's "set per-Mold" framing is only partly right: the ban is global, the contradicting Mold text is per-Mold.
- `content/molds/nextflow-summary-to-galaxy-reference-data/index.md:90` has the "say so in the brief and flag the asset as *rebuild-unverified* rather than re-parsing" instruction. Fix 2's second half edits this line.
- `content/molds/advance-galaxy-draft-step/index.md` has no evidence ladder: step 4 binds from the tool summary, step 5 checks computability from the ledger. Fix 3 is new text there (plus a possible schema/eval hook).
- Not verified: the run evidence (phase 2/3/7 claims, `wigToBigWig` sorting in kent `bwgCreate.c`); it lives in the reporter's run dir. The `wigToBigWig` finding is plausible but unchecked by me.
- Related open issues from the same reporter/run: #666 (summarize-nextflow resolver defects; the DOCUMENTED detector gap is probably there), #672, #579, #580, #588. #468 (author-galaxy-tool-wrapper has no validation step) also touches the wrapper-evidence model.

## Next

John decides: (a) roadmap placement/priority above; (b) fix 1 shape: pipeline-level statement vs. staged order (issue offers both); (c) whether to split into three PRs. Then `agent/implement`: generator wording change + recast (`make check`), nextflow-summary-to-galaxy-reference-data qualification, advance-galaxy-draft-step evidence ladder.
