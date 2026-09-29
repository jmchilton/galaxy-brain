# 05 - Archify Evaluation

Evaluated 2026-09-26. Repo: https://github.com/tt-a1i/archify @ `9e35d2b` (2026-09-23), shallow clone at `~/projects/repositories/archify`. Tried against the local Galaxy clone (`~/projects/repositories/galaxy`, pinned to `origin/dev` `8cecbebdf98`).

## TL;DR

- **Verdict: don't adopt it as a toolchain. Borrow 3–4 ideas. At most one optional experiment.**
- Archify is an **agent skill** plus a zero-dependency Node renderer. An LLM agent hand-writes a typed JSON IR (including node x/y coordinates). Archify then validates the layout and renders one ~800 KB self-contained interactive HTML file per diagram.
- **It does not analyze code.** The "source-backed" diagrams are the agent's reading of the repo. Archify only checks that the cited files and line ranges exist at a pinned commit.
- **Poor fit for Galaxy docs:**
  - no CLI export to static SVG/PNG (only a manual in-browser Export menu);
  - ~800 KB HTML per diagram, against Galaxy's "commit small rendered SVGs, no Node/Java in CI";
  - no mindmap, ER/class or tree types, and no auto-layout, so it can't fix our worst images (`galaxy_schema.png`, file-tree mindmaps).
- **Doesn't answer Q3/Q13 (Mermaid vs PlantUML).** Its "Mermaid input" is the agent re-authoring by hand, not a parser.
- **Worth borrowing:**
  - the diagnostics pattern: stable code, subject, evidence and supported fixes;
  - the "≤12 nodes, one main path, detail in cards, not edges" authoring rules;
  - click-to-zoom/pan for large diagrams;
  - pinning a code reference to a revision in the diagram source.

## What archify is

