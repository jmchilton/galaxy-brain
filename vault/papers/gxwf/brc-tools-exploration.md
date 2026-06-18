# brc-tools exploration: bugs found, tooling hardened, paper hooks

Debrief of a gxwf "play with it / harden it" pass over the agent-authored
workflows in `brc-tools` (the Pv4 pangenome pipeline port: 11 workflows, 33
tools, A→K phases). These workflows lean heavily on **user-defined / local
tools** — a surface gxwf had not been exercised against. Tooling fixes landed
in the `galaxy-tool-util` `parsed_tool_fixes` branch.

Date: 2026-06. Tool under test: `gxwf` from `parsed_tool_fixes`.

---

## What this corpus is (and why it matters for the paper)

Unlike the IWC corpus (curated, published, fully-qualified ToolShed ids), the
brc-tools workflows are **agent-authored against a single Galaxy instance's tool
panel**. They are dominated by short, unversioned tool ids and by local
user-defined tools that never went to the ToolShed. That makes them an ideal
stress test for the gaps between "validates on a curated corpus" and "validates
the workflows an agent actually emits" — exactly the agent-authoring consumer
class the Discussion flags as most speculative.

11 workflows discovered (10 format2 `.gxwf.yml` + 1 native `.ga`). Tool ids
referenced fall in three buckets:

1. **Fully-qualified ToolShed** (e.g. `toolshed.../iuc/hyphy_busted/.../2.5.96+galaxy0`) — resolve + validate cleanly.
2. **Short, unversioned would-be-ToolShed** (`bedtools_sortbed`, `samtools_faidx`, `cat1`, `sort1`) — unresolvable as written.
3. **Local user-defined** (`gene_bed`, `longdust`, `sdust`, `phase_e_*`, …) — not on ToolShed at all; XML lives in `brc-tools/tools/`.
4. **Galaxy built-in collection ops** (`__CROSS_PRODUCT_FLAT__`, `__FILTER_FROM_FILE__`, `__RELABEL_FROM_FILE__`).

Net effect with a default cache: the ToolShed-tool workflows (`selection`,
`vcf_projection`) validate cleanly with state **and** connections; everything
else SKIPs almost every step because the tool ids can't be resolved.

---

## Bug catalog

### Tooling bugs (galaxy-tool-util / gxwf)

| # | Sev | Status | Issue |
|---|-----|--------|-------|
| **A** | High | **FIXED** | `validate-tree` / `lint-tree` silently dropped workflows that fail to parse. The malformed `consensus.gxwf.yml` vanished from the report and was *not* counted (`Summary: 10 workflows … 0 FAIL`), so a `--strict` CI gate stays green on a broken workflow — directly undermining the paper's CI claim. Root cause: parse failures were filtered out during *discovery* (`tree.ts`) before they could become outcomes. Fix: files with an unambiguous workflow extension (`.ga`, `.gxwf.yml/.yaml`) that fail to parse are now reported as load errors with a non-zero exit code; ambiguous `.yml/.json` stay silently skipped. |
| **B** | Low | **FIXED** | `validate-tree --no-tool-state` printed `0 steps (0 OK, 0 SKIP)` for every file because step counts were derived only from state-validation results. Now enumerates tool steps as skipped (new `skip_no_tool_state` status) so the count is real. |
| **E** | High | root-caused | `galaxy-tool-cache populate-workflow` crashes with an uncaught exception on the **first** unresolvable tool (`tool-info.ts` throws `No version available`), caching nothing. Unusable on 8/11 of these workflows. Should skip + report per tool. |
| **C** | Med | root-caused | Galaxy built-in collection-op tools (`__CROSS_PRODUCT_FLAT__`, `__FILTER_FROM_FILE__`, `__RELABEL_FROM_FILE__`, …) are reported "no version" and skipped. No allowlist/schema for `__*__` internal tools (`tool-cache.ts` `resolveToolCoordinates`). |
| **D** | Gap | scoped | No path to validate **local user-defined tool XML**, and short/unversioned ids don't resolve. See "The user-defined-tool gap" below. |

A and B shipped with tests (`packages/cli/test/tree.test.ts`,
`validate-tree.test.ts`) and a changeset. `make check` + full cli/schema
suites green.

### Workflow bug (brc-tools) — *left as found, per owner's call*

