# Factory Landing Pages Plan

Covers two `TODO.md` items: "John's Galaxy Brain Branch Factory" and "John's Galaxy Brain Review Factory" landing pages, plus pointing PR descriptions and reviews at them.

## Decisions

- Sources: `vault/agents/factory/BRANCH_FACTORY.md`, `vault/agents/factory/REVIEW_FACTORY.md`. Plain markdown, no frontmatter, readable on GitHub too.
- URLs: `/factory/` (hub), `/factory/galaxy-branches/`, `/factory/galaxy-reviews/` under `https://jmchilton.github.io/galaxy-brain`. Kebab-case to match site `slugify`.
- One page per factory: overview section + 3 deep-dive sections, 4 mermaid diagrams each.
- Audience: Galaxy PR authors/reviewers clicking through. Lead with what the checks mean and why the PR/review looks the way it does; agent plumbing stays as links.
- Philosophy: mined from existing docs, inline callouts beside the step each shapes. John prunes after.
- Design: markdown source + styled Astro shell (hero, stage nav strip, mermaid, styled callouts).
- PR link: last sentence of `## Context`. Review link: first line inside the `Automated Review Details` block.
- Hub: small `/factory/` page rendered from `vault/agents/factory/FACTORY.md` (reader-facing intro), with two cards and a "How the factory is built" link to `README.md` on GitHub. `Factory` entry in header nav. `README.md` stays builder-facing and isn't published.

## Site Infrastructure

Reuse the content-collection path, not `renderVaultDoc`. `renderVaultDoc` (used by `log.astro`) calls `marked` directly and skips the remark chain. Mermaid fences would come out as `<pre><code class="language-mermaid">` and `Base.astro` only renders `.mermaid`. Collections rendered with `render(entry)` (as `repositories/[repo]/[...path].astro` does) get `remarkMermaid`, wiki links and md links for free.

