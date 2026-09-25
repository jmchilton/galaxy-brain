# Planemo PR Reviews

Review notes for `galaxyproject/planemo` pull requests, plus the rules for keeping the
local worktrees in sync with what's worth reviewing.

## Source of truth

- `PULL_REQUESTS.md` — the review queue: a flat list of PR numbers under `PRs To Review:`.
  No frontmatter, no structure beyond `- <number>` lines. Adding a number there is the
  signal to review.
- `ISSUE_TRIAGE.md` — issue triage status (blocked issues, issues with open PRs). Not a
  review queue; it doesn't drive worktrees.

`index.md` is intentionally empty.

## Worktree lifecycle

Worktrees live at `~/projects/worktrees/planemo/pr/<PR_NUMBER>/`, managed by `ghwt`.

**Add** — driven by the document. A PR number that appears in `PULL_REQUESTS.md` with no
corresponding worktree gets one:

```sh
ghwt create planemo <PR_NUMBER>
```

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed for a few days, tear its worktree down:

```sh
ghwt rm planemo <PR_NUMBER>
```

The asymmetry is intentional. Removing a number from `PULL_REQUESTS.md` does **not** mean
destroy the worktree — reviewing may still be in flight, or the note may have been pruned
for tidiness. Only a merged/closed PR that has settled for a few days justifies removal.
Conversely, a still-open PR keeps its worktree even after it drops off the list.

Check PR state with `gh pr view <PR_NUMBER> --repo galaxyproject/planemo --json state,mergedAt,closedAt`.
Note the command is `ghwt rm`, not `ghwt remove`.

## Writing reviews

Review notes go here, one file per PR, alongside `PULL_REQUESTS.md`:

```
vault/agents/planemo/<PR_NUMBER>_<short_description>.md
```

`<short_description>` is a lowercase snake_case slug of the PR title, e.g.
`1678_use_gravity_multiprocessing_for_modern_galaxy.md`.

**Run reviews in subagents.** Reading a Planemo PR's diff plus surrounding code burns a
lot of context; keep the main session as a coordinator. One subagent per PR, each told to
write its own file at the path above and return only a short summary.

## These files are not vault notes

`vault/agents/**` is excluded from the vault's frontmatter contract — `agents` is in
`SKIP_DIRS` in `validate_frontmatter.py`, and `!agents/**` is in the glob in
`site/src/content.config.ts`. That covers `index.md` here too, despite `index.md` being
the validated entry point in `projects/` and `papers/`. So:

- No YAML frontmatter required. Don't add any; it buys nothing here.
- They don't appear in `Index.md`, `Dashboard.md`, or the Astro site.
- Wiki links out to real vault notes (`[[PR 21842 - ...]]`) still work in Obsidian and are
  fine to use, but nothing links back automatically.

If a review matures into something worth publishing, promote it into `vault/research/`
as a proper note (`type: research`, `subtype: pr`) rather than adding
frontmatter in place.

## User Interaction

When asked to implement features, fix bugs, tweak PRs, etc. - when the work is "doneish" and you'd like to report the work to John - please make sure it is committed and pushed to a remote. Send John the URL of the branch. Obviously don't commit/push work that contains secrets or security issues - those things need to be reported to John immediately.

## Review focus

Per the user's standing preferences, weight reviews toward:

- Reuse of existing abstractions — this is a very old, well-established codebase; new code
  that reinvents something is the main concern.
- Whether the change leaves behind a reusable abstraction, or just accretes.
- Python imports at module top level, not buried in functions (unless commented why).
- Test coverage, and whether tests were weakened rather than the implementation fixed.
- Can unit tests be replaced with integration tests?