- `consensus.gxwf.yml`: every step carries a **duplicate `doc:` key** (18 total).
  Invalid YAML — gxwf rejects it ("Map keys must be unique at line 84"). Galaxy's
  YAML loader accepts duplicate keys (last-wins), so the runtime would silently
  keep the second `doc` and the bug would never surface there. **gxwf caught a
  latent defect the runtime hides** — a clean paper anecdote.

---

## The user-defined-tool gap (D), concretely

Two compounding reasons gxwf can't reach its depth claim on these workflows:

1. **Short / unversioned tool ids don't resolve.** A step written `tool_id: longdust`
   (or even `tool_id: bedtools_sortbed`, no version) resolves to "no version for
   longdust" and is skipped. The cache key is `toolshedUrl/trsToolId/version`;
   with no version and no `/repos/` path there is nothing to fetch.
2. **Local tools aren't on the ToolShed.** `gene_bed` et al. exist only as XML in
   `brc-tools/tools/`. The ParsedTool schema gxwf validates against is large and
   strict; the realistic way to obtain one is Galaxy's `/api/tools/{id}/parsed`
   endpoint, not hand-authoring.

**Chosen path (reuse, no new parser):** the mechanism already exists —
`galaxy-tool-cache add <id> --galaxy-url <running-galaxy>` fetches
`/api/tools/{id}/parsed` (a ParsedTool) and caches it; gxwf then validates the
step. Prerequisites to make this work on these workflows:

- the local tools must be **loaded into a Galaxy instance** (brc-tools already
  runs them — see `execution/`), and
- the workflow steps must **pin a `tool_version`** for the local/short ids so the
  cache can key them.

Procedure to validate a user-defined-tool workflow with gxwf:
1. `galaxy-tool-cache add gene_bed --galaxy-url http://localhost:8080 --tool-version 1.0.0+galaxy0` (repeat per local tool, or extend `populate-workflow` once E is fixed).
2. Fully-qualify + version the short ToolShed ids (`bedtools_sortbed` → `toolshed.../iuc/bedtools/bedtools_sortbed/...`).
3. `gxwf validate <wf>.gxwf.yml --connections` — local steps now validate state + map-over.

**Manuscript wording fix:** §Schema-Aware Validation says metadata can come from
"a directory of tool XML files." That is **not** implemented (only ToolShed/TRS
fetch and pre-exported per-tool JSON Schema via `--tool-schema-dir`). Either
implement an XML→ParsedTool loader (large) or soften to: metadata comes from a
Galaxy server, the ToolShed/TRS, or a local cache of ParsedTool/JSON-Schema
exports — with raw-XML ingestion noted as future work.

---

## Paper integration hooks

### Axis 1 (worked example) — a second, agent-flavored listing
The IWC RNA-seq example in `tasks.md` shows depth on *published* workflows. This
corpus adds the **agent-authoring** counterpart: a workflow an agent emitted
that looks plausible but (a) is malformed YAML the runtime would silently
mis-load (consensus duplicate `doc`), and (b) references tools by short
unversioned ids gxwf flags as unresolvable. Strong "second loop" evidence for
the agent consumer class (Discussion): the agent gets a structured per-step
diagnostic locally instead of a late runtime failure.

### Axis 4 (a finding, not counts)
Concrete categorical finding to cite: across 11 agent-authored workflows, gxwf
surfaced (1) a malformed-YAML workflow the Galaxy loader accepts silently, and
(2) a systematic class of unresolvable tool references (short/unversioned ids,
local tools) — i.e. the validator distinguishes "authored against one instance"
from "portable + checkable." That's the Methods→Resource upgrade for the
agent angle.

### CI claim hardening
Bug A is the kind of defect that makes the CI claim *false* if unfixed: a tree
validator that hides unparseable files reports success on a broken corpus. Worth
a sentence in §Continuous-Integration Surface that tree validation now fails
closed on parse errors (fail-closed, not fail-silent).

### Honest-limits paragraph
The user-defined-tool gap belongs in §Limits and Honest Risks: depth validation
requires resolvable, versioned tool ids and ToolShed-or-Galaxy-served schemas;
workflows authored against a single instance's short tool-panel ids fall back to
structural checks until ids are qualified and schemas are cached.

---

## Open questions
- Implement C (built-in collection-op allowlist/schemas) and E (populate-workflow resilience) in this same branch?
- D: implement an XML→ParsedTool loader, or commit to the Galaxy-export reuse path + manuscript softening only?
- Do we want a real end-to-end vignette (stand up the brc-tools Galaxy, export local-tool schemas, validate one full workflow) as the Axis-1 listing? That needs a running Galaxy.
