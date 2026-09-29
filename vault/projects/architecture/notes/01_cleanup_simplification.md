# galaxy-architecture: cleanup & simplification audit

Repo: `~/projects/repositories/galaxy-architecture` (last commit 01fd94c, 2026-05-20). Audited 2026-09-26, read-only.

## TL;DR

- **Most of this repo's mass is POC and migration scaffolding, not the content.** Real content: 16 `topics/*/content.yaml` (514 blocks, all inline), 16 `metadata.yaml`, `images/` diagram sources, and 3 generated review commands. Everything else is plans, one-shot migration tools, training-material round-trip sync, or duplicated generated output.
- **Python: ~4.5k LOC.** Core (models, validate, 2 builders, mindmap converter, linter) is about 2.1k LOC. Probably under 1k after cleanup. About 1.9k LOC is dead or one-shot: `migrate_topic.py`, `plantuml_to_mindmap_yaml.py`, `validate_images.py`, `generate_files_prose.py`, and the sync/compare trio (the trio only matters if GTN stays a sync target).
- **Top-level markdown: about 2.2k lines of planning cruft.** `PLAN.md`, `LAYOUT_PLAN.md`, `SPHINX_PLAN.md`, `MIGRATED.md`, `IMAGE_HANDLING.md`, plus `docs/MIGRATION.md`, `docs/OUTPUTS.md`, `docs/SCHEMA.md`. All are done or superseded.
- **The content model is overbuilt, and it fails silently.** Pydantic default `extra='ignore'` means unknown keys are dropped without error:
  - `template: left-aligned` is set on **19 blocks** (client, dependencies, frameworks, plugins). It is not a model field, so those layouts are never applied (0 `layout: left-aligned` in the generated slides).
  - The `hub:`, `claude:`, and `sphinx.level/toc_depth` keys are ignored the same way.
  - The `file`/`fragments`/`separator` sources are **never used**: 0 of 514 blocks. The slides builder does not even support them (it reads only `block.content`).
- **Recommendation: collapse to one markdown file per topic, with YAML front-matter.** Slides split on `---`, blocks marked with fenced or HTML-comment directives, docs-only and agent-only sections via a tiny marker syntax. Keep a small Pydantic front-matter model with `extra='forbid'`.
- **Build health is bad.**
  - `make validate` passes, and slides build for all 16 topics.
  - **The Deploy workflow has failed on main for all 3 pushes since 2026-01-14.** Pages are stale since 2025-11-25.
  - The workflows pin Node-20 actions, and runners dropped Node 20 on 2026-09-16, so CI may be broken outright now.
  - Local `make build` is blocked by the environment: no JRE, and the disk is full.

## Inventory

