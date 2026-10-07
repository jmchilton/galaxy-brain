# Debrief: rename_reference_whitespace

Prepared 2026-10-07. Source: `rename_reference_whitespace.md`. Proposal: `proposed_rename_reference_whitespace.md`.

## Research

- Repro rerun twice on dev `02a2e659909` (drafter + reviewer, scratch worktrees). All 5 template rows match: padded `#{name }` without `|` ops → `""`.
- #23900's fix merged as #23943. Code now in nested `resolve()`; strip still only on the `len(tokens) > 1` path. Strip-only-with-ops logic dates to 2012 (`bea4f17704d`).
- IWC `origin/main` `622f8f46`: VGP5 step 19 cutadapt newname `Cutadapt on #{library.input_1 }`, since `020c2e38a` (2023-09-27). Only padded ref among IWC's 6 `#{` templates.
- #23918 (fixes #23896) merged; #23877 open WIP docs PR. No duplicate issue.

## Rewrite

- Dropped agent/branch chatter, assign note, sequencing note (moot, #23943 merged).
- Context cites 🔀 #23943, 🎯 #23900, #23896/#23918, #23877.
- Proposed Approach: always strip. Alternatives: lint/warn on unresolved refs; reject padded refs.
- Reviewer: IWC permalink, 2012 provenance, "Tool parameter names".

## Leftover

- None blocking. IWC follow-up (drop the space in VGP5) not done — ask John.
- Assign John on filing (came from his #23900 work).
