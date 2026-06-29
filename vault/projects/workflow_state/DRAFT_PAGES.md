# Draft Workflow Diagram Pages

How to turn a directory of draft-workflow snapshots into one HTML page of `gxwf mermaid`
diagrams that reads as a "fill-in walk" (planned → concrete → realized). Written after
building `~/draft_workflows/diagrams.html` for the UC4 and MRSA walks.

## Input shape

A dir of `step-NN-<slug>.gxwf.yml` snapshots, numerically ordered. Earlier files are
`class: GalaxyWorkflowDraft` (some steps still planned/TODO); the final `*-extracted` is
`class: GalaxyWorkflow` (all concrete). Each snapshot = one frame of the walk. Collections
used here: `~/draft_workflows/UC4` (7), `~/draft_workflows/MRSA` (16).

## Tool: `gxwf mermaid`

From galaxy-tool-util-ts. The draft worktree used:
`/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/parsed_tool_fixes`.

- **Invoke the real bin: `node packages/cli/dist/bin/gxwf.js mermaid <file>`.**
  `dist/programs/gxwf.js` only *exports* the program builder — running it directly
  exits 0 with **empty output and no error**. That silent no-op cost the most time here.
  If `dist/` is stale, build first (`pnpm -r build`).
- Draft overlay auto-applies to `GalaxyWorkflowDraft`: concrete steps render solid,
  planned steps grey-dashed via a `classDef planned`. `--no-draft-overlay` forces plain.
- Output goes to stdout (raw mermaid). Pass `[output]` ending `.mmd` (raw) or `.md`
  (fenced block) to write a file instead.
- Derive per-frame counts from the diagram text: `total = count(/^\s*step_\d+[\["]/m)`,
  `planned = members of the "class …,…  planned;" line`, `concrete = total - planned`.

## Build the page

Self-contained HTML, mermaid ESM from CDN, one `<pre class="mermaid">` per snapshot in a
responsive grid, with a step number + slug + `concrete/total` badge + progress bar per card.
Working generator: **`~/draft_workflows/_build-diagrams.mjs`** (`node _build-diagrams.mjs`).
Skeleton:

```js
const GXWF = ".../packages/cli/dist/bin/gxwf.js";   // the BIN, not programs/
for (const f of files.sort(byStepNum)) {
  const { stdout } = await run("node", [GXWF, "mermaid", join(dir, f)]);
  // counts from stdout, then emit <figure class="card"><pre class="mermaid">…</pre></figure>
}
// page tail:
//   import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
//   mermaid.initialize({ startOnLoad: true, securityLevel: "loose", flowchart: { useMaxWidth: true } });
```

## Viewing

- Real browser (Safari/Chrome): open the `.html` directly — `file://` works.
- Playwright / automation **blocks `file://`**. Serve over http to screenshot:
  `cd <dir> && python3 -m http.server 8731`, then navigate `http://localhost:8731/…`.

## KNOWN BUG — diagrams under-connect (renderer, not the workflows)

Step→step edges into any step that carries an explicit `label:` are **silently dropped**.
The source workflows are correct; the renderer is wrong.

- Root cause: `packages/schema/src/workflow/mermaid.ts` keys step nodes by
  `stepRenderIdentity = label || id` and builds `knownLabels` from labels + input ids only.
  But format2 `in:` sources address steps by their **dict key / `id`** (e.g.
  `meme_files: meme/meme_output`). `resolveSourceReference` (normalized/labels.ts) can't
  match `meme/…` against the long label, falls back to a slash-split yielding `meme`, then
  `stepIds.get("meme")` misses → `continue`, edge gone. Input→step edges survive because
  inputs are referenced *by id* and keyed by id.
- Evidence: UC4 realized (`step-6-extracted`) renders 8 `input→step` edges and drops all 4
  `meme|fel|busted|prime → drhip` edges; `drhip` renders orphaned. The workflow declares
  them (`drhip.in.meme_files: meme/meme_output`, …) and the connection validator resolves
  them fine (it runs on the native rep with numeric `conn.id`). So: renderer-only.
- Same bug in `packages/schema/src/workflow/cytoscape.ts` (L99-101 build `knownLabels` from
  `stepRenderIdentity`; L250 `resolveSourceReference`).
- Fix sketch: also index step nodes by `step.id` and add step ids to `knownLabels`, mapping
  id → render label so the `overlay.plannedSteps` checks (keyed by render identity) still
  hit. Touch mermaid.ts (~L145-167 node build, L197 knownLabels, L202-235 edge loop) and
  mirror in cytoscape.ts.
- **Until fixed, do not read a missing edge as a missing connection in the source.** Walks
  whose steps have human labels (all of UC4/MRSA) will look far sparser than they are.

## Provenance

Snapshots come from the draft walk (`gxwf draft-next-step` loop → `gxwf draft-extract`),
e.g. via `/test-pipeline <slug>`. Each iteration concretizes one planned step; the page just
renders each saved snapshot in order.