| Path | Purpose | Status | Rationale |
|---|---|---|---|
| `topics/*/content.yaml` | Slide/prose/agent-context blocks | **collapse** | The real content. 514 inline blocks. The YAML wrapper adds indentation noise around markdown. Convert to `topic.md`. |
| `topics/*/metadata.yaml` | Training/sphinx/xref/agentic-op metadata | **collapse** | Becomes front-matter. Drop the unused fields (see model section). |
| `topics/*/.claude/CLAUDE.md` | Per-topic agent context | keep → fold | 15 topics (missing for file-sources). Could become an `agent-context` section of the topic md. |
| `topics/{file-sources,markdown}/notes/` (39+48 files), `*/plan/`, `tests/plan.md` | `/research-topic` + `/plan-a-topic` outputs | **cut** | Working scratch. PR diffs and summaries are stale. Move to galaxy-brain vault if wanted. |
| `topics/*/suggestions/`, `tests/harmonize/` | `/generate-agentic-op` + `/harmonize` side-outputs | **cut** | Feedback scratch. `validate.py` even *warns* when `suggestions/` is missing (drop that check). |
| `topics/files/fragments/*.yaml` (12) | Output of `generate_files_prose.py` | **cut** | Referenced by nothing. `files/content.yaml` has only 9 image slides. |
| `PLAN.md` (347 lines) | Strategic plan | **cut** | "Current state: all done." Its content model description is inaccurate (it shows `file: fragments/...`). Fold the 5-line vision into the README. |
| `LAYOUT_PLAN.md` (235) | Plan for `layout_name` | **cut** | Implemented, and then misused (`template:` key). |
| `SPHINX_PLAN.md` (406) | Sphinx implementation phases | **cut** | Says "COMPLETE" as of 2025-11-11. |
| `MIGRATED.md` (327) | GTN→repo migration record | **cut** | Historical. Covers 13 topics, now 16. |
| `IMAGE_HANDLING.md` (415) | GTN image path patterns | **cut** | Only relevant to GTN round-trip. References a nonexistent `BACK_TO_TRAINING_PLAN.md`. |
| `docs/MIGRATION.md` (258) | Plan for moving into Galaxy | rewrite | Superseded by this vault project. Replace with a real migration plan. |
| `docs/OUTPUTS.md`, `docs/SCHEMA.md` (auto-gen), `docs/CONTRIBUTING.md` | Meta-docs | collapse | Merge into one short CONTRIBUTING. Generate SCHEMA only if the model survives. |
| `docs/GITHUB_PAGES_{QUICKSTART,SETUP}.md` (346) | Pages setup | **cut** at migration | Galaxy has its own doc hosting. |
| `docs/SLIDE_GUIDE.md`, `docs/DIAGRAM_GUIDE.md`, `images/MERMAID.md`, `images/README.md` | Authoring guides | keep, merge | The real value. Merge MERMAID.md + images/README into DIAGRAM_GUIDE. |
| `scripts/models.py` (564) | Pydantic models + loaders | **collapse** | Large for its job: 3 content sources, 2 render configs, `class`/`slides.class_` alias, a no-op validator (`validate_slide_heading`), inline `import yaml`, and `extra='ignore'`. Should be about 100 LOC. |
| `scripts/validate.py` (226) | Validate topics + tutorial chain | keep, shrink | Core. Drop the suggestions/CLAUDE.md nag warnings. |
| `scripts/generate_schema_docs.py` (270) | SCHEMA.md generator | cut | 270 LOC to document about 20 fields. Docstrings/README suffice. |
| `scripts/migrate_topic.py` (615) | One-shot GTN→YAML import | **cut** | Migration done. Hardcodes `~/workspace/training-material`. |
| `scripts/plantuml_to_mindmap_yaml.py` (228) | One-shot PlantUML→mindmap YAML | **cut** | The conversion is done. The reverse `images/mindmap_yaml_to_plantuml.py` is what the build uses. |
| `scripts/validate_images.py` (202) | Find/copy missing images from GTN | **cut** | Migration-era. Hardcoded path. Overlaps with `sphinx_image_linter.py`. |
| `scripts/generate_files_prose.py` (163) | Mindmap → GitHub-link prose, verified against Galaxy checkout | cut or rework | Output is orphaned. Once in the Galaxy repo, "verify file exists" becomes a trivial in-repo test. |
| `scripts/sync_to_training_material.py` (236), `sync_images.py` (243), `compare_slides.py` (248), `validate_sync.py` (150) | GTN round-trip | **decide** (Q1) | Only needed if GTN remains a published target. Otherwise cut all 877 LOC plus 3 Make targets. |
| `scripts/sphinx_image_linter.py` (314) | Broken-image check on HTML | keep, shrink | Useful. Exits **0** when `doc/build/html` is missing, so it passes falsely. Sphinx's `-W` plus nitpicky mode may replace it. |
| `outputs/training-slides/build.py` (354) + `template.html`, `html_wrapper_template.html`, `assets/` | GTN slides + standalone Remark HTML | keep, clean | See the duplication section. |
| `outputs/sphinx-docs/build.py` (523) | Topic → MyST markdown + toctree | keep, clean | Same. At migration this should become a Sphinx extension or pre-build step in `galaxy/doc`. |
| `outputs/*/generated/` | Build output | ok | Already gitignored. |
| `doc/source/architecture/*.md` (17, tracked) | Generated MyST copied into the Sphinx project | **cut from git** | Duplicate generated output. `build-sphinx` overwrites it. Currently byte-identical to fresh output. |
| `doc/source/_images` → `../../images` symlink, `assets/GTNLogo1000.png` (also in `images/`) | Image plumbing | collapse | Duplicate logo. The symlink plus the Makefile `cp images/*` into html is two mechanisms for one thing. |
| `images/*.plantuml.txt` (~60), `*.mindmap.yml` (16), `*.mermaid.txt` (3), png/svg | Diagram sources + static art | keep | Content. |
| `images/Makefile` | PlantUML/Mermaid build | keep, fix | Every PlantUML output depends on *all* inputs, so any edit rebuilds everything. It downloads the jar at build time. |
| `images/build.sh` | Alternate PlantUML build (plantuml CLI/docker) | **cut** | Unused by Make/CI. Wrong glob (`*.txt` also picks up mermaid). |
| `images/plantuml.jar` | Local jar (gitignored) | ok | CI installs both apt `plantuml` *and* the jar; one of those is unused. |
| `package.json` (untracked), `package-lock.json` (gitignored!), `node_modules/` | mermaid-cli for 3 diagrams | **decide** (Q3) | Lock file is gitignored, package.json never committed, CI never runs `npm install`. So Mermaid SVGs are never built in CI (probable cause of Deploy failures). Either commit package.json + lock and install in CI, or render Mermaid client-side (`sphinxcontrib-mermaid`; Remark can use mermaid.js). |
| `generated_agentic_operations/commands/` (3) | Generated review commands | keep | The useful agentic artifact (di, controllers/services/managers, async-sync). |
| `review/` (Makefile, `sync_generated.py`, `generated_commands{,.yaml}`, `static_commands/` (8), `galaxy-plugins` submodule) | Packaging for the `claude-galaxy-plugins` marketplace | **split out** | A different concern from architecture docs. `generated_commands/` holds stale duplicates (`review-di.md` + `gx-review-di.md`). The `legacy` Make target points at a nonexistent `gx-arch-review/`. Uses bare `python`. The static commands belong in the plugins repo. |
| `.claude/commands/` (10) | Authoring workflows | trim | See the slash-commands section. |
| `tests/test_validate.py` (92, 6 tests, pass) | Validation tests | keep, extend | Nothing tests either builder. That is where the bugs are (`template:`, speaker-notes split). |
| `pyproject.toml` | deps: PyYAML, Jinja2, pydantic; extras dev/docs | keep | Fine. Jinja2 is used only for 2 templates. The comment "Scripts are run directly... for now" plus `sys.path.insert` hacks everywhere means the package is not installable. |
| `.github/workflows/{deploy-docs,validate}.yml` | CI | fix | Node-20 action pins (checkout@v4, setup-uv@v3, setup-python@v5, setup-java@v4, cache@v4). No npm step. Duplicate PlantUML install. |
| `.DS_Store` (root, untracked but present) | — | ignore | Already in .gitignore. |

