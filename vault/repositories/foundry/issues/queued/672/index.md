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

**Item 4 — `element_identifier` exists on 26.1, unverified by run.**
- UDT inputs come from `runtimeify` (`lib/galaxy/tools/evaluation.py` `UserToolEvaluator`). The data object is `DataInternalJson` (`lib/galaxy/tool_util_models/parameters.py`): `class`, `basename`, `nameroot`, `nameext`, `location`, `path`, `format`, `size`, `listing`, `checksum`, `element_identifier`.
- `adapt_dataset` sets `element_identifier` for a DCE reference (`lib/galaxy/tools/runtime.py`, `bab77ba32d8`, 2026-03-08; in `release_26.1`, not `release_26.0`). Null for a plain dataset input.
- No API test covers `$(inputs.x.element_identifier)`. Verify with one API run (UDT mapped over a 2-element list) before documenting; an upstream API test would be a good companion.
- The issue's proposed prohibition ("a UDT cannot name its own collection element") is likely wrong on 26.1.

**Items 2–3 — note additions.**
- `configfiles[].content` goes through the undeclared-input check (1.14.0 `semantic.js`) and the same expression evaluation (authoringHelp `expressions-pattern`). Attested.
- PATH-staged script vendoring is target-neutral: fits §6.
- Nextflow template enumeration (`$task.*`, `$meta.*`, `ext.args`) is Nextflow-specific: separate labelled subsection or [[component-nextflow-containers-and-envs]]. `$task.cpus` → unbraced `$GALAXY_SLOTS`; `${GALAXY_SLOTS}` is evaluated as JS.

## Parallel with #617

- #617: draft, idle since 2026-09-24; its pin is stale (galaxy#23694 merged 2026-09-25).
- Our branch: off `origin/main`, edits only the authoring note + recast. Cite pinned Galaxy URLs, not #617's vendored YAML.
- Expected overlap: generated `author-galaxy-tool-wrapper` cast / `_provenance.json` (also touched by #545). Resolve by recasting.

## Next

1. gtu-ts: resync UDT schema, test flat collection output passes `validate-tool-source`.
2. Galaxy 26.1/dev worktree: one API run for `element_identifier` on mapped UDT.
3. Foundry branch: rewrite §3 (input object), §5 (flat example + gxwf caveat), §6 (vendored script), Nextflow template subsection; recast.
