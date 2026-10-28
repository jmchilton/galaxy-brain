# Repository records on the site — implementation plan

Render `vault/repositories/<repo>/<kind>/<status>/<id>/` records (branches, issues, issue incubator, reviews) on the Astro site with URLs that survive status moves, plus a landing page per repository.

## Decisions

- Kinds: `branches`, `issues`, `issues_incubator`, `reviews` ("PRs" in early notes meant reviews). `issues_incubator` holds issue drafts not yet filed (`incubating`, `internal`, `rejected`).
- Site-only persistence. Vault directories keep their status segment and records still move; Obsidian links still break on moves. Site URLs drop the status segment:
  `repositories/<repo>/<kind>/<status>/<id>/<rest>` → `/repositories/<repo>/<kind>/<id>/<rest>/`.
- Pages are named "repository" (`/projects/` is already the project note type).
- `agents/**` stays off the site for now; record links into it render as dead links.

## R1 — Status-free URLs

- One shared module, `site/src/lib/vault-urls.ts`, owns slugify + vault-path→URL mapping. Replaces the copies in `content.config.ts`, `remark-md-links.ts`, `remark-wiki-links.ts`, `wiki-links.ts`, `project-paths.ts`.
- `remark-md-links` maps relative `.md` links through it, so record-to-record links are status-free.
- Stale-path repair: a relative link to a record path that no longer exists, but whose `<repo>/<kind>/<id>/<rest>` exists under another status, is rewritten (same status-free URL) and logged as a build warning — the warning list is the vault link-fix to-do list.
- Build fails if one `<repo>/<kind>/<id>` exists under two statuses (half-finished move).

## R2 — Repository pages

- `repositoryFiles` content collection over `repositories/**/*.md`, no schema (records have no frontmatter).
- `/repositories/` — repository list with per-kind counts.
- `/repositories/<repo>/` — landing page: branches, issues, issue incubator, reviews grouped by directory status, record title from the first `# ` heading.
- `/repositories/<repo>/<kind>/<id>/…` — record `index.md` with status badge + file tree of sub-files; sub-file and folder pages with breadcrumbs. Reuses `FileTree.astro` and the `projects/[project]/[...path].astro` pattern.
- Header nav + dashboard link to `/repositories/`.
- Only `.md` files render; logs, screenshots, patches etc. are not published.

## Tests

- vitest in `site/` (`make site-test`) for `vault-urls.ts`: slugify parity, status strip, record path parsing, stale-path repair, collision detection.
- `make site-build` smoke: a record moved to `merged/` in `53ef77df` (`client_test_fixture_cleanup`) renders at its status-free URL, and the stale `active/` links to it from `projects/just_jesting_around/` resolve there.

## R3

Placeholder from the original notes; not yet specified.
