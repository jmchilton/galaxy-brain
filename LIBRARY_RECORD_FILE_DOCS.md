# File Docs for repository records — implementation plan

Document the files that live in `vault/repositories/<repo>/<kind>/<status>/<id>/` records (branches, issues, reviews): a global default per kind, overridable per repository, shown to agents as the file conventions and on the site as per-page help.

## Decisions

- Name: File Docs. One `FILE_DOCS.md` per kind, next to the data:
  - `vault/repositories/_defaults/<kind>/FILE_DOCS.md` — global default. `_defaults` is not a repository: hidden from `/repositories/`, but its File Docs pages render.
  - `vault/repositories/<repo>/<kind>/FILE_DOCS.md` — repository-specific (e.g. Galaxy's and Pulsar's `index.md` differ).
- A repository section with the same pattern replaces the default's section.
- Descriptive only. No lint, no warnings, no failures: record directories may hold stray plans, questions, docs, scripts, etc.
- Dated variants are documented as patterns (`review-*.md`), not pushed back to one name.
- Scope is repository records only, not `vault/agents/<name>/` files (`TICK.md`, `TASKS.md`, …).

## Format

```md
# Galaxy Branch File Docs

## index.md
Ongoing debrief, no frontmatter. Links supporting files near the top.

## pr_description.md
Proposed PR body; follow [GX_PR_DESCRIPTIONS](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PR_DESCRIPTIONS.md).

## alts/*.md
One per `<branch>_alt_<short_description>` branch: what it does, how it differs.

## earlier_drafts/**
Superseded copies, numbered by round. Don't edit.
```

- `# ` title, then one `## ` section per pattern. Heading text is a glob relative to the record directory; surrounding backticks are stripped; comma-separated patterns share one body.
- `*` matches within a path segment, `**` across segments (including none). Folder pages resolve as `<dir>/`, so `subagents/**` also documents the `subagents/` page.
- Resolution: repository sections first, then defaults, each in document order; first match wins. This makes same-pattern replacement fall out.
- Patterns may name non-markdown files and folders (`screenshots/`); they document conventions for agents even though the site only renders `.md`.
- Bodies are short and link to process docs rather than restating them. `agents/**` is off the site, so process-doc links use GitHub URLs (as `GX_PR_DESCRIPTIONS.md` check links already do).

## F1 — Library

- `site/src/lib/file-docs.ts`: parse a `FILE_DOCS.md` into `{title, sections: [{patterns, body}]}`; glob → regex; `resolveFileDoc(repoDocs, defaultDocs, recordRelPath)`; loader reading both files for a `<repo>/<kind>` via `fs` (like `render-vault-doc.ts`).
- Tests first (`site/src/lib/file-docs.test.ts`, `make site-test`): exact name, `*` not crossing `/`, `**` crossing and matching empty, folder path `<dir>/`, backticks, comma patterns, repository-overrides-default, first match wins, no match → null, missing files → null.

## F2 — Site integration

- `repository-records.ts`: `_defaults` is not a repository — excluded from `/repositories/` and its counts; its `FILE_DOCS.md` pages still render (test in `repository-records.test.ts`).
- `repositories/[repo]/[...path].astro`: collapsed `<details>` "About this file" under the status line with the resolved section rendered via `marked`, plus a link to the `FILE_DOCS.md` page it came from. Record root resolves `index.md`. No match → no panel.
- `FileTree`: first sentence of each child's resolved section as a hover title (optional `hint` prop; project pages pass none).
- `make site-build` smoke: a Galaxy branch record shows `index.md`, `pr_description.md`, and `subagents/` help; a Pulsar review shows its repository-specific `index.md` help.

## F3 — Seed docs

- `_defaults/{branches,issues,reviews}/FILE_DOCS.md` from the "Contents" sections of `vault/agents/_shared/REPOSITORY_{BRANCHES,ISSUES,REVIEWS}.md`. Review names (`review.md`, `review-*.md`, `draft-review.md`) are shared by Galaxy and Pulsar, so they live in the defaults rather than per-repository files.
- `galaxy/branches/FILE_DOCS.md` from the recurring names and the process docs that define them (hardening debriefs, PR text, `subagents/**`, `earlier_drafts/**`, `alts/*.md`, …).
- `galaxy/issues/FILE_DOCS.md` (`raw.md`, `proposal.md`, `debrief.md` from `gx_issues/PREPARE_TO_FILE.md`).
- Other repositories get their own File Docs only once they diverge from the defaults.

## F4 — Agent wiring

- `REPOSITORY_*.md` "Contents" sections point to the default and repository `FILE_DOCS.md` for the kind: prefer a documented name over inventing one; add a section when a new recurring file appears; undocumented files are fine. Per-file sentences that moved to File Docs (`pr_description.md`, `screenshots/`) are dropped there.
- `GX_DEVELOPMENT.md` "Alt Branches" keeps its rules, including where the alt is described; `galaxy/branches/FILE_DOCS.md` documents the `alts/*.md` file.
- Seeding surfaced `gx_workhorse/AGENTS.md` asking for `implementation_initial_debrief.md` while 42 records used `initial_implementation_debrief.md`; the process doc now matches the records.