## Metadata fields: who consumes what

Consumers checked: `scripts/`, both builders, templates, `.claude/commands`, `review/`.

| Field | Consumed by | Verdict |
|---|---|---|
| `topic_id`, `title` | both builders | keep |
| `training.tutorial_number` | slides title (`Architecture NN - ...`), sync/compare, validate | keep; use it as *the* ordering key |
| `training.subtitle, questions, objectives, key_points, time_estimation` | slides template; sphinx uses questions/objectives/key_points | keep (GTN front-matter) |
| `contributors` | slides template | keep |
| `training.previous_to / continues_to` | sphinx toctree ordering, validate chain, sync footnotes | **cut**: redundant with `tutorial_number` (a linked list to maintain by hand) |
| `training.prerequisites` | nothing (validated only) | cut. Values are inconsistent anyway (`architecture-frameworks` vs `project-management`). |
| `sphinx.section / subsection` | nothing (only migrate_topic writes it) | **cut** |
| `sphinx.level, toc_depth`, `hub.*`, `claude.*` | nothing; not in the model, silently dropped | **cut**, then set `extra='forbid'` |
| `related_topics` | validated only | keep only if the builder renders "See also" links; otherwise cut |
| `related_code_paths`, `related_pull_requests` | slash commands (`research-*`, `generate-agentic-op`, `harmonize`) | keep; this is the agentic value. In Galaxy, paths can be CI-checked for existence. |
| `agentic_operations` | `generate-agentic-op`, `harmonize`, validate | keep, but `type: claude-skill` is never used (all are slash commands) |

Content-block fields:

| Field | Usage |
|---|---|
| `type` | slide 394, prose 116, agent-context 4 |
| `class` | 286 uses; keep |
| `doc.render: false` | 2 uses |
| `slides:`/`doc: render: true` | 3 redundant uses (defaults) |
| `heading_level` | never read by anything |
| `slides.render` | never read: the slides builder filters on `type` only |
| `slides.layout_name` | 0 uses (19 blocks wrongly use `template:` instead) |

