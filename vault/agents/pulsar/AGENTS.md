# Pulsar Maintenance

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

Review notes for `galaxyproject/pulsar` pull requests, issues, feature development, plus the rules for keeping the local worktrees in sync with what's worth reviewing.

In the following files PROJECT is `pulsar`.

@../_shared/WORKTREES.md
@../_shared/REVIEW_NOTES.md
@../_shared/REVIEW_FOCUS.md
@../_shared/ISSUES_INDEX.md
@../_shared/PULL_REQUESTS_INDEX.md

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
