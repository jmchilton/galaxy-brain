# Pulsar PR Reviews

Review notes for `galaxyproject/pulsar` pull requests, plus the rules for keeping the
local worktrees in sync with what's worth reviewing.

## Source of truth

`index.md` in this directory — a flat list of PR numbers under `PRs To Review:`. No
frontmatter, no structure beyond `- <number>` lines. Adding a number there is the signal
to review.

## Worktree lifecycle

Worktrees live at `~/projects/worktrees/pulsar/pr/<PR_NUMBER>/`, managed by `ghwt`.

**Add** — driven by the document. A PR number that appears in `index.md` with no
corresponding worktree gets one:

```sh
ghwt create pulsar <PR_NUMBER>
```

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed for a few days, tear its worktree down:

```sh
ghwt rm pulsar <PR_NUMBER>
```

The asymmetry is intentional. Removing a number from `index.md` does **not** mean
destroy the worktree — reviewing may still be in flight, or the note may have been pruned
for tidiness. Only a merged/closed PR that has settled for a few days justifies removal.
Conversely, a still-open PR keeps its worktree even after it drops off the list.

Check PR state with `gh pr view <PR_NUMBER> --repo galaxyproject/pulsar --json state,mergedAt,closedAt`.
Note the command is `ghwt rm`, not `ghwt remove`.


## Writing reviews

Review notes go here, one file per PR, alongside `index.md`:

```
vault/reviews/pulsar/<PR_NUMBER>_<short_description>.md
```

`<short_description>` is a lowercase snake_case slug of the PR title, e.g.
`23170_workflow_invocation_export.md`.

**Run reviews in subagents.** Reading a Pulsar PR's diff plus surrounding code burns a
lot of context; keep the main session as a coordinator. One subagent per PR, each told to
write its own file at the path above and return only a short summary.

## These files are not vault notes

`vault/reviews/**` is excluded from the vault's frontmatter contract — `reviews` is in
`SKIP_DIRS` in `validate_frontmatter.py`, and `!reviews/**` is in the glob in
`site/src/content.config.ts`. That covers `index.md` here too, despite `index.md` being
the validated entry point in `projects/` and `papers/`. So:

- No YAML frontmatter required. Don't add any; it buys nothing here.
- They don't appear in `Index.md`, `Dashboard.md`, or the Astro site.
- Wiki links out to real vault notes (`[[PR 21842 - ...]]`) still work in Obsidian and are
  fine to use, but nothing links back automatically.

If a review matures into something worth publishing, promote it into `vault/research/`
as a proper note (`type: research`, `subtype: pr`) rather than adding
frontmatter in place.

## Review focus

Per the user's standing preferences, weight reviews toward:

- Reuse of existing abstractions — this is a very old, well-established codebase; new code
  that reinvents something is the main concern.
- Whether the change leaves behind a reusable abstraction, or just accretes.
- Python imports at module top level, not buried in functions (unless commented why).
- Test coverage, and whether tests were weakened rather than the implementation fixed.