## Proposed simplified content model

One file per topic, `topics/<id>.md` (or `doc/source/architecture/<id>.md` once in Galaxy):

```markdown
---
id: dependency-injection
title: Dependency Injection
order: 6                      # replaces tutorial_number + previous_to/continues_to
subtitle: ...
contributors: [jmchilton]
time_estimation: 30m
questions: [...]
objectives: [...]
key_points: [...]
code_paths: [{path: lib/galaxy/app.py, note: ...}]
pull_requests: [{url: ..., note: ...}]
agentic_operations: [{name: review-di, prompt: ...}]
---

## The Problem
<!-- slide class="reduce90" layout="left-aligned" -->
...markdown...
???
speaker notes

---

<!-- docs-only -->
Longer prose only for Sphinx.

<!-- agent-only -->
Anti-patterns for review commands.
```

**What the current structure buys:**
- Per-block ids, which nobody references.
- Schema validation, which is kept via front-matter plus a directive parser.
- Fragment reuse, which was never used.

**What it costs:**
- Markdown indented inside YAML `content: |-` scalars. That is hostile to editors, linters, and prettier, and to anyone in Galaxy reviewing a diff.
- Silent key drops.
- Two parallel "render" mechanisms (`type` vs `doc/slides.render`).
- A 564-LOC model.

The GTN slide format is already "markdown split on `---` with `class:` lines". The native Remark format *is* this format, so the slides builder mostly becomes: strip docs-only sections, prepend GTN front-matter. Conversion is mechanical: a one-shot script over the 16 content.yaml files, verifying rendered output is byte-identical before and after (except the `template:` fix).

Alternative if the YAML structure is kept: set `extra='forbid'`, and delete `file`/`fragments`/`separator`, `doc`/`slides` sub-objects (replace with `type` + optional `class`/`layout`), `heading_level`, `sphinx`, and `prerequisites`. That is roughly 60% of models.py.

## Build-script duplication and dead code

- **Content resolution happens twice.** `outputs/sphinx-docs/build.py:get_block_content` re-implements `ContentBlock.resolve_content`, with different error behavior (it inlines `[Error: ...]` text instead of raising). The slides builder ignores `file`/`fragments` entirely.
- **Image path rewriting is done 3 ways.**
  - `rewrite_image_paths_for_html` (slides) rewrites to `../../../../images/`.
  - `rewrite_image_paths_for_sphinx` has a docstring claiming paths stay `../../images/`.
  - `process_markdown_for_sphinx` then replaces `../../images/` with `../_images/`. The docstrings contradict each other; the last one wins.
  - The GTN `{{ site.baseurl }}` and `shared/images` handling is migration residue.
- **The title/questions/objectives preamble is generated three times**: in the Jinja `template.html`, in hand-built HTML markdown in `generate_slides`, and in sphinx `generate_topic_markdown`.
- **Duplicated literals.** The `layout_definitions_str` literal is duplicated verbatim inside `generate_slides`.
- **Dead code.**
  - `extract_markdown_from_content_block` reads `block.source`, which does not exist.
  - `copy_topic_images` is a no-op with a bogus `Path("*.svg").resolve()` check.
  - The `topic_name` param of `rewrite_image_paths_for_html` and the `topic_id` param of `process_markdown_for_sphinx` are unused.
  - `import re` and `import shutil` sit inside functions. The user's style rule is imports at the top.
- **Bugs.**
  - `strip_speaker_notes` splits on the first `???` anywhere, including inside code.
  - `_process_pull_directives` handles only the first left/right pair per block.
  - `_unwrap_remark_directives` regex `\.(\w+)\[` also matches ordinary text like `foo.bar[0]` in prose or code.
- **Shared plumbing is copy-pasted.** Both builders `sys.path.insert` the scripts dir and assume cwd is the repo root (`Path("topics")`).

## CLI arguments / Makefile ("cleaning up the arguments")

- **Topic selection is inconsistent across 7 scripts.**
  - `training-slides/build.py <topic>`: positional only. The docstring advertises `all`, but it's not implemented (the argv length check rejects it; `load_metadata("all")` would fail).
  - `sphinx-docs/build.py <topic|all>`: always rewrites the index with *all* topics regardless.
  - `compare_slides.py` / `sync_to_training_material.py`: `[topic] --all`.
  - `sync_images.py` / `validate_sync.py`: `--topic X` / `--all`.
  - `validate.py`: no args, always all.
  - `generate_files_prose.py`: 2 required positionals.
  - `plantuml_to_mindmap_yaml.py`: optional positional.
