# Ingesting a PR debrief

Write a debrief when a PR teaches us something: it stalled, was closed, was redone, or landed unusually well. Debriefs are raw evidence. Rules we're convinced of live in `../../_shared/gx_pr_checklists/`, `../../_shared/GX_PR_DESCRIPTIONS.md` and `../../workflow_core/TODOS.md`.

## Where

- Path: `<area>/<positive|negative>/<number>_<short_slug>.md`. No frontmatter.
- `<area>` is `general` or `workflows`. Don't add another without John agreeing.
- Add a row to that directory's README table.

## Gather

Read the full review history, any linked issue, and anything that replaced the PR. Never post, comment or react on GitHub.

## Write

- Cover what happened, why it stalled or landed, what would have changed the outcome, and a one-line signal.
- Quote the reviewer verbatim and cite PR numbers for every claim.
- Separate real praise from routine approval. Don't inflate. A finding that contradicts an existing rule is the most valuable kind.

## Promote

John decides. A finding moves into the checklists or `TODOS.md` only as an actionable DO or DON'T for the current workflow. Everything else stays in the debrief.