| Aspect | Finding |
|---|---|
| Purpose | "Turn anything into an interactive visual": architecture, workflow, sequence, dataflow and lifecycle diagrams as standalone HTML with inline SVG, dark/light themes, pan/zoom, search, focus, route tracing, guided "views", presentation mode, and PNG/SVG/WebM export in the browser. |
| How it works | `archify/SKILL.md` (137 lines) tells the agent to pick a type, read one schema plus one example, write JSON, then run `validate` → `deliver`. JSON holds `components[]` with explicit `pos`/`size`, `connections[]`, `boundaries[]`, `cards[]` and `meta.views[]`. The renderer does orthogonal routing and label placement. The agent owns node placement. |
| LLM use | **Not in the tool itself** ("no LLM call" per CHANGELOG). All semantic content and layout come from whichever agent runs the skill (Claude Code, Codex, Cursor, opencode). The renderer is deterministic. |
| Inputs / outputs | JSON IR in. `.html` out (~810 KB: ~483 KB viewer JS, 6 inlined fonts, ~20 KB SVG) plus a JSON receipt (SHA-256 of spec and artifact, check results). |
| Source evidence | Optional `meta.repository {url, revision}` plus `components[].sources[{path, line, end_line}]`. `--repo-root` verifies them locally with git at the pinned SHA. Nodes get "SRC n" badges that link to GitHub at that SHA. |
| Other CLI | `guide` (scenario → diagram type), `compare` (architecture before/after "delta" HTML), `preview` (watch loop), `visual-check` (needs local Chrome), `brands`, `doctor`, `demo`. |
| Deps | Node ≥18, **no runtime npm deps** (devDeps: ajv, parse5, saxes, simple-icons for tests/codegen). No Java, no Docker, no browser needed to render. |
| License | MIT. `based_on: Cocoon-AI/architecture-diagram-generator (MIT)`. |
| Maturity | Created 2026-04-15. ~72k stars, ~4.9k forks (viral, #1 weekly trending). 271 commits, ~188 (~70%) from the one author. Version `2.17.0-dev.1`, 20 CHANGELOG sections in 5 months. 120 test files, CI on Node 18–24 plus browser and export tests. 103 issues. Popularity is real. API/schema stability is not established yet (fast release cadence, dev version). |
| Network | The skill runs `scripts/check-update.mjs`, a GET to a fixed manifest about every 72h. Opt out with `ARCHIFY_UPDATE_CHECK_DISABLED=1`. Routine, but worth knowing for CI. |
| Scope stated | "Automatic Mermaid parsing, general-purpose auto-layout, hosted sharing, and WYSIWYG editing are intentionally outside the current scope." |

## Evidence from trying it

Scratch dir: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-architecture/f3734e2d-f943-4021-8a77-6fb754818156/scratchpad/archify/` (`galaxy-jobs.architecture.json`, `galaxy-jobs.html`, `galaxy-jobs.png`, `extracted.svg`).

1. `node bin/archify.mjs doctor` ran with no install (Node 25). All green.
2. I hand-authored an 11-node "tool execution → job completion" architecture JSON with 8 `sources` pinned to Galaxy `8cecbebdf98`. This took ~10 min, mostly finding line anchors.
   - **Caveat: I didn't review it for accuracy.** For example, `api/tools.py:1041` is the legacy `ToolsController.create`. Don't lift it into a topic.
3. First `validate --quality showcase` failed on 2 label/node overlaps. It gave exact suggested `labelAt` coordinates. Applying them made it pass 9/9 checks in ~0.75s.
4. `deliver` produced an 812 KB HTML file. Rendering twice gave **byte-identical output** (same SHA-256).
5. The screenshot at 1440×900 is clean and readable (pastel boxes, monospace, legend, "SRC" badges, cards below). It looks good. Interactivity (focus, route, lens) works without a server.
6. Evidence checks:
   - A **missing file** at the pinned revision fails: `repository-evidence/file-missing`, with the component id and a fix hint.
   - A **wrong line range** fails nothing: `objectstore/__init__.py` lines 1–5 labelled "ObjectStore" passes. It only checks that the range is in bounds, not that the symbol is there.
   - An **older revision** (2025-06 `5fb5a14`) fails only because `api/tools.py` was shorter then (`line-out-of-range`). Line numbers that shifted but stayed in bounds would still pass while pointing at the wrong code.
   - **No `--repo-root`** means a hard failure (`root-required`), so the check can't be silently skipped.
7. The extracted `<svg>` has 95 `class=` attributes and 0 inline styles, so it's unstyled outside the HTML. The viewer's `export.js` does inline the CSS rules when you export an SVG, but only in a browser, by hand. There is no CLI export subcommand.

## Fit per area

| Area | Verdict | Why |
|---|---|---|
| Replace PlantUML/Mermaid | **Skip** | Different category: interactive HTML, not a text→SVG compiler. No mindmap, class, ER or component-tree types. Coordinates are hand-placed, so JSON diffs are noisy (`pos: [460, 300]`) next to PlantUML text. Doesn't help Q3/Q13. |
| Diagram generation / refresh | **Skip as a tool, borrow the rules** | "Refresh" means an agent re-authors the JSON, which is no more reproducible than re-authoring PlantUML. The SKILL authoring rules are good and generic: ≤12 primary nodes, one obvious main path, side branches off the nearest node, drop low-value edges before adding routing tweaks, supporting detail in cards. Fold them into the merged DIAGRAM_GUIDE (Phase 1.7). |
| Display quality (issue #7: 8488px PNG, unreadable mindmaps) | **Skip the tool, borrow the idea** | Its readable output comes from limiting diagrams to ~12 nodes, which is a content decision we can make ourselves (split `galaxy_schema.png`, split mindmaps). Pan/zoom/click-to-enlarge is the real display win. Get it via a small Sphinx JS helper or links to full-size images (Phase 3.2), not an 800 KB viewer per image. |
| Stale code paths / drift | **Borrow the idea** | Its check (file exists and range in bounds at a pinned SHA) is weaker than what the plan already wants (`code_paths` existence test against the checkout). Two things worth copying: (a) **structured diagnostics** (`code`, `subject` = topic/field, `evidence`, `supportedFixes`) so agents and humans can repair failures mechanically; (b) if we ever cite line-level locations, anchor by **symbol** (`path::Class.method`, checked with `ast`), not line numbers, which archify shows are fragile. |
| Bootstrap missing topics (jobs, data model, API, workflows) | **Skip / optional** | It doesn't research code. The research is still `/research-topic` plus human review. It could render one overview diagram per new topic, but so can PlantUML. |
| Agent-context generation | **Skip** | Nothing there beyond the skill-authoring pattern itself. Its typed IR is a nice example of "schema + one example + validate loop" as an agent skill design, which resembles our Pydantic plus `make validate`. |
| Galaxy doc infra / CI | **Poor fit** | Galaxy's pattern is committed rendered SVGs next to sources, no Node/Java in docs CI (04). Archify would mean either a manual browser export per diagram (no reproducible regeneration, unlike `image.Makefile`) or committing ~800 KB HTML per diagram plus a raw iframe in MyST. That feeds the "repo bloat" objection. The Node dep is fine locally but must never enter Galaxy CI. |
| GTN slides | **Skip** | Remark slides want static images. The HTML can't embed cleanly and the fonts/viewer clash with GTN. |
| Architecture Delta (`compare`) | **Interesting, not needed** | Before/after diff of architecture JSON for PR review. Only useful if diagrams were archify JSON, and they won't be. |

## Risks (if adopted anyway)

- **Maturity/churn**: 5 months old, dev version, weekly feature slices, one main author. The schema has already needed a workflow v1→v2 migration. The star count means popularity, not stability.
- **LLM nondeterminism vs Galaxy review culture**: rendering is deterministic, but authorship isn't. Each "regenerate" produces new JSON with new coordinates, so reviewers diff the numbers instead of the meaning. Visual correctness still needs a human (its own docs say `visual-check` doesn't approve polish).
- **False sense of verification**: "SRC ✓ verified" badges only prove a file and line range existed at a SHA, not that the diagram's claims are true.
- **Size**: ~0.8 MB per diagram. 50 diagrams would be ~40 MB of mostly duplicated viewer JS.
- **Deps/network**: Node runtime, update-check ping (disable in CI), optional Chrome for `visual-check`. MIT license, so no license risk.
- **Marketing-heavy project** (sponsors, social links, Chinese community channels). Nothing concerning, but the docs are long and noisy to learn from.

## Suggested experiment (optional, low priority)

Only if an interactive overview is wanted for the new **jobs & tool execution** topic (Phase 3 "after migration"):

1. The agent drafts `jobs.architecture.json` with sources pinned to a Galaxy SHA. A human reviews every node and edge against code.
2. Commit a **PlantUML (or exported static SVG) version as the canonical image** in the doc. Publish the archify HTML outside Galaxy's repo (galaxy-brain or gh-pages) and link it as "explore interactively".
3. Measure: author time, reviewer comments on the JSON diff vs the PlantUML diff, and whether readers use the interactivity.
4. Kill it if the reviewer diff is noisy or nobody clicks through.

Slots: none in Phases 0–2. Borrowed ideas go in **Phase 0.3/testing** (structured diagnostics in the `code_paths` test), **Phase 1.7** (authoring rules in DIAGRAM_GUIDE) and **Phase 3.2** (image sizing + click-to-zoom). The experiment would go in **Phase 3 "after migration"**.

## Unresolved questions

1. Want interactive diagrams at all, or are static SVGs in Sphinx enough?
2. Should the `code_paths` test emit archify-style structured diagnostics (code/subject/evidence/fix)?
3. Symbol anchors (`path::Class.method`) in front-matter, or keep paths only?
4. Add click-to-zoom JS to the docs, or just width attrs plus links to full-size images?
5. Worth running the jobs-topic experiment, or skip entirely?
6. Delete `~/projects/repositories/archify` clone (66 MB) after reading?