- **Hardcoded external paths.** `~/workspace/training-material` is the default in 4 argparse defaults and hardcoded without an override in `migrate_topic.py` and `validate_images.py`. `~/workspace/galaxy` is hardcoded in `generate_files_prose.py` and in `.claude/commands/research-find-code-paths.md`. The user's clones live under `~/projects/repositories/`, so these defaults are likely wrong on this machine (couldn't confirm; disk full).
- **Everything depends on cwd.** Paths are relative to the repo root; there are no `--root` options and no package entry points.
- **Makefile.**
  - `build-slides` shell-loops over topics, spawning 16 `uv run` processes.
  - `build-sphinx` depends on `images` but `build-slides` does not, although both embed the SVGs.
  - `validate-files` is misnamed: it *writes* `topics/files/fragments/`.
  - `sync-to-training` says "(dry-run)" in help but runs a real sync (no `--dry-run` flag passed).
  - `build` chains `lint-sphinx`, and the linter passes falsely when there is no HTML.
  - `setup` does npm and a puppeteer Chrome install that CI never runs.
  - `watch`/`watch-*` need `entr`, which isn't installed.
- **Proposal.** One CLI (`uv run gxarch build [--topic X]... [--format slides|sphinx|all]`, `gxarch validate`, `gxarch sync-gtn --root PATH`). Topics default to all. External roots come from env vars (`GALAXY_ROOT`, `GTN_ROOT`) with no `~/workspace` defaults. The Makefile targets become thin one-liners.

## Slash commands and agentic bits

| Command | Verdict |
|---|---|
| `research-topic`, `research-find-code-paths`, `plan-a-topic` | keep one merged "research → plan" command. The 3-step chain plus 2-agent plan merge produced the notes/plan dirs, which are now scratch. |
| `research-prose-plan-with-code-paths` | merge into the above |
| `generate-agentic-op` | **keep**. This is the core docs → agent value. |
| `harmonize` | keep (docs ↔ existing-command feedback loop), maybe merge with generate |
| `migrate-topic` | **cut** (migration done; wraps `migrate_topic.py`) |
| `add-project-slide` | cut or make generic ("add slide to topic"). It's ecosystem-specific. |
| `annotate-topic-slides`, `resize-topic-content` | keep as authoring aids. They're cheap. `resize` needs Playwright MCP. |

Block type `agent-context` is used only 4 times (frameworks 1, tests 3). It's cheap and on-mission, so keep it. `generated_agentic_operations/` should be a build output that's committed, or it should move straight into the plugin repo. The `review/` copy-with-rename step (`generated_commands.yaml`) is an extra hop.

## Concrete cleanup PRs (ordered, each small)

1. **Fix CI.** Bump actions to Node-24 versions. Add `npm ci` plus a committed `package.json`/lock, or drop Mermaid CLI. Remove the duplicate PlantUML install. Make `sphinx_image_linter.py` exit non-zero when HTML is missing. Goal: green Deploy.
2. **Fix silent key drops.** Add `model_config = ConfigDict(extra='forbid')` to all models. Rename the 19 `template:` keys to a real field. Delete `hub:`/`claude:`/`sphinx.level/toc_depth`. Add a builder test asserting `layout: left-aligned` appears.
3. **Delete planning cruft.** `PLAN.md`, `LAYOUT_PLAN.md`, `SPHINX_PLAN.md`, `MIGRATED.md`, `IMAGE_HANDLING.md`, `docs/OUTPUTS.md`. Fold the vision into the README. Update `.claude/CLAUDE.md` (it still says "Current Topics: dependency-injection" and "Follow the PLAN.md phases").
4. **Delete one-shot scripts.** `migrate_topic.py`, `plantuml_to_mindmap_yaml.py`, `validate_images.py`, `images/build.sh`, and the `migrate-topic` command.
5. **Delete scratch dirs.** `topics/*/{notes,plan,suggestions,harmonize}`, `tests/plan.md`, `topics/files/fragments/`, and `generate_files_prose.py` plus the `validate-files` target. Move anything worth keeping to galaxy-brain. Drop the `suggestions/` warning in `validate.py`.
6. **Untrack generated files.** Remove `doc/source/architecture/*.md` from git (gitignore it; `build-sphinx` regenerates it). Dedupe `assets/GTNLogo1000.png`.
7. **Trim the schema.** Drop `file`/`fragments`/`separator`, `doc`/`slides` render sub-objects, `heading_level`, `sphinx`, `prerequisites`, and `previous_to`/`continues_to` (order by `tutorial_number`). Delete `generate_schema_docs.py` and `docs/SCHEMA.md`, or regenerate them.
8. **Clean up the builders.**
   - Extract a shared `topic_loader` for resolving content and filtering blocks, used by both.
   - Keep one image-path rewrite function per target.
   - Delete the dead functions and move imports to the top.
   - Make the slides builder accept multiple topics / all; the Makefile loop goes away.
   - Add builder unit tests (speaker notes, pull directives, layout).
