# foundry#672 — galaxy-user-tool-authoring: invalid collection-output example, no vendoring recipes, input-object question

[Issue](https://github.com/galaxyproject/foundry/issues/672) · target note `content/research/galaxy-user-tool-authoring/index.md` · related draft PR [#617](https://github.com/galaxyproject/foundry/pull/617) (mvdbeek, vendors Galaxy `authoringHelp.yml`)

## Proposed labels (not applied; needs John's OK)

- `roadmap/substep`, parent #501 (Improved Support for Tool Development) — same parent as #468, same UDT authoring surface.
- `priority/mvp` — item 4 makes mapped tools write identical sample names, so MultiQC collapses rows: wrong results now.
- `agent/implement` — note edits plus one upstream schema resync; no open design question once item 4 is verified.
- No blocker label: the gxwf schema fix is in jmchilton/galaxy-tool-util-ts, ours to do in parallel.

## Findings (2026-10-22)

usegalaxy.org runs 26.1 (`/api/version` → 26.1.2.dev0); that sets the version boundary for items 1 and 4.

**Item 1 — the note's flat shape is right; gxwf's schema is stale.**
- Galaxy flattened UDT collection outputs in `b8db3bd2ace` (2026-05-24, "Converge UDT collection output to flat Shape A"), in `release_26.1`. `collection_type` / `discover_datasets` sit at the output's top level; a legacy `structure:` is lifted (`lift_legacy_collection_structure`, `lib/galaxy/tool_util_models/tool_outputs.py`).
- gtu-ts `packages/schema/src/user-tool-source/schema.json` was last regenerated 2026-05-07 (`62dc8a71`). Released `@galaxy-tool-util/schema@1.14.0` (Foundry's pin) still has `IncomingToolOutputCollection` requiring `structure`, no `IncomingUserToolOutputCollection`, and all 10 `FilePatternDatasetCollectionDescription` fields required.
- The 1.14.0 semantic check reads top-level `discover_datasets`, which matches Galaxy. The issue's "structure + duplicate top-level" shape works around a stale validator; don't put it in the note.
- Galaxy's own `authoringHelp.yml` (vendored by #617) uses the flat shape.
- Fix: resync gtu-ts schema via `scripts/dump-user-tool-source-schema.py` against Galaxy dev, release, bump Foundry. Note keeps flat shape plus a temporary "gxwf ≤1.14.0 rejects this" line, per #617's pattern for its gxwf defect. Still check `pattern: __name__` / `format` in the §5 example against the regenerated schema.

**Item 4 — issue is right: `element_identifier` renders `null`, even mapped.** (Corrects my earlier code-read guess.)
- API-tested on Galaxy dev `51e0a80a`, worktree `~/projects/worktrees/galaxy/branch/udt_element_identifier_api_test`, commit `bc1f26b4486`, pushed to `jmchilton`. Mapped over a list via `/api/tools` and via `/api/jobs` Batch: both `null`. Plain dataset: `null`. Mapped tests left red on purpose (assert desired behavior).
- Cause: map-over expansion stores each job's input as `{"src": "hda"}` (`lib/galaxy/tools/parameters/meta.py:450`, transient identifier at `:508`), so runtimeify's DCE branch (`lib/galaxy/tool_util/parameters/convert.py:821` → `lib/galaxy/tools/runtime.py:160-172`) never runs. Legacy `to_cwl` (`lib/galaxy/workflow/modules.py:374`) uses the identifier only as a basename fallback.
- `basename`/`nameroot` = `created_from_basename` or HDA name; matched the identifier only because pasted elements had no upload filename.
- Output labels do resolve `$(inputs.x.element_identifier)` on map-over (`test_unprivileged_tools_labels.py::test_mapped_over_labels`): labels and command line disagree. Possible Galaxy fix: keep DCE reference in batch-expanded job state.

**Items 2–3 — note additions.**
- `configfiles[].content` goes through the undeclared-input check (1.14.0 `semantic.js`) and the same expression evaluation (authoringHelp `expressions-pattern`). Attested.
- PATH-staged script vendoring is target-neutral: fits §6.
- Nextflow template enumeration (`$task.*`, `$meta.*`, `ext.args`) is Nextflow-specific: separate labelled subsection or [[component-nextflow-containers-and-envs]]. `$task.cpus` → unbraced `$GALAXY_SLOTS`; `${GALAXY_SLOTS}` is evaluated as JS.

## Parallel with #617

- #617: draft, idle since 2026-09-24; its pin is stale (galaxy#23694 merged 2026-09-25).
- Our branch: off `origin/main`, edits only the authoring note + recast. Cite pinned Galaxy URLs, not #617's vendored YAML.
- Expected overlap: generated `author-galaxy-tool-wrapper` cast / `_provenance.json` (also touched by #545). Resolve by recasting.

## Done (2026-10-22)

- gtu-ts: branch `issue-672-udt-schema-resync` on `origin` (jmchilton/galaxy-tool-util-ts), `a7a508ce` + `509b403b`. Schema regenerated from Galaxy `release_26.1` `5af1d03c929` (dev cut pulled in dev-only `runtime_environment_variables`, test `visible`); PR [jmchilton/galaxy-tool-util-ts#198](https://github.com/jmchilton/galaxy-tool-util-ts/pull/198), text [pr_description_gtu_ts.md](pr_description_gtu_ts.md); tests mirror Galaxy's collection cases (pattern-only test red on old schema, green on new). Changeset added. `make check` clean; `make test` green except gxwf-web `--output-schema`, which flakes under full-suite load and passes alone with and without the change. The note's §5 example passes rebuilt `validate-tool-source`.
- Foundry: branch `issue-672-udt-authoring-note` on `origin`, `12d8f77a` (§5, §6) + `5c001801` (§3). Recast; `validate` 0 errors; casts, index, dashboard clean. Draft PR [#710](https://github.com/galaxyproject/foundry/pull/710), requires gtu-ts #198; text [pr_description.md](pr_description.md).
- Galaxy: red API tests above, branch `udt_element_identifier_api_test` on `jmchilton`; no PR.

## 2026-10-26 — egapx comment (data_collection inputs)

Comment [6420577078](https://github.com/galaxyproject/foundry/issues/672#issuecomment-6420577078). Branch rebased onto `main` `f48c01b6`, commit `f0727bd3` pushed.

- Collection-input runtime shape (runtimeify, Galaxy dev `87d295c9` `runtime.py` L95-102, L290-370; models `parameters.py` ~L870-960): `{class: Collection, name, collection_type, tags, elements}`. `list*`/`sample_sheet*` → `elements` is an **array** (not a map, despite the brief); `paired`/`record`/`paired_or_unpaired` → keyed object; `has_single_item` for `paired_or_unpaired`, singleton key `unpaired`. Leaf Files carry `element_identifier`. Code-read only.
- **Two builders.** `UserToolEvaluator.build_param_dict` uses runtimeify only when `job.tool_state` is set (`/api/jobs`, validated workflow steps; workflow capture is best-effort, falls back). Legacy `to_cwl` (`/api/tools`, failed capture) gives paired as bare `{forward, reverse}`, list as bare array, no `elements`/`has_single_item`. So egapx `star_wnode`'s `inputs.reads.forward.path` works on legacy and fails on runtimeify. Galaxy-side follow-up candidate: shape is submission-path dependent. Not filed.
- `element_identifier` on mapped `data` input: still null on dev; fixes galaxy#24434 (ours) and #24422 open against `release_26.1`.
- gxwf 1.14.0 accepts `data_collection` inputs (scratch probe OK) and does not check property paths after `inputs.X` (comment's follow-up, gtu-ts).
- §5 example (+`format`) passes `validate-tool-source` built from gtu-ts `main` `539c16c9`; still fails 1.14.0. #198 merged 2026-10-25, **not released** (npm latest 1.14.0).

## Next

1. Release gtu-ts (contains #198), then bump Foundry's gxwf pin and drop the §5 "validator defect" paragraph.
2. Undraft #710 after step 1 lands in it; refresh its body from the branch record's `pr_description.md`.
3. Galaxy: land #24434 (or #24422); then relax §3's map-over line.
4. Link #672 as native sub-issue of #501 (`validate-roadmap` fails without it).
