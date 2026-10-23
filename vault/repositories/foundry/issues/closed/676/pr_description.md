Title: Package parsed-tool, summarize and draft-next-step where Molds cite them

Fixes #676.

Three skills cite a reference by name without shipping it. The Runtime Note limits a run to files in its bundle, so each omission was a hard stop. The docs already existed; the Molds didn't list them in `references:`.

**`parsed-tool` schema**
- Now an on-demand reference in `implement-galaxy-tool-step` (rev 10) and `advance-galaxy-draft-step` (rev 8).
- `galaxy-tool-summary` leaves `parsed_tool` as a placeholder that points at this schema.
- New line in `implement-galaxy-tool-step` step 2: read a conditional's cases from `parsed_tool`, not the wrapper XML. A case's position in `whens[]` is its index, and `is_default_when` marks the default, which need not be case 0.
- This doesn't decide whether to emit `__current_case__`; that's #649.

**`galaxy-tool-cache summarize` CLI**
- Now an on-demand sidecar in `advance-galaxy-draft-step`, triggered on step 3's reuse branch.
- Step 3 now says how to get a reused pin's summary: use the file an earlier iteration wrote, or regenerate it with `galaxy-tool-cache summarize <tool_id> --tool-version <v> --cache-dir <dir> --output <file>`.

**`draft-next-step` CLI**
- Now an on-demand sidecar in the four `*-to-galaxy-template` Molds (nextflow, cwl, freeform, workflow-brief).
- Its reference answers the question the run couldn't: it descends into draft subworkflows and returns the picked step's full path.

The 6 casts, the pipeline assemblies and `Dashboard.md` are regenerated. Docs only, so there's no changeset.

Checks: validate, check-generated, check-casts, check-verify, check-assemble-pipelines, check-fixtures all green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