9. **Unify the CLI.** Make the package installable (entry points, no `sys.path.insert`). Use consistent `--topic`/all semantics and env-var external roots. Simplify the Makefile.
10. **GTN decision (Q1).** Either delete the 4 sync scripts (877 LOC) and 3 Make targets, or keep them behind `gxarch sync-gtn`.
11. **Split `review/`** into the `claude-galaxy-plugins` repo. Keep only `generated_agentic_operations/` here.
12. **Convert content to markdown + front-matter** (optional, biggest). Use a one-shot converter with a byte-identical-output check, then delete the YAML loaders.
13. **Consolidate docs.** Merge DIAGRAM_GUIDE + MERMAID.md + images/README, and SLIDE_GUIDE + CONTRIBUTING, into ≤2 authoring guides ready for `galaxy/doc/source/dev/`.

## Build health today (2026-09-26)

- **`make validate`: passes** (exit 0). Two warnings: `client` has no `suggestions/` dir and no `related_code_paths` for `review-ui-components`; `file-sources` is missing `.claude/CLAUDE.md`. Real schema problems pass silently (see `extra='ignore'`).
- **`make build` (run in a scratch copy):**
  - `validate` OK.
  - `build-slides` OK for all 16 topics (5s).
  - `images` failed locally: `/usr/bin/java` is the macOS stub, "Unable to locate a Java Runtime". This is an environment problem, not a repo bug.
  - With `images` skipped, `build-sphinx` failed because `uv` couldn't download sphinx/babel: **ENOSPC**. The disk is at 100% (126 MiB free). Also environment.
  - `lint-sphinx` then printed "HTML root not found" and **exited 0**. That is a repo defect.
- **Generated sphinx md vs committed `doc/source/architecture/*.md`**: identical, no drift.
- **`pytest tests`** (via `uv run --with pytest`): 6 passed.
- **GitHub Actions.**
  - Validate Topics passes.
  - **Build and Deploy Documentation has failed on main 3 times in a row**: 2026-01-14, 2026-02-23, 2026-05-20. Last success was 2025-11-25. The failed step is "Build documentation" (make exit 2). Logs have expired (HTTP 410), so the cause is unconfirmed.
  - Failed runs took 17–19 min vs about 1 min for passing runs, which suggests a hang.
  - One candidate: the first Mermaid diagram landed 2026-01-06, and CI never installs mermaid-cli, so the SVGs would be missing and the linter would fail. That doesn't explain the long runtimes, though.
  - Also: all actions are Node-20, which runners removed on 2026-09-16. Expect breakage on the next run regardless.

## Open questions

1. Does GTN stay a published target after migration (keep sync scripts), or does Galaxy Sphinx become the only output, with the GTN slides pointing to it?
2. Is it OK to convert content.yaml to markdown + front-matter before migration, or migrate the YAML as-is?
3. Mermaid: commit package.json/lock and install in CI, render client-side, or convert the 3 Mermaid diagrams to PlantUML?
4. Where should `review/` and the static commands live? Is `claude-galaxy-plugins` the owner?
5. Keep `related_topics` (and render "See also"), or cut it?
6. Keep the `notes/` and `plan/` research output anywhere (galaxy-brain), or discard it?
7. Deploy failure root cause: re-run the workflow with fresh logs before PR 1?
8. Should the "cleaning up the arguments" ask mean the CLI/Makefile args above, or something else (the rationale/"argument" for the POC)?
