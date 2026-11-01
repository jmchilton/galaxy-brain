# Workflow comment `color` is a free string in gxformat2 and gxwf, but Galaxy accepts only a 10-colour enum, so `purple` passes validation and fails import

- Target: galaxyproject/gxformat2 (schema source `schema/v19_09/workflow.yml`; generated `gxformat2/schema/gxformat2.py:507` types `BaseComment.color` as `None | str`), then jmchilton/galaxy-tool-util-ts (its effect schemas are generated from the same source: `workflow/raw/gxformat2.effect.js:569`, `raw/native.effect.js:281`). Foundry side: the validate Mold has no check that would have caught it. Foundry tracking needed: yes (one line in finding 18's gxwf tracking issue, plus the validate-Mold item below).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 4 (template wrote 3 `color: purple` frames), phase 9 (validate passed), phase 10 attempt 1 (339 s, import HTTP 400), 2026-11-01. Ledger `gxwf-validate-accepts-invalid-comment-color` (major), `validate-workflow-mold-omits-install-and-user-tool-checks` (minor). Repair R1.
- Existing issues/PRs: gtu [#171](https://github.com/jmchilton/galaxy-tool-util-ts/issues/171) (open): the sibling case, a frame with *no* `color` passes gxwf and `convert --to native` drops it, Galaxy 400s. None in gxformat2 for the enum (#135 added comments, closed).

## Symptom
`gxwf validate --strict --connections` and `gxwf lint` exit 0 on both workflows. planemo installs 37 repos, then `import_workflow` gets 400 err_code 400008, loc `(frame, color)`, "Input should be none|black|blue|turquoise|green|lime|orange|yellow|red|pink". 0 workflows imported.

## Root cause
- Galaxy: `lib/galaxy/schema/workflow/comments.py:13` (release_26.1) `WorkflowCommentColor = Literal["none", "black", "blue", "turquoise", "green", "lime", "orange", "yellow", "red", "pink"]`, enforced on `BaseComment.color` at import.
- gxformat2 0.28.0 (Galaxy venv) and 0.29.1 (planemo master venv) both declare `color: None | str` ("Display color of the comment (e.g. "none", "blue")"). gxwf 1.15.0's schemas mirror that. No validator or lint rule compares against Galaxy's palette.
- Foundry's `galaxy-workflow-comments` note §4 lists the right ten colours, so the template Mold ignored a correct note; nothing deterministic backs it.
- `validate-galaxy-workflow` runs only `gxwf validate`; the run's extra checks (install pins, user-tool sources, images) came from the caller, not the Mold.
Confidence: high.

## Evidence
`planemo/attempt1/notes.md`; offline check after R1: every comment of both converted workflows validates against Galaxy's `WorkflowCommentModel` (17 and 10 comments). Schema lines as above.

## Proposed fix
1. gxformat2: make `color` an enum matching `WorkflowCommentColor` (and keep `none`), regenerate the Python and TS schemas; validation fails on `purple`.
2. gtu: regenerate; until then a lint rule `comment-color-not-in-galaxy-palette`. Fold with #171 (missing colour) so both import-time comment rejections are caught locally.
3. Foundry: `validate-galaxy-workflow` gains a "Galaxy import parity" step: validate converted comments against Galaxy's comment model (or the gxwf rule once shipped), plus the install-pin, `validate-tool-source`, image and data-table checks the run did ad hoc, reported in a `supplementary_checks` block. Template Mold eval: comment colours from the note's palette.

## Draft issue
**gxformat2 — Title:** Comment `color` should be the Galaxy palette enum, not a free string

Galaxy validates workflow comments with `WorkflowCommentColor = Literal["none","black","blue","turquoise","green","lime","orange","yellow","red","pink"]` (`lib/galaxy/schema/workflow/comments.py`), and rejects the whole workflow at import (400008) on any other value. gxformat2 0.29.1 types `BaseComment.color` as `None | str`, so `color: purple` validates in gxformat2 and in tools generated from its schema (gxwf), then fails at Galaxy import. Proposal: declare the enum in `schema/v19_09/workflow.yml` and regenerate. Seen in an nf-core/viralrecon port (3 frames, one 6-minute planemo attempt lost).

**gtu comment on #171:**
> Same failure class with a present but out-of-palette value: `color: purple` on a frame passes `gxwf validate --strict --connections` and `gxwf lint` (1.15.0) and Galaxy release_26.1 rejects the import (400008, loc `(frame, color)`). The schema types `color` as a free string (from gxformat2); a palette check (enum or lint) would cover both this and the missing-colour case.
