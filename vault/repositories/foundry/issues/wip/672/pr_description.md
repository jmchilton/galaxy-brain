Title: docs(galaxy-user-tool-authoring): collection outputs, vendored scripts, input object

Fixes #672. Updates `content/research/galaxy-user-tool-authoring` and recasts `author-galaxy-tool-wrapper`.

**Draft: requires jmchilton/galaxy-tool-util-ts#198** (UDT schema resync from Galaxy `release_26.1`). Before undrafting: merge and release #198, bump the gxwf pin here, and drop the §5 "validator defect" paragraph.

- **§5 collection outputs.** The note's flat shape was right. Galaxy 26.1 puts `collection_type` and `discover_datasets` on the output (galaxyproject/galaxy@b8db3bd2ace), and a discovery entry needs only `pattern`. The `structure:` form the issue found comes from gxwf's bundled schema, which predates that change. The note now states the shape and discovery rules, and has a temporary paragraph saying gxwf ≤1.14.0 rejects it. It should not be worked around with `structure:` or a duplicate key. The schema resync is jmchilton/galaxy-tool-util-ts branch `issue-672-udt-schema-resync`. Drop the paragraph once a release with the resync is pinned.
- **§6 script placement.** `configfiles` content is evaluated and checked like `shell_command`. New recipes:
  - Vendoring a script the source puts on `PATH`: copy it verbatim, audit for `$(`/`${`, keep its license header, and name the source version.
  - Rendering a Nextflow template: list and count the interpolation sites, then resolve each one. `$task.cpus` becomes unbraced `$GALAXY_SLOTS`, `$meta.*` becomes parameters, and `ext.args` is resolved from `conf/modules*.config`. Record the resolutions in `help`.
- **§3 input object.** Lists the fields of a `data` input's file object. `$(inputs.x.element_identifier)` renders `null`, even mapped over a collection. This was API-tested on Galaxy dev `51e0a80a` through `/api/tools` and `/api/jobs`. `basename`/`nameroot` come from the upload filename, not the identifier. So a user-defined tool can't name its own collection element, and per-sample labels written into files are identical across a mapped collection.

Independent of #617: no shared source files, so overlap is limited to the generated cast and `_provenance.json`, which a recast resolves.

`npm run validate`: 0 errors. Cast, index, and dashboard checks are clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