1. `site/src/lib/collection-patterns.ts`: add `FACTORY_FILES_PATTERN = ['agents/factory/FACTORY.md', 'agents/factory/*_FACTORY.md']`.
2. `site/src/content.config.ts`: add `factoryFiles` collection (passthrough schema, like `projectFiles`).
3. `site/src/pages/factory/[factory].astro`: static paths from an explicit map `{ 'galaxy-branches': 'BRANCH_FACTORY', 'galaxy-reviews': 'REVIEW_FACTORY' }`. It renders the entry inside a shell with a hero (title, one-line lede), a stage nav strip built from the `##` headings, and a link to the other factory.
4. `site/src/pages/factory/index.astro`: renders `FACTORY.md` in the same shell, plus two cards (title, URL, one-line blurb) from the same factory map as `[factory].astro`, plus a GitHub link to `factory/README.md`.
5. `site/src/components/Header.astro`: add `Factory` nav entry.
6. Philosophy callouts: author them as GitHub alerts (`> [!TIP]` + `**💭 <label>:** …`, label one of John's Dev Philosophy, Workflow Rule, Galaxy Reviewer Opinion or Stealing Best Practices) so they render on GitHub as well. Add a small `remark-github-alerts.ts` plugin that turns alert blockquotes into `<aside class="callout callout-tip">` and styles them in `global.css`. This is reusable by every vault note, not just the factory pages.
7. Links inside the factory `.md` files to `agents/_shared/*` and `agents/gx_*` docs use absolute GitHub blob URLs, the same convention as the existing CHECK_LINKs. Those docs aren't on the site, so relative links would break there.
8. Docs: `agents/factory/FACTORY.md` and `*_FACTORY.md` are a deliberate exception to `agents/**` being off-site. Update `_shared/NOT_VAULT_NOTES.md` and the Static Site section of `.claude/CLAUDE.md`.

## Branch Factory Content (`BRANCH_FACTORY.md`)

Ground each diagram in the actual docs while writing. Re-read `gx_issues/AGENTS.md`, `gx_workhorse/AGENTS.md`, `gx_branches/AGENTS.md`, `_shared/MY_BRANCHES_INDEX.md`, `_shared/GX_PROCESS_HARDEN_BRANCH.md`, `_shared/GX_IMPLEMENTATION_HANDOFF.md` and `_shared/GX_PR_DESCRIPTIONS.md`.

1. **Overview**: gx_issues → gx_workhorse → gx_branches → PR. Mark John's gates: issue pick/approval, `branches_need_decision` (BLOCKED / scope park), final review → `branches_need_pr` checkbox, SHA-pinned approval.
2. **gx_issues**: backlog triage (ISSUES_INDEX preferences) → `to_file/` → PREPARE_TO_FILE → filed → ISSUES.md cross-ref → hand-off to a workhorse.
3. **gx_workhorse**: plan (direct or phased with a review between phases) → baseline tests commit → implement → normal subagent review → initial debrief → HARDEN box (scope evaluation, test challenges, thermo-nuclear, second-model review, screenshots, baseline refactor) → rescope / park → READY / BLOCKED / ABANDON → handoff (+ issue comment via RECORD_IMPLEMENTATION).
4. **gx_branches**: MY_BRANCHES section flow (`implemented_needs_ci` → `implemented` → `need_polish` → `ready_for_final_review` → `need_pr` → opened PR → `ci_wait` / `draft_ready` / `ready` / `attention`), plus the automatic actions (reclassify, rebase-when-unblocks, undraft green, open approved PRs, screenshot hosting).
5. A "What the Agentic Checks in a PR mean" section linking each CHECK_LINK. This is the main reason a PR reader clicks through.

Candidate philosophy callouts (mine from the docs; John prunes):
- Baseline tests first: pin current behavior before changing it, split-able into their own PR.
- Red-to-green and never weaken tests to pass.
- Old, established codebase: reuse existing abstractions and leave behind new reusable ones (scope eval, thermo review).
- Scope discipline: rescope into an alt branch rather than silently expanding.
- Alt branches kept so reviewers see the roads not taken.
- Risk assessment and anticipating misunderstandings (PITCH_ADVICE, GX_ASSESSING_RISK).
- Human approval pinned to a SHA; agents never publish without John's checkbox.
- Galaxy test layers are slow: run only the touched tests one at a time and let CI cover the rest.

## Review Factory Content (`REVIEW_FACTORY.md`)

Sources: `gx_reviews/AGENTS.md`, `_shared/PROCESS_INITIAL_REVIEW.md`, `_shared/reviewers/index.md` + profiles, `_shared/REVIEW_FOCUS.md`, `_shared/PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md`, `_shared/PROCESS_RESPOND_TO_INITIAL_REVIEW.md`.

1. **Overview**: PR picked/queued → reviewer profiles in parallel → verify & fix → compose response → John's checkbox action → posted → follow-up rounds.
2. **Profiles**: registry → applicable profiles (default, gx/generic test challenger, gx/generic risk assessment, thermo_review, learning_galaxy) → one subagent each, with effort rules (release-branch fixes are low effort, risk assessments are low).
3. **Verify**: effort estimate per finding → `pr_<N>_review_<n>` branch with one commit per finding when under ~200 lines → `verified_review.md` (deduped, renumbered P1–P3, `(implementation verified)`), with disproved findings filtered out.
4. **Respond**: compose `initial_review_response.md` → John edits → `initial_response_action.md` checkboxes (approve / comment / request changes / PR from review branch / push / issues) → follow-up per RESPOND process.
5. A "Reading a review from this factory" section: P1/P2/P3 meaning, what "implementation verified" means, what the review branch is and isn't, and how to push back.

Candidate callouts: verified findings only, filtering out disproved ones; a human response is owed and P3s are optional; the ball is the author's once delivered (no nudging); fixes come as concrete commits, not just prose; release-branch PRs get lighter-weight challenges.

## Process Doc Edits

- `_shared/GX_PR_DESCRIPTIONS.md` "Place PR in Context": add a rule that the last sentence is always `Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).` `## Context` is therefore always present.
- `_shared/PROCESS_INITIAL_REVIEW.md` (`initial_review_agents.md` template, ~line 78): add the first line inside `<details>`, `Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).`
- No backfill: existing `pr_description.md` files, open PRs and review records stay as they are. Only new descriptions and reviews get the links.
- `_shared/NOT_VAULT_NOTES.md`: correct the stale claim that `repositories/**` is off-site (the `repositoryFiles` collection publishes it).
- `factory/TODO.md`: drop both items when done.

## Testing (red-to-green)

1. `collection-patterns.test.ts`: the factory pattern matches `agents/factory/FACTORY.md`, `BRANCH_FACTORY.md` and `REVIEW_FACTORY.md`, and not `agents/factory/README.md`, `TODO.md`, `FACTORY_LANDING_PAGES_PLAN.md` or `agents/_shared/*.md`. Also confirm `VAULT_PATTERN` still excludes them. Red first.
2. `remark-github-alerts.test.ts`: a `> [!TIP]` blockquote becomes an `aside.callout-tip`, and plain blockquotes are untouched. Red first.
3. `make site-build`, then a smoke check: `dist/factory/galaxy-branches/index.html` has 4 `class="mermaid"` blocks, as does `galaxy-reviews`, and neither page has a relative `.md` href. Consider codifying this as a vitest that reads `dist/` if the existing suite has a pattern for it.
4. `make site-test`, `make validate`, `make check-index` (should be unaffected).
5. Manual: `make site-dev` and check both themes, the mermaid dark-mode re-render, phone width, and GitHub rendering of the raw `.md` (alerts and mermaid).

## Order

1. Infra + tests (collection, alerts plugin, pages, nav) with stub `*_FACTORY.md` files containing one mermaid block each.
2. Branch Factory content.
3. Review Factory content.
4. Process doc edits + NOT_VAULT_NOTES/CLAUDE.md updates + TODO cleanup.

## Unresolved Questions

None.

Resolved: hub copy lives in a third source, `factory/FACTORY.md`; use `jmchilton.github.io/galaxy-brain/...` URLs for now (the publishing TODO is still in progress); no backfill; always-present `## Context` is fine; fix the stale `NOT_VAULT_NOTES.md` claim; the wording is "Developed with" for PRs and "Reviewed with" for reviews.
