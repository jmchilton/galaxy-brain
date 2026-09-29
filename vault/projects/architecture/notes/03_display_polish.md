# 03 - Display / Polish Audit

Audit date 2026-09-26. Local build = scratch copy of `galaxy-architecture` @ `01fd94c` (Sphinx 8.2.3, myst-parser 4.0.1, sphinx-rtd-theme 3.0.2). PlantUML **not** rendered (no Java). Mermaid rendered fine with local `node_modules/.bin/mmdc` (~10s). Also rebuilt the same md under a Galaxy-equivalent config (Sphinx 9.1.0, myst-parser 5.1.0, rtd 3.1.0, Galaxy's `myst_enable_extensions` + `_templates/layout.html` + `_static/style.css`). Live site = https://jmchilton.github.io/galaxy-architecture/.

Screenshots: `screenshots/` next to this note (01-08, referenced below as [S1]-[S8]).

## TL;DR

- **The live site is frozen at 2025-11-25.** Every "Build and Deploy Documentation" run on main since then has failed (2026-01-14, 2026-02-23, 2026-05-20; logs expired). Live has only 13 of 16 topics: **file-sources, markdown, tests are not on the site at all**, and the rest are ~10 months stale. Live slides still say "Paste#http / uWSGI" [S6] when source now says gunicorn.
- The "mermaid missing on live" claim is really that: those 3 diagrams belong to pages that were never deployed (frameworks' event-loop section is newer than the last deploy too). Also, the workflow never runs `npm install`, so even a green deploy would skip mermaid silently (`check-mermaid` exits 0).
- **A new, worse bug: the bare-URL linkifier in `outputs/sphinx-docs/build.py` corrupts code blocks and inline code.** It rewrote 8 code lines (e.g. `git clone [https://...](https://...)`, a YAML `url_regex` in file-sources [S8]) and pulls trailing punctuation into 10+ link targets (`https://www.sqlalchemy.org/.`). MyST's own `linkify` extension, or just not linkifying, fixes this.
- Theme/nav/mobile are fine: stock sphinx_rtd_theme, same as Galaxy. Mobile at 390px has no page-level horizontal scroll; code blocks scroll inside themselves [S5].
- Slide-derived prose reads like slides: ~360 H2s across 16 pages (tests alone has 72), sections that are only an image, one-line "paragraphs", and a Learning Questions/Objectives block at the top of each page. Some leaked markup got through, but less than the earlier pass claimed (details below).
- Galaxy compat: the generated md builds under Galaxy's config with **the same warning set**, and nothing in it depends on features Galaxy lacks. The blockers are structural, not about rendering: the `_images` symlink path scheme, the "View as slides" link (no slides in Galaxy's build), and Liquid `{% link %}` tags.

## Verified issues

Severity: H = visibly broken/wrong for readers, M = ugly or blocks migration, L = hygiene.

| # | Issue | Sev | Example | Shot | Status |
|---|---|---|---|---|---|
| 0 | Deploy workflow failing since 2026-01; live site stale, 3 topics absent | H | live index lists 13 topics; `file-sources.html` etc. 404 | [S6] | **new** |
| 1 | Mermaid diagrams missing on live | H | event_loop_blocking / file_sources_evolution / tests-decision-tree SVGs are 404 on live | [S7] shows the local render | **confirmed, cause refined**: pages undeployed (#0), and CI never installs mmdc, so it would skip silently anyway |
| 2 | `.pull-left/.pull-right` becomes stacked content split by `---` (an `<hr>`); only the first pair per block is handled | M | production.md "Default / Production": one-word paragraphs, then hr, then the second column [S2]. Probe: second pair left as raw `.pull-left[c]` | [S2] | **confirmed**. Only one pull pair exists in current content, so the "first pair only" limit is latent. `#### Default` right under the page also triggers 2× "H2 to H4" warnings |
| 3a | `_unwrap_remark_directives` regex `\.(\w+)\[` is not code-fence aware | M (latent) | probe: `first = self.items[0]` in a fence becomes `first = self0` | - | **confirmed as a latent bug**. No current content matches the pattern, so there's no live damage today |
| 3b | `strip_speaker_notes` splits on the first `???` anywhere, even mid-sentence or in code | L (latent) | probe: `Is it slow??? yes` becomes `Is it slow` | - | **confirmed as a latent bug**. The 9 current `???` uses are all line-start notes, so the output is correct today |
| 3c | `class:` leaks into prose | - | the only `class:` in output is the legit YAML `class: GalaxyWorkflow` in tests code blocks | - | **refuted**. `class` is a structured content.yaml field and never reaches prose |
| 3d | **Bare-URL linkifier corrupts code and trailing punctuation** | H | startup.md `$ git clone [https://github.com/...](...)`, 5 pip `Downloading [...]` lines, frameworks uvicorn log, file-sources YAML (also breaks Pygments lexing); link targets ending in `.`/`` ` ``/`*` in application-components, client, ecosystem, dependencies, frameworks, plugins, project-management | [S8] | **new** |
| 3e | Liquid `{% link ... %}` leaks into Sphinx as broken hrefs | M | client.md ×3 (webhooks training), plugins.md ×1 (visualization tutorial) | - | **new** |
| 3f | `.strike[...]` unwrapped with no replacement | M | plugins "Object Store": the deprecated `open(dataset.file_path)` example shows as normal code with no "don't do this" cue | - | **new** |
| 4a | Images use `../../images/` + Makefile post-copy, so Sphinx warns | - | final md uses `../_images/` (via the committed symlink `doc/source/_images -> ../../images`), and Sphinx resolves and copies them. Warnings (65) come **only** from unrendered PlantUML in my build | [S3] (PlantUML placeholders are local-only artifacts) | **refuted as stated**. The real problems are next |
| 4b | `_images` symlink publishes `images/README.md` as a page and parses `MERMAID.md`, because the pattern `**/_*.*` doesn't exclude it | L | live `/_images/README.html` = 200; 2× "not in any toctree", 1× "mermaid lexer" warning | - | **new** |
| 4c | Path scheme won't port to Galaxy: `../_images/` + a symlink + a Makefile post-copy of `images/*` into `html/images/` (the post-copy is only needed by `slides.html`) | M | Galaxy keeps diagrams next to docs (`doc/source/dev/*.plantuml.{txt,svg}`, both committed, plus `image.Makefile`) | - | **confirmed (reframed)** |
| 4d | Dead `copy_topic_images()` (never called; its `Path("*.svg").resolve()` check is meaningless); stale docstring on `rewrite_image_paths_for_sphinx` (its output is then rewritten again by `process_markdown_for_sphinx`) | L | build.py:199-238, 348-362 | - | **confirmed** |
| 4e | In-function imports: `re` ×4, `shutil` (duplicated at module level), `traceback`, `models.load_metadata` (duplicated) | L | build.py:71,120,155,215,371,421,434 | - | **confirmed** |
| 5a | conf.py references `_static`/`_templates`, which don't exist | L | "html_static_path entry '_static' does not exist" | - | **confirmed**. Galaxy has both (layout.html + a 3-line style.css) |
| 5b | `display_version` is deprecated | L | "unsupported theme option" warning | - | **confirmed, but Galaxy's own conf.py has it too** (rtd 3.1.0 warns there as well), so it's not our divergence |
| 5c | `html_baseurl = https://galaxyproject.org/architecture/` is wrong for the published site; the title suffix doubles up ("Galaxy Architecture Documentation — Galaxy Architecture Documentation master documentation") | L | every page `<title>` | [S1] | **new** |
| 6a | Root `doc/source/index.md` overview bullet list is missing file-sources, markdown, tests (the toctree via architecture/index is complete) | L | [S1] bottom list | [S1] | **confirmed** |
| 6b | `docs/OUTPUTS.md` stale: says Sphinx is "Planned / Not yet implemented (Phase 9)"; describes `overview.md/examples.md` content files and `##`/`---` splitting that no longer exist | L | - | - | **confirmed** |
| 6c | Generated md committed in `doc/source/architecture/*.md` while `outputs/sphinx-docs/generated/` is gitignored, so the same content exists twice with different git treatment | L | committed copy == fresh build today (`diff -rq` clean) | - | **confirmed** (in sync now, but only by discipline) |
| 7 | Oversized/undersized images: `galaxy_schema.png` is 2009×8488 (renders ~2900px tall); wide mindmaps shrink to unreadable text (core_files_scripts 1247px → 696px) [S4]; mermaid SVGs have no intrinsic size, so they stretch to full column (event_loop is 916px tall [S7]); no click-to-zoom | M | application-components, files, frameworks | [S4][S7] | **new** |
| 8 | Slide-to-prose readability: each slide becomes an `##`; pages like files (133 words, 9 images) are just heading + image; production has one-word paragraphs; tests has 72 H2s; alt text typo "HDA foor bar..." | M | files, production, tests, application-components | [S2][S4] | **new** (content, not pipeline) |
| 9 | "View as slides" link: a `> 📊 <a href="{id}/slides.html">` blockquote. Works on GH Pages (200 for all topics) but depends on the Makefile copy step; in Galaxy's build it would 404 | M | every page header | [S2] | **confirmed** |
| 10 | Live slides.html loads `/outputs/training-slides/assets/css/fonts.css` (404 under the `/galaxy-architecture/` subpath) | L | live production/slides.html console | [S6] | **stale-only**: the current template doesn't reference it, so the next deploy fixes it |
| 11 | Generated GTN slides: `slides.md` matches training-material's `slides.html` for 15/16 topics (only the sync-added prev/next footnote differs); frameworks is 91 lines ahead (unsynced async content). Two GTN-only image paths (`{{ site.baseurl }}/assets/images/GTNLogo1000.png`, `../../../../shared/images/conda_logo.png`) 404 in the standalone slides.html | L | ecosystem | - | **new**, minor |

Things that are fine: code highlighting (3 benign "relaxed mode" lexer retries, one of which is caused by #3d), mobile layout, sidebar nav (flat 16-item list, current page highlighted), search, and mermaid rendering itself when built.

## Galaxy doc theme compat

| | this repo | Galaxy `doc/source/conf.py` | Impact |
|---|---|---|---|
| Theme | sphinx_rtd_theme, same `html_theme_options` | same | identical look |
| Extensions | myst_parser, intersphinx | + mathjax (+ autodoc/doctest/todo/coverage/viewcode unless SKIP_SOURCE) | none |
| myst extensions | attrs_block, deflist, substitution, colon_fence | **+ dollarmath** | scanned output: no `$` outside code, so no math misparse today. Worth a CI guard, since `$VAR` in prose would turn into math |
| heading anchors / slug func | 5 / `docutils.nodes.make_id` | same | anchors identical |
| Versions | Sphinx 8.2 / myst 4.0.1 / rtd 3.0.2 | Sphinx 9.1 / myst 5.1 / rtd 3.1 | built under Galaxy's pins: **same 76-77 warnings, no new ones** |
| exclude_patterns | `**/_*.*`, `_build` | `**/_*.*` (+lib/releases) | same |
| version | "master" | from galaxy.version | cosmetic |
| static/templates | missing | layout.html adds `style.css` (`div.floatright`) | nothing we'd use |

Verdict: the md renders the same in Galaxy. What has to change for migration isn't rendering: (a) image location scheme (#4c; follow Galaxy's `dev/` pattern: diagrams beside the md, rendered SVGs committed, since Galaxy's doc build has no Java/Node step); (b) "View as slides" should point at the GTN URL (`https://training.galaxyproject.org/training-material/topics/dev/tutorials/architecture-<id>/slides.html`) instead of a sibling file; (c) strip or resolve Liquid `{% link %}` into real GTN URLs; (d) don't bring the `_images` symlink. We don't use anything Galaxy lacks. Galaxy has dollarmath and we don't, which is harmless today.

## Recommended polish PRs (ordered, small)

1. **Fix deploy + mermaid in CI.** Get the logs from a re-run, fix the failing step, add `npm ci` (or make `check-mermaid` fail in CI), and bump the Node-20 actions (deprecated; Node 20 was removed from runners on 2026-09-16, which will break it again). Restores the 3 missing topics and 10 months of updates.
2. **Make the linkifier code-aware, or drop it.** Either enable MyST `linkify` (needs `linkify-it-py`; Galaxy doesn't enable it, so avoid it if you want parity) or skip fenced/inline code and trim trailing `.,;:*\``. Add a red-to-green test with the `git clone` and `url_regex` cases.
3. **Make the directive/notes transforms fence-aware.** One helper that splits md into code/non-code segments, used by `_unwrap_remark_directives`, `strip_speaker_notes` (line-anchored `^???$`), and the linkifier. Tests from the probes in #3a/#3b.
4. **Render `.pull-left/.pull-right` as a real two-column block** (MyST `:::{container}` + a small CSS grid, or a plain table/definition list), and loop over all pairs. Map `.strike[` to a "Deprecated:" admonition, and `.footnote[` to a small note.
5. **Resolve Liquid `{% link topics/... %}`** to absolute GTN URLs in the Sphinx builder.
6. **build.py hygiene.** Delete `copy_topic_images` and the stale docstring, hoist imports, and add `images/*.md` to `exclude_patterns` (or stop symlinking all of `images/`).
7. **conf.py hygiene.** Drop `_static`/`_templates` (or add them like Galaxy), fix `html_baseurl`, and set `html_title` to drop the "master documentation" suffix. Leave `display_version` in step with Galaxy.
8. **Image sizing.** Add `{width=...}` attrs (attrs_block is on) for the tall/wide offenders, give mermaid a max-width via CSS, and wrap large images in links to the full size. Fix the alt-text typo.
9. **Docs hygiene.** Regenerate the root `index.md` overview from metadata (or delete the hand list), update `docs/OUTPUTS.md`, and decide which copy of the generated md is canonical (#6c).
10. **(Content) prose-ify the worst slide-shaped pages:** files, production, application-components. Use `type: prose` blocks or `doc.render: false` for image-only slides.

## Open questions

- Keep PlantUML at all for the Galaxy migration? Galaxy commits rendered SVGs, so should we do the same and drop CI Java?
- Should "View as slides" point at GTN, or should Galaxy docs host the slides?
- Learning Questions/Objectives at the top of doc pages: keep them, move them to the end, or show them only in slides?
- Should both copies of the generated md stay committed (#6c), or become a build artifact only?
- Enable MyST `linkify` here and in Galaxy, or keep a custom (fixed) linkifier?
