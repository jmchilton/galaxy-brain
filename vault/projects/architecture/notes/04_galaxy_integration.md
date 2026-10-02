# 04 - Galaxy Integration: Migration Design

## TL;DR

- *Update 2026-10-01: `gen_authoring_doc.py` is gone from `dev`; current precedents (`directives.yml`, `collection_semantics.yml`, `config_schema.yml`) are in MIGRATION_PLAN Key decision: content format.*
- Galaxy already has the exact pattern we need: **YAML source in-repo -> MyST generated at doc-build time by a script in `doc/`, gitignored output**. See `doc/Makefile` `GENERATED_RST` (`source/dev/user_defined_tools_authoring.md` from `doc/gen_authoring_doc.py` + `authoringHelp.yml`; `source/dev/schema.md` from `doc/parse_gx_xsd.py`). Architecture topics should plug into that same hook.
- **Zero new Python deps**: our tooling imports only `pydantic`, `jinja2`, `pyyaml` (all pinned in `lib/galaxy/dependencies/dev-requirements.txt` / `pinned-requirements.txt`). `myst_parser` + `sphinx_rtd_theme` already in Galaxy's `doc/source/conf.py`.
- **No Java/Node in docs CI**: commit rendered SVGs. Galaxy precedent: `doc/source/dev/tool_state_*.plantuml.{txt,svg}` both committed, rendered by hand via `doc/source/dev/image.Makefile` (downloads `plantuml.jar`, gitignored). This reverses our current `.gitignore` policy (renders gitignored).
- Recommended layout: `doc/architecture/` (topics, images, model, generator) -> generated `doc/source/dev/architecture/*.md` (gitignored). Galaxy owns source; GTN slides become an export.
- Biggest pitch risk: **this was tried before**. jmchilton + remimarenco added in-repo architecture slides in 2016 (#2244, #3588, commit `3e737c99ea2`); Nicola Soranzo removed them in 2019 ("now available at GTN", `8acd07a50fa`). Vestigial `docs-slides-ready` target + `scripts/slideshow/` still in Galaxy `Makefile`. Pitch must say why this time differs.
- First PR: generator + 2 code-centric topics + toctree entry. No slides export, no agent stuff.

## Current Galaxy doc infra (facts, origin/dev @ 8cecbebdf98)

| Thing | Where / what |
|---|---|
| Sphinx config | `doc/source/conf.py`: `extensions = ["myst_parser", "sphinx.ext.intersphinx", "sphinx.ext.mathjax"]` (+autodoc/viewcode unless skipped); `myst_enable_extensions = [dollarmath, attrs_block, deflist, substitution, colon_fence]`; `myst_heading_anchors = 5`; `source_suffix = [".rst", ".md"]`; `exclude_patterns = ["**/_*.*"]`; `html_theme = "sphinx_rtd_theme"`. No plantuml/mermaid extensions. |
| Build entry | root `Makefile` `docs:` -> `make -C doc clean html`; `docs-develop` sets `GALAXY_DOCS_SKIP_VIEW_CODE=1`. |
| Generated-page hook | `doc/Makefile`: `GENERATED_RST = source/dev/schema.md source/dev/user_defined_tools_authoring.md source/admin/config_logging_default_yaml.rst`; every builder target depends on it (`html: $(GENERATED_RST)`); outputs gitignored in root `.gitignore` (lines ~157-162, also `doc/source/dev/plantuml.jar`). |
| CI | `.github/workflows/docs.yaml`: runs on all push/PR except `client/**`, `lib/galaxy_test/selenium/**`, `packages/**`; Python **3.10**; `uv pip install -r requirements.txt -r lib/galaxy/dependencies/dev-requirements.txt sphinxcontrib-simpleversioning`; `make docs`; deploys to **S3 `s3://galaxy-docs/en/{latest,release_XX.YY}`** (docs.galaxyproject.org). Not ReadTheDocs. Versioned per release branch. |
| Lint | `.github/workflows/lint.yaml` -> `tox -e lint,lint_docstring_include_list,mypy,format`. No markdown linter anywhere. |
| Diagrams | `doc/source/dev/image.Makefile` (wildcards `*.mindmap.yml` + `*.plantuml.txt`, same lineage as our `images/Makefile`), `plantuml_options.txt`, `plantuml_style.txt`. Rendered SVGs committed. |
| Dev docs index | `doc/source/dev/index.rst` - flat toctree of ~22 pages; intro paragraph points to GTN "Code Architecture" slides + `bit.ly/gx-arch-vids`. |
| CODEOWNERS | None in Galaxy. |
| Agent context | `.claude/commands/{triage-issue,triage-bug,triage-feature,weekly-triage}.md` (dannon, 2026); subdir `CLAUDE.md` in `packages/tool_shed/`, `lib/tool_shed/webapp/frontend/`, `test/functional/tools/` (jmchilton). **No root `CLAUDE.md`/`AGENTS.md`, no `.claude/skills/`.** No PR/issue discussion of AGENTS.md or an AI policy found; `CONTRIBUTING.md` silent on AI. |
| Stale links | `CONTRIBUTING.md:8`, `doc/source/dev/index.rst`, `doc/source/dev/writing_tests.md` link `training.../topics/dev/tutorials/architecture/slides.html` - after the GTN split (training-material #6602) that URL only redirects to `architecture-ecosystem`. Cheap win to fix in the migration. |

Our repo, for scale: 16 topics, 162 tracked files under `topics/` (89 md, 44 yaml, 29 diff), blocks = 394 `slide` / 116 `prose` / 4 `agent-context`; ~300 Remark-isms (`class:`, `.footnote[]`, etc.) that `outputs/sphinx-docs/build.py` strips; committed images 3.4 MB (largest `galaxy_schema.png` 820K, `element_galaxyproject.png` 508K); 47 hand-written `*.plantuml.txt`, 16 `*.mindmap.yml`, 3 `*.mermaid.txt`; ~4.3k lines Python across `scripts/` + `outputs/`. 107 commits, 100% jmchilton.

## Overlap with existing Galaxy docs

| Topic | Existing Galaxy doc | Action |
|---|---|---|
| tests | `dev/writing_tests.md`, `dev/debugging_tests.md`, `dev/run_tests_help.txt` | Biggest overlap. Topic = overview + link into these; don't duplicate how-to. |
| application-components, frameworks | `dev/api_guidelines.rst` | Cross-link; architecture = "why/layers", guidelines = rules. |
| plugins | `dev/build_a_job_runner.rst`, `dev/data_types.md`, `dev/interactive_environments.rst`, `dev/data_managers.rst` | Topic becomes hub linking these. |
| dependencies | `admin/dependency_resolvers.rst`, `admin/container_resolvers.rst` | Check topic scope (Python/JS deps vs tool deps) - likely little real overlap. |
| file-sources | `admin/file_source_*` pages (admin config) | Complementary (dev internals vs admin config). |
| production | large swaths of `admin/` | Highest drift risk; consider trimming to pointers. |
| dependency-injection, tasks, startup, files, markdown, client, principles | none (DI adjacent to `dev/database_session_management.md`) | Pure gain; best first-PR candidates. |
| ecosystem, project-management | `doc/source/project/*`, `CONTRIBUTING.md`, galaxyproject.org | Least code-bound; maybe leave on GTN/Hub only. |

Existing dev docs are actively maintained by a broad set (mvdbeek 41, jmchilton 28, selten 26, nsoranzo 21, ...; 50 commits in last year) - good sign that dev docs are a living place, but the flat index needs a new "Architecture" section rather than 16 more siblings.

## Layout options

### A. Convert to plain MyST pages (drop YAML model)
`doc/source/dev/architecture/<topic>.md`, hand-edited, images next to them.
- + Zero tooling, zero learning curve, reviewers already know it.
- - Loses slide generation -> GTN slides fork and rot (the 2019 outcome in reverse). Loses `related_code_paths` metadata, agent-context blocks, agentic-op prompts, galaxy-brain rendering. Speaker notes/Remark layout lost or left as noise.
- Fallback if maintainers reject any generator.

### B. YAML model + generator under `doc/`, generated at build (RECOMMENDED)
```
doc/architecture/
  topics/<id>/{metadata.yaml,content.yaml,fragments/*.md}
  images/  (*.plantuml.txt + committed *.svg/png, image.Makefile)
  models.py            # pydantic, from scripts/models.py
doc/gen_architecture_docs.py   # from outputs/sphinx-docs/build.py
doc/source/dev/architecture/   # generated *.md + index, gitignored
```
`doc/Makefile`: add `source/dev/architecture/index.md` (or a stamp) to `GENERATED_RST`; `clean` already removes `GENERATED_RST`. `dev/index.rst` gets an `architecture/index` toctree entry.
- + Mirrors `gen_authoring_doc.py` precedent exactly; no new deps; no generated diffs in review; release-branch versioned docs for free.
- + Keeps single source for slides/agent ops/galaxy-brain.
- - Contributors must learn content.yaml ordering; generator is ~1-2k lines Galaxy must carry. Mitigate: shrink to Sphinx path only in PR1 (slides builder stays out of Galaxy until PR4), document in a short `doc/architecture/README` or dev page.
- Alternative placement: `lib/galaxy/...` or top-level `architecture/` - reject; `doc/` is where generators + sources already live and `docs.yaml` path filters already cover it.

### C. Generator elsewhere, generated MyST committed
Output committed into `doc/source/dev/architecture/`; CI `--check` for drift (galaxy-brain already does this pattern).
- + `make docs` untouched; reviewers see rendered result.
- - Double diffs every edit; drift check needed; generated files invite direct edits. Only choose if maintainers refuse build-time generation.

### Images / diagrams
> **Superseded 2026-09-29:** all diagrams moved to Mermaid (`.mmd`) in galaxy-architecture PR #33, and Galaxy is dropping PlantUML for `sphinxcontrib-mermaid` (#23801). See MIGRATION_PLAN § Key decision: diagrams. Bullets below are the pre-Mermaid analysis.

- Commit rendered SVG/PNG next to sources (Galaxy precedent). Regenerate manually via `image.Makefile` (Java for PlantUML) - never in docs CI.
- Mermaid (3 diagrams): commit renders; don't bring `@mermaid-js/mermaid-cli`/puppeteer/`package.json` into Galaxy root. Option: convert those 3 to PlantUML, or later add `sphinxcontrib-mermaid` (client-side, one new pip dep) if people want it.
- Mindmap YAML -> PlantUML converter (`images/mindmap_yaml_to_plantuml.py`) comes along; Galaxy's `image.Makefile` already expects `*.mindmap.yml`, so maybe consolidate with `doc/source/dev/image.Makefile`.
- Prune/compress large PNGs before import.

## Maintenance model

- **Path-existence check** is the killer feature of living in-repo: validate `related_code_paths` and mindmap file refs against the repo root (today `scripts/generate_files_prose.py` hardcodes `~/workspace/galaxy`). Wire as a tox env (`lint_architecture`) or a step in `docs.yaml`. Renames/deletions of referenced files fail CI -> author fixes docs in same PR. Consider warning-only first to avoid annoying unrelated PRs, then escalate.
- Pydantic validation runs as part of the generator -> broken YAML fails `make docs` in CI.
- CODEOWNERS: Galaxy has none; don't introduce one just for this. Instead, per-topic `contributors`/owners in metadata.yaml, and label `area/documentation` (verify label) for review routing.
- Review burden: content PRs are docs-only; docs.yaml already runs on every PR, no new job needed for PR1.
- Python 3.10: docs CI uses 3.10, our `pyproject.toml` says `>=3.11`. Imports checked (no `tomllib`/`StrEnum`/`Self`); still must test generator on 3.10.

## Migration mechanics

- **History: fresh import recommended.** 107 single-author commits, unrelated root; subtree/filter-repo merge into `dev` adds noise to a very old graph and complicates release-branch merges. Link archived repo SHA in PR description + `doc/architecture/README`. (If jmchilton wants blame continuity: `git filter-repo --path topics --path images --path scripts/models.py --to-subdirectory-filter doc/architecture` then merge - offer, don't default.)
- **Prep in galaxy-architecture first (PR0):** parametrize repo roots (kill `~/workspace/galaxy`, `~/workspace/training-material` defaults), make Sphinx builder emit paths relative to `doc/source/dev/architecture`, drop the GitHub-Pages-only "View as slides" link from Sphinx output (or make it point to GTN), run on 3.10, flip `.gitignore` to commit renders.
- **Galaxy PR sequence:**
  1. **PR1 - pipeline proof.** `doc/architecture/` + generator + model + 2 topics (`dependency-injection`, `application-components` or `tasks`: code-centric, no overlap) + committed SVGs + `doc/Makefile`/`.gitignore`/`dev/index.rst` changes. Target `dev`.
  2. **PR2 - path check.** CI validation of `related_code_paths` + mindmap refs.
  3. **PR3..n - remaining topics in batches**, reconciling overlaps (tests <-> writing_tests; plugins hub). Fix stale GTN links in `CONTRIBUTING.md`, `dev/index.rst`, `dev/writing_tests.md`.
  4. **PR - slide export.** Bring `outputs/training-slides/build.py` + sync script (`make architecture-slides TM=/path/to/training-material`); pair with a GTN PR marking slides as generated.
  5. **PR - agent integration (separate discussion).** See below.

## Agent context / agentic operations in Galaxy

- `agent-context` blocks (4 today) stay in YAML; generator skips them for Sphinx.
- Generated agentic ops (`generated_agentic_operations/commands/*.md`, e.g. `frameworks-review-async-sync.md`) -> commit into Galaxy's existing `.claude/commands/` (precedent: triage commands). Name-prefix (`arch-review-*`) to avoid collisions.
- Tool-neutral question: Galaxy has only `CLAUDE.md` files. Adding a root `AGENTS.md` that points to `doc/architecture/` is the portable move; raise it in the PR rather than assume.
- Repo-authoring commands (`/research-topic`, `/plan-a-topic`, `/migrate-topic`, ...) are for writing docs, not for Galaxy devs generally - keep in galaxy-architecture archive or a `doc/architecture/.claude/` scoped dir; don't pollute Galaxy root `.claude/commands/`.
- Keep this out of PR1 entirely so AI skepticism can't sink the docs pipeline.

## Downstream consumers plan

- **training-material (GTN):** Today flow is galaxy-architecture -> GTN via `scripts/sync_to_training_material.py` (copies `slides.md` -> `topics/dev/tutorials/architecture-<id>/slides.html`, syncs images, injects prev/next footnotes; last syncs 10fb4276 2025-11-26, #6602 merged 2026-01). After migration: **Galaxy owns source, GTN renders.** Sync script moves into Galaxy (PR4), run manually per release or by a scheduled workflow opening GTN PRs. Add frontmatter comment/banner in GTN slides ("generated from galaxyproject/galaxy doc/architecture - edit there"). Need GTN maintainers' OK; risk = direct GTN edits get clobbered (recent non-jmchilton GTN commits exist, e.g. Saim Momin #6912) - sync should diff and warn.
- **jmchilton.github.io/galaxy-architecture:** keep until topics are live on docs.galaxyproject.org `latest`; then replace with a redirect/banner page to `docs.galaxyproject.org/en/latest/dev/architecture/`, archive repo (read-only), disable Pages deploy workflow.
- **galaxy-brain:** `generate_architecture_views.py` imports `build.generate_topic_markdown` from the submodule's `outputs/sphinx-docs` + `scripts`, rewrites images to `UPSTREAM_PAGES_BASE/_images/`. Options: (a) point at a local Galaxy clone via env/arg (`GALAXY_ROOT`, like other vault tooling) - simplest; (b) sparse checkout of `doc/architecture` + `doc/gen_architecture_docs.py`; (c) whole-Galaxy submodule - reject (huge). Keep `generate_topic_markdown(topic_id, topic_dir)` signature stable in the Galaxy generator for this. Flip image base to `https://docs.galaxyproject.org/en/latest/_images/`. Update `scripts/sync_architecture.py` + vault `index.md`.

## Pitch

**Pros**
- Docs versioned with code and per release (docs.galaxyproject.org already publishes per `release_XX.YY`).
- Referenced code paths become CI-checked - impossible out-of-repo.
- No new deps, reuses the `GENERATED_RST` + committed-PlantUML patterns maintainers already accepted.
- Fixes today's split: dev docs link to a GTN URL that now redirects to one of 16 decks.
- Single source for Sphinx prose, GTN slides, agent context; lowers bus factor (currently 100% one author, out-of-org repo).
- Fills gaps: DI, tasks, startup, files, markdown, client have no Galaxy dev doc.

**Cons maintainers will raise -> preemption**
- "We did this in 2016, removed it in 2019." -> Then it was a Remark slideshow with its own HTML/CSS/JS toolchain in `doc/source/slideshow/` duplicating GTN. Now: plain markdown source, Sphinx pages Galaxy lacks, GTN stays the slide renderer. Also offer to delete the vestigial `docs-slides-ready`/`docs-slides-export` targets + `scripts/slideshow/` in PR1 (net cleanup).
- "Bespoke YAML schema / custom generator to maintain." -> Fragments are plain markdown; YAML only orders blocks + metadata; pydantic errors are explicit; precedent `gen_authoring_doc.py`. Option A fallback exists.
- "Who maintains it? One person's project." -> Path CI makes rot visible; topic owners in metadata; invite subsystem owners (e.g. DI/managers, tasks, client) as reviewers on their topic PRs.
- "Docs build slower / heavier." -> Generation is pure Python over ~160 small files; no Java/Node in CI.
- "Repo bloat." -> ~3 MB images after pruning; compress big PNGs.
- "Duplication with dev docs/admin docs." -> Overlap table above; architecture pages link to how-to docs rather than copy.
- "AI-generated content / AI tooling in core." -> Content human-reviewed; agent ops are a separate, optional later PR; follow existing `.claude/commands` precedent.
- "GTN already has this." -> GTN keeps slides; Galaxy gets reference prose; one source feeds both.

## Open questions

1. `doc/architecture/` vs `doc/source/dev/architecture/_src/` (underscore excluded by `exclude_patterns`)? Prefer former.
2. Generated at build (B) vs committed (C) - ask mvdbeek/nsoranzo which they'd accept?
3. Slides builder in Galaxy at all, or keep export tooling in galaxy-architecture pointed at Galaxy source?
4. GTN maintainers OK with generated slides + banner? Who to ask?
5. Path check: hard fail or warning? In tox lint or docs.yaml?
6. Root `AGENTS.md` vs `CLAUDE.md` - float separately?
7. Which topics stay GTN/Hub-only (ecosystem, project-management, production)?
8. Preserve history via filter-repo or fresh import?
9. Delete vestigial slideshow targets/`scripts/slideshow/` in PR1 or separate?
10. galaxy-brain: `GALAXY_ROOT` local clone vs sparse checkout?
11. Mermaid: convert 3 diagrams to PlantUML or keep committed renders only?
12. Pre-pitch: open a Galaxy discussion/issue first, or lead with PR1 as the proposal?
