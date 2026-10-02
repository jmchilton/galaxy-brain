# Galaxy Architecture → galaxyproject/galaxy: Migration Plan

Collapsed from `notes/01`–`04` (2026-09-26). Detail and evidence live in the notes; this is the working plan.

| Note | Scope |
|---|---|
| [notes/01_cleanup_simplification.md](notes/01_cleanup_simplification.md) | Repo cruft, content model, scripts, CLI args, build health |
| [notes/02_content_freshness.md](notes/02_content_freshness.md) | 16 topics vs Galaxy `origin/dev` @ `8cecbebdf98`, broken paths, missing topics |
| [notes/03_display_polish.md](notes/03_display_polish.md) | Rendered Sphinx/slides audit, Galaxy theme compat, screenshots |
| [notes/04_galaxy_integration.md](notes/04_galaxy_integration.md) | Galaxy doc infra, layout options, PR sequence, pitch, downstream |

## Where things stand

- **Content is ~half fresh.** 2026-researched topics (file-sources, markdown, tests, DI, async half of frameworks) are current. GTN-migrated ones (startup, client, files, dependencies, plugins, project-management) describe webpack/yarn/jest/Mako/Py2.7. ~40 broken code paths, mostly from the Apr 2026 namespace-package move and webpack→Vite.
- **Build works locally, publishing is broken.** Validate + slides + 6 tests pass. Deploy workflow failed on every push since 2026-01; live site frozen at 2025-11-25 (13/16 topics, uWSGI-era slides). Actions pinned to Node 20 (dropped 2026-09-16). Mermaid never installed in CI.
- **Structure is overbuilt and fails silently.** Pydantic `extra='ignore'` drops unknown keys (`template: left-aligned` on 19 blocks never applied; `hub:`/`claude:` ignored). `file`/`fragments` sources used by 0/514 blocks. ~1.9k of ~4.5k Python LOC dead/one-shot; ~2.2k lines of finished planning markdown.
- **The arguments for merging need cleanup** ("arguments" = the case for merging into Galaxy, confirmed 2026-09-26). Raw material is in 04 § Pitch; README "Why This Exists" still leads with GTN/slides/AI-context points, which are the weakest ones given the 2016→2019 history.
- **Hardcoded paths**: `~/workspace/{galaxy,training-material}` baked into scripts; must run from repo root. (Other CLI mess — 5 topic-selection styles, `sync-to-training` "dry-run" really syncs, `validate-files` writes files — lower priority.)
- **Display bugs in `outputs/sphinx-docs/build.py`**: bare-URL linkifier corrupts 8 code lines; `.pull-left/right` → stacked paras + `<hr>`; Liquid `{% link %}` leaks as broken links; `.strike[` dropped (deprecated example reads as current); fence-unaware transforms (latent). Pages read like slides (~360 H2s / 16 pages), some images unusable (8488px-tall PNG).
- **Galaxy is a good fit technically.** Same theme + myst extensions; renders identically under Galaxy's pins. Galaxy already builds docs/artifacts from YAML sources (`directives.yml`, `collection_semantics.yml`, `config_schema.yml`; see Key decision: content format). Zero new Python deps. Galaxy is dropping PlantUML for inline Mermaid via `sphinxcontrib-mermaid` ([#23801](https://github.com/galaxyproject/galaxy/pull/23801), open; no Java in docs CI).
- **Pitch risk: this was done before and reverted.** Architecture slides in Galaxy 2016 (#2244, #3588) removed 2019 (`8acd07a50fa`, "now at GTN"). Answer must be: prose docs (not slides) + CI-verified code paths + one source feeding GTN.

## Key decision: content format → keep YAML source, generate artifacts (2026-10-01)

Decided: keep the combined YAML model (metadata + ordered content blocks with markdown) as the source of truth and build every output from it - Sphinx MyST, GTN slides, agent commands. The one-`.md`-per-topic option (note 01) is dropped, and so is the Phase 2 converter.

Why: Galaxy already keeps YAML as the source and builds artifacts from it, so this is a familiar pattern rather than a new build system (checked on `merge_26.1_into_dev` @ `a63da1dfd19`):

| Source | Generated artifacts | How |
|---|---|---|
| `client/src/components/Markdown/directives.yml` | `directives.md` reference, `requirements.yml`, `lib/galaxy/managers/_markdown_directives.py` | `scripts/markdown_directives_doc.py` (`make client-gen-markdown-directives`); committed; `--check` drift test `test/unit/app/test_markdown_directives_doc.py` |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | `doc/source/dev/collection_semantics.md` + `lib/galaxy_test/workflow/collection_semantics_*` | committed; parse tests `test/unit/data/model/test_collection_semantics.py` |
| `lib/galaxy/config/schemas/config_schema.yml` | `doc/source/admin/galaxy_options.rst`, sample YAML, config types | `make config-rebuild`; committed |
| `lib/galaxy/tool_util/xsd/galaxy.xsd` | `doc/source/dev/schema.md` | `doc/Makefile` `GENERATED_RST`, at doc build; gitignored |

(Note 04 cites `doc/gen_authoring_doc.py` as the precedent; it's gone from `dev`. The `GENERATED_RST` hook now covers only `schema.md` and the logging rst.)

**Recommended shape in Galaxy**: follow `directives.yml`.
- YAML under one dir (e.g. `doc/architecture/<topic>/`).
- A generator script (`scripts/architecture_docs.py`) writes committed MyST into `doc/source/dev/architecture/`, run via `make architecture-docs`.
- `--check` mode plus a unit test that fails when the generated docs drift.
- Pydantic models (`extra='forbid'`) and the code-path/diagram-ref checks are unit tests too.
- Slides and agent commands are extra outputs of the same generator. They're not committed to Galaxy; GTN sync runs them.

Committed output means reviewers see the rendered prose in PR diffs and Galaxy's docs build is unchanged. Fallback is `GENERATED_RST` (the xsd pattern) if maintainers don't want generated files in git.

Cost we keep paying: markdown indented inside YAML blocks. To soften it, keep the block model minimal - inline content only (`file`/`fragments` are used by 0/514 blocks, so delete them) - and lint the YAML with the models.

## Key decision: diagrams → Mermaid (2026-09-29)

Standup feedback: all-Mermaid makes upstreaming likelier. Done in galaxy-architecture [PR #33](https://github.com/jmchilton/galaxy-architecture/pull/33) (branch `mermaid-migration`, open): all 63 diagrams (47 PlantUML + 16 mindmap YAML) plus the 3 existing `.mermaid.txt` are now `images/*.mmd`.

- **Standalone `.mmd` files, not inline blocks** - inline was a Galaxy-side stopgap. `name.mmd` → `name.mmd.svg`; `name.mindmap.yml` → `name.mindmap.mmd` → `.mindmap.mmd.svg` via `images/mindmap_yaml_to_mermaid.py` (tested).
- Chart types: file-tree YAML → `treeView-beta`; concept mindmaps → `mindmap` + tidy-tree layout; `diagram: flowchart` override (ELK) when sibling order matters (`core_branches`).
- Style: Galaxy theme in `images/mermaid_config.json` = #23801's `themeVariables` + `labelTextColor`. Handwritten look dropped.
- Build: mermaid-cli via committed `package.json`/lock, `npm ci` in deploy CI; SVGs gitignored, built in CI. Java/PlantUML gone from CI.
- Galaxy port: sources can go inline or render via `sphinxcontrib-mermaid`, but `treeView-beta`/tidy-tree/ELK need Mermaid 11 + layout plugins there. Otherwise commit prebuilt SVGs.
- Follow-ups: prune 66 orphaned `*.plantuml.svg` in training-material (`sync_images.py` never deletes); DB actors render as plain boxes (white `actorTextColor`).

Cost: a one-shot converter. Guard it with a red-to-green check that regenerated GTN slides are byte-identical (modulo intended fixes) before/after conversion.

## Phases

### Phase 0 — Stabilize (galaxy-architecture)
Get green and trustworthy before changing anything bigger.
1. **CI**: bump actions off Node 20; commit `package.json` + lock, `npm ci` for mermaid (done); drop PlantUML install (done, PR #33); re-run deploy with fresh logs to find the 17-min hang. Make `sphinx_image_linter.py` fail when HTML root missing.
2. **Silent drops**: `extra='forbid'` on models; fix the 19 `template:` → real layout field; delete `hub:`/`claude:`/`sphinx.level`. Test asserting `layout: left-aligned` appears in output (red first).
3. **Builder bugs, red-to-green**: tests for linkifier-in-code, fence-aware `.class[` stripping, `???` split, `.strike[`, Liquid `{% link %}`, then fix.

### Arguments for merging (parallel to Phases 1–3)
Tighten the case before it's needed; it also constrains Phase 2/3 choices (prose over slides, CI-checked paths).
1. Rewrite README "Why This Exists" around the strongest points: docs versioned with code/per release, CI-checked code paths, fills real gaps (DI, tasks, startup, files, markdown, client have no Galaxy dev doc), zero new deps, one source feeds GTN.
2. Draft the proposal text (Galaxy discussion/issue or PR1 body) from 04 § Pitch, leading with the 2016→2019 answer rather than burying it.
3. Evidence to gather: list of current Galaxy dev-doc gaps, stale GTN-architecture links in Galaxy docs, before/after screenshot of one topic as a Galaxy doc page.

### Phase 1 — Cut & simplify (galaxy-architecture)
Small, independent delete PRs.
1. Planning cruft: `PLAN.md`, `LAYOUT_PLAN.md`, `SPHINX_PLAN.md`, `MIGRATED.md`, `IMAGE_HANDLING.md`, `docs/OUTPUTS.md`; refresh `.claude/CLAUDE.md` (still says "Current Topics: dependency-injection").
2. One-shot scripts: `migrate_topic.py`, `plantuml_to_mindmap_yaml.py`, `validate_images.py`, `generate_files_prose.py`, `images/build.sh`, `migrate-topic` command.
3. Scratch dirs: `topics/*/{notes,plan,suggestions,harmonize}`, `topics/files/fragments/` → move keepers to galaxy-brain.
4. Untrack generated `doc/source/architecture/*.md`; dedupe logo; stop publishing `images/README.md`.
5. Split `review/` out to `claude-galaxy-plugins`.
6. **Hardcoded paths**: `GALAXY_ROOT`/`GTN_ROOT` env vars (clear error when unset) replacing `~/workspace/...`; split `validate-files` check from its dead fragment writing. Optional later: one entry point (`gxarch build|validate|export-slides [--topic X | --all]`), no `sys.path.insert`, honest Makefile target names.
7. Merge authoring guides into ≤2 (SLIDE_GUIDE+CONTRIBUTING, DIAGRAM_GUIDE+images/README) — these become Galaxy dev-doc pages. (`MERMAID.md` folded into a Mermaid-only DIAGRAM_GUIDE in PR #33.)

### Phase 2 — Shape the YAML model and generator for Galaxy (galaxy-architecture)
Keep the format and make it small and Galaxy-shaped. Each step is guarded by a check that the generated slide and Sphinx output is byte-identical (modulo intended fixes).
1. **Trim the model**:
   - delete `file`/`fragments` sources;
   - `order` replaces `tutorial_number`+`previous_to`/`continues_to`;
   - drop `prerequisites`, `sphinx.*`, `heading_level` and the render sub-objects;
   - regenerate `docs/SCHEMA.md`, or drop `generate_schema_docs.py` if the models' docstrings are enough.
2. **One generator entry point** (`architecture_docs.py [--check] [--topic X]`) that writes MyST, slides and agent commands. Fold `outputs/*/build.py` into it, with no `sys.path.insert` and paths relative to a root arg so it runs from Galaxy's `scripts/`.
3. **Committed-output mode + `--check`**, mirroring `markdown_directives_doc.py`. Prove it here first: commit `outputs/sphinx-docs/generated/` and add a CI drift check.
4. **Image scheme matching Galaxy**: `.mmd` next to the topic YAML; either rendered client-side by `sphinxcontrib-mermaid` if Galaxy's Mermaid supports our types, or prebuilt SVGs committed (Q15). Relative paths must work in both Sphinx and the slide export.

### Phase 3 — Content triage & refresh
Do the cheap/structural part before migrating; write new topics after (in Galaxy, with the path check helping).
1. **Before migration**: quick path fixes (≤1h list in 02); drop ecosystem/production/project-management from dev docs (keep in GTN); merge dependencies+files+client-build → "Repository layout & dev environment"; decide tests vs `doc/source/dev/writing_tests.md`; split frameworks (request path + async vs API layer).
2. **Prose pass**: collapse slide-per-H2 into readable sections for docs (keep slide markers). Fix image sizing (split galaxy_schema.png, readable mindmaps).
3. **After migration**: startup rewrite; client refresh (Vite/pnpm/api-client); plugins (npm viz, TPV); tasks; new topics in priority order — jobs & tool execution, data model, API layer/schema→typed client, workflows, object stores, tools/tool-state, datatypes/collections, auth, AI agents/MCP.

### Phase 4 — Pitch & migrate (galaxyproject/galaxy)
1. **Pitch** (Q8): short discussion/issue first vs lead with PR1. Answers to the likely objections:
   - "tried in 2016" → prose, not slides, plus CI path checks;
   - "maintenance" → CODEOWNERS-lite + path test;
   - "AI content" → human-reviewed, with agent ops kept separate;
   - "GTN has it" → one source feeds GTN;
   - "bespoke YAML + generator" → same pattern as `directives.yml`, `collection_semantics.yml` and `config_schema.yml`.
2. **PR1** contents:
   - YAML for 2 code-centric topics (dependency-injection + tasks or application-components);
   - the generator + models;
   - the committed generated `doc/source/dev/architecture/` (index + 2 pages) and its toctree entry;
   - a `make architecture-docs` target;
   - unit tests: drift `--check`, model parse, code-path and diagram-ref existence;
   - fixes for the stale GTN-architecture links in `CONTRIBUTING.md`, `dev/index.rst` and `dev/writing_tests.md`;
   - optionally, deleting the vestigial `docs-slides-ready` / `scripts/slideshow/` (Q9).

   The slide/agent outputs can come in PR2 to keep PR1's generator small.
3. **PR2+**: topic batches; authoring guides; slide export + GTN sync (GTN slides get "generated — edit in Galaxy" banner).
4. **Later, separately**: agent-context / agentic ops (root AGENTS.md question, Q6).
5. **Downstream**: gh-pages → redirect to docs.galaxyproject.org; archive galaxy-architecture; galaxy-brain drops submodule, `generate_architecture_views.py` reads `GALAXY_ROOT` (keep `generate_topic_markdown` signature stable); GTN sync script lives in Galaxy or GTN.

## Testing strategy
- Builder fixes: failing test first (Phase 0.3), fixtures from the actual broken lines cited in 03.
- Model trims / generator consolidation: before/after slide + Sphinx output diff must be empty (or only intended fixes).
- In Galaxy: drift `--check` test (committed MyST matches YAML); models parse every topic; every `related_code_paths` entry and diagram ref exists; Sphinx build with no new warnings (Galaxy's docs.yaml).
- Visual: re-run the 03 screenshot pass after Phase 2 and after PR1 builds in Galaxy.

## Start here (first 3 PRs)
1. **CI revive**: Node-24 actions + mermaid install + linter exit code + redeploy. Unblocks seeing anything.
2. **`extra='forbid'` + `template:` fix** with red-to-green test.
3. **Linkifier/fence-aware transforms** with red-to-green tests.

Then Phase 1 deletes in parallel (each tiny), then Phase 2 (Q2 decided: keep YAML).

## Unresolved questions
1. ~~"Cleaning up the arguments" meaning~~ → the case for merging (resolved 2026-09-26); hardcoded paths still to fix.
2. ~~OK converting to md + HTML-comment slide markers before migration (vs migrate YAML as-is)?~~ → keep YAML, generate artifacts (resolved 2026-10-01).
16. Merge `metadata.yaml` + `content.yaml` into one `<topic>.yml` (like `directives.yml`) or keep two files?
17. Generated MyST committed + `--check` drift test (directives pattern) or built at doc time via `GENERATED_RST` (xsd pattern)?
18. YAML location in Galaxy: `doc/architecture/`, `doc/source/dev/architecture/_src/`, or elsewhere?
3. ~~Mermaid: npm in CI, commit renders, or convert 3 diagrams to PlantUML?~~ → npm in CI, SVGs gitignored (resolved 2026-09-29).
4. GTN: stays a published target (export from Galaxy) or Galaxy docs only + GTN links?
5. Tests topic: replace `writing_tests.md`, merge, or drop?
6. Drop ecosystem/production/project-management from Galaxy dev docs — agree?
7. Refresh stale topics before migration or after (path check in Galaxy helps)?
8. Pitch: discussion/issue first, or PR1 as proposal? Who to ping (mvdbeek, nsoranzo)?
9. Delete vestigial `docs-slides-ready` / `scripts/slideshow/` in PR1 or separate?
10. `review/` → `claude-galaxy-plugins`?
11. Preserve git history (filter-repo) or fresh import? (04 recommends fresh.)
12. Keep `notes/`/`plan/` research output in galaxy-brain or discard?
13. ~~Keep PlantUML at all long-term, or move to Mermaid?~~ → all Mermaid, standalone `.mmd` (resolved 2026-09-29, PR #33).
14. "Leave #23801 to match" - leave it as is, or update it (e.g. add `labelTextColor`)?
15. Galaxy port: `sphinxcontrib-mermaid` client-side (needs Mermaid 11 + layout plugins) or commit prebuilt SVGs?
