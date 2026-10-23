# foundry#676 — cast bundles cite unpackaged references (`parsed-tool`, `summarize`, `draft-next-step`)

Issue: https://github.com/galaxyproject/foundry/issues/676 (scottcain, AI-posted, `needs-triage`)
Branch: `issue-676-package-refs` on `origin`, worktree `~/projects/worktrees/foundry/branch/issue-676`, commit `3abf679c`. 
PR: https://github.com/galaxyproject/foundry/pull/704 (opened 2026-10-22; body from [pr_description.md](pr_description.md)).
PR #704 merged 2026-10-22 (`35f525ac`); issue closed. Worktree and local branch removed 2026-10-23.

## Triage (2026-10-22)

All three claims verified on `origin/main`; each is a Mold `references:` packaging fix.

1. `[[parsed-tool]]` (`content/schemas/parsed-tool.md`, companion `parsed-tool.schema.json`) is packaged
   only by `summarize-galaxy-tool` (on-demand schema ref). `advance-galaxy-draft-step` and
   `implement-galaxy-tool-step` package `galaxy-tool-summary.schema.json`, whose `parsed_tool` placeholder
   points at `[[parsed-tool]]`, but not the schema. Upstream ParsedTool has `whens[]` /
   `is_default_when` (`@galaxy-tool-util/schema` `gx-conditional`).
2. `content/cli/galaxy-tool-cache/summarize.md` exists; `advance-galaxy-draft-step` cast packages
   `add`, `list` (and draft-*) CLI sidecars but not `summarize`.
3. `content/cli/gxwf/draft-next-step.md` already answers the nesting question ("Descends into draft
   subworkflows; `step` is the full path, leaf last"), but the `*-summary-to-galaxy-template` casts
   package only `draft-validate.json`.

## Plan

- Add on-demand `[[parsed-tool]]` schema ref to `implement-galaxy-tool-step` and `advance-galaxy-draft-step`;
  one line in `implement-galaxy-tool-step` state guidance: a conditional's case index is its `whens[]`
  position in `parsed_tool`, `is_default_when` marks the default. Don't settle whether to emit
  `__current_case__` (that's #649).
- Add on-demand `[[summarize]]` CLI ref to `advance-galaxy-draft-step`, trigger = step 3 reuse branch;
  say reuse regenerates with `galaxy-tool-cache summarize <tool_id> --tool-version <v> --output <file>`.
- Add on-demand `[[draft-next-step]]` CLI ref to the template Molds (nextflow, cwl, freeform,
  workflow-brief) for the subworkflow-factoring decision.
- Recast, checks, Mold eval touch if a property fits.
