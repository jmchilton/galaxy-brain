# Galaxy Branch File Docs

Galaxy conventions for files in `repositories/galaxy/branches/<status>/<branch>/`. Sections here replace the [default Branch File Docs](../../_defaults/branches/FILE_DOCS.md) with the same pattern; other files fall through to them.

## pr_description.md

Proposed PR description. Structured per [GX_PR_DESCRIPTIONS](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PR_DESCRIPTIONS.md).
## pr_titles.md

Three to five PR title options as a markdown list, written while polishing ([POLISH_BRANCH](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/POLISH_BRANCH.md)). Release-branch targets prefix each title with the version tag, e.g. `[26.0]`.

## pr_checklist.md

John's PR checklist answered from the diff while polishing ([POLISH_BRANCH](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/POLISH_BRANCH.md)). Cited as an Agentic Check in the PR description.

## pr_tags.md

Recommended labels, written while polishing: exactly one `kind/` label and the `area/` labels that fit.

## brain_research.md

galaxy-brain documents relevant to the branch, and research requests it queued, collected before implementing ([GX_PROCESS_BRAIN_RESEARCH](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_BRAIN_RESEARCH.md)). Optional reading for later steps.

## initial_implementation_debrief.md

Debrief of the first implementation pass. Kept when re-hardening moves the other debriefs into `earlier_drafts/`.

## implementation_debrief.md

Summary of choices, the final implementation, and the scope decision, written at hand-off ([GX_IMPLEMENTATION_HANDOFF](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md)). On rework, the previous one moves to `earlier_drafts/N/`.

## implementation_rescope_debrief.md

Summary of a re-scope: what changed and why. The original scope is kept as an alt branch (see `alts/*.md`).

## polish_debrief.md

Debrief of the polishing pass ([POLISH_BRANCH](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/POLISH_BRANCH.md)).

## scope_evaluation.md

Scope evaluation report from hardening ([GX_PROCESS_SCOPE_EVALUATION](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)). Its first paragraph carries the recommendation; cited as an Agentic Check in the PR description.

## thermo_nuclear_review.md

Strict maintainability review from hardening ([prompt](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)). Cited as an Agentic Check in the PR description.

## test_challenges_debrief.md

Debrief of the test challenges ([GX_PROCESS_CHALLENGE_TESTS](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)). Regenerated, with the old one moved to `earlier_drafts/N/`, when more than three tests change.

## codex_review.md

Debrief of the second frontier model review from hardening ([GX_PROCESS_HARDEN_BRANCH](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_HARDEN_BRANCH.md)). Cited as an Agentic Check in the PR description.

## baseline_refactor.md

Report on refactoring the base branch ahead of the change ([GX_PROCESS_REFACTOR_BASELINE](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)). Cited as an Agentic Check in the PR description.

## screenshot_debrief.md

Index of the captures in `screenshots/`, plus any problems recording them ([GX_PROCESS_SCREENSHOTS](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCREENSHOTS.md)).

## subagents/**

Review debriefs from normal review subagents ([GX_DEVELOPMENT](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_DEVELOPMENT.md)).

## alts/*.md

One per `<branch>_alt_<short_description>` branch, named `<short_description>.md`: what the alt does and how it differs from this branch. Alts have no branch directory of their own; this one tracks them ([GX_DEVELOPMENT](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_DEVELOPMENT.md)).

## earlier_drafts/**

Superseded debriefs and screenshots, moved into `earlier_drafts/N/` (N = 1, 2, 3…) on rework or re-hardening. Historical; don't edit.
