---
type: research
subtype: design-spec
tags:
  - research/design-spec
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/tools/runtime
  - galaxy/tools/testing
  - galaxy/api
  - galaxy/security
component: User-Defined Tools
status: draft
created: 2026-05-07
revised: 2026-05-22
revision: 3
ai_generated: true
sources:
  - https://github.com/galaxyproject/galaxy/pull/19434
  - https://github.com/galaxyproject/galaxy/pull/21828
  - https://github.com/galaxyproject/galaxy/pull/22507
  - https://github.com/galaxyproject/galaxy/pull/22625
summary: "Synthesis of the User-Defined Tools initiative — YAML tool format, sandboxed expressions, typed tool state, schema hardening, post-hoc divergence."
related_prs:
  - 19434
  - 20761
  - 20860
  - 20932
  - 20987
  - 21161
  - 21828
  - 21991
  - 22116
  - 22280
  - 22362
  - 22507
  - 22566
  - 22625
  - 22628
  - 22615
related_notes:
  - "[[Component - User-Defined Tool Source Validation]]"
  - "[[PR 19434 - User Defined Tools]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
  - "[[PR 18758 - Tool Execution Typing and Decomposition]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - Tool State Specification]]"
  - "[[Component - Tool State Dynamic Models]]"
  - "[[Problem - YAML Tool Post-Hoc State Divergence]]"
  - "[[Problem - basic.py Parameter Hierarchy]]"
  - "[[PR 22615 - UserToolSource Pydantic Semantic Validation]]"
---

# User-Defined Tools in Galaxy

> Synthesis of the User-Defined Tools (UDT) initiative across PRs #19434 →
> #22625, with linkage to the structured tool-state work. Open questions
> at end.

## 1. Motivation

Galaxy's tool ecosystem has, since inception, assumed a privileged author:
admins install XML tool definitions via the Tool Shed or filesystem, those
tools are loaded into a global toolbox, and Cheetah templating gives them
unrestricted access to Galaxy internals. That model serves the published-tool
catalog well but blocks several increasingly important use cases:

1. **Casual/user authorship** — researchers who want to wrap a custom shell
   pipeline for a single analysis without negotiating a Tool Shed PR or
   admin install.
2. **Agent-authored tools** — LLM agents (cf. Galaxy's MCP / agent-operations
   layer, #22625) generating tools on the fly during a session.
3. **Workflow-embedded scripts** — workflows that bundle a small custom step
   without pretending it is a published tool.
4. **Portability / reproducibility** — shipping the tool definition *with* the
   workflow rather than depending on a remote Tool Shed installation matching
   in name and version.

The User-Defined Tools (UDT) initiative, opened by PR
[#19434](https://github.com/galaxyproject/galaxy/pull/19434) (Marius van den
Beek, target Galaxy 25.0), introduces a YAML tool format and a privilege model
that lets non-admin users author and run tools inside Galaxy — at the cost of
walking away from the unconstrained Cheetah templating that XML tools enjoy.

This paper synthesizes the architectural, security, and validation work that
turns UDTs from a beta toy into a defensible foundation, and surfaces the
post-merge gaps that remain.

## 2. Two tool formats, one toolbox

UDTs do not replace XML tools. They sit alongside them as a second tool source
class with intentionally different trust assumptions:

| Aspect | Standard XML Tools | User-Defined YAML Tools |
| --- | --- | --- |
| Author | Admin / Tool Shed | Any user with the `Custom Tool Execution` role |
| Format | XML | YAML |
| Templating | Cheetah (full Python access) | Sandboxed JavaScript `$()` expressions |
| DB / FS access at templating | Full | None |
| Container | Optional | **Required** (#21161 hardens this for 25.1) |
| Storage | Filesystem | Database (`dynamic_tool` + `user_dynamic_tool_association`) |
| Discovery | Global toolbox | UUID lookup, per-user panel |
| Workflow embedding | By tool id | Tool definition copied into workflow |

The two flavors share the same tool-source machinery via parallel Pydantic
models, **`UserToolSource`** (`class: GalaxyUserTool`) and **`AdminToolSource`**
(`class: GalaxyTool`), in `lib/galaxy/tool_util/models.py`. The strict
`UserToolSource` is what a user can POST; the looser `AdminToolSource` is
reserved for admin-authored dynamic tools.

### Example: a user-written `cat`

```yaml
class: GalaxyUserTool
id: cat_user_defined
version: "0.1"
name: Concatenate Files
container: busybox
shell_command: |
  cat $(inputs.datasets.map((i) => i.path).join(' ')) > output.txt
inputs:
  - name: datasets
    multiple: true
    type: data
outputs:
  - name: output1
    type: data
    format_source: datasets
    from_work_dir: output.txt
```

The `$(...)` block is a JavaScript expression evaluated at job-creation time
against a runtime model derived from the inputs — explicitly *not* a Cheetah
template, *not* Python, and *not* able to import `pathlib` and write to
`$HOME`.

## 3. The security model

UDTs solve a fundamentally different security problem than XML tools.
XML-tool security is mostly "the admin vetted the tool"; UDT security has to
hold up against the *tool author themselves* potentially being adversarial.

### Three-layer defense

1. **Sandboxed expression language.** `$()` blocks run in a JavaScript
   evaluator pinned to ES2017 with no host-object exposure. There is no
   `app`, no `model`, no `os`, no filesystem. The runtime model only carries
   what the tool itself declared as inputs (paths, formats, element
   identifiers, etc.).
2. **Mandatory containerization.** A UDT without a `container:` field is
   rejected. PR [#21161](https://github.com/galaxyproject/galaxy/pull/21161)
   (still draft, slated for 25.1) makes this requirement uniform with
   interactive tools, ensuring even admin-supplied dynamic tools cannot escape
   the container envelope when run in user-author mode.
3. **Per-user authorization.** Authoring requires the
   `Custom Tool Execution` role; running someone else's UDT requires explicit
   sharing or workflow embedding (which copies the tool into the recipient's
   private namespace).

### Boundaries that matter

- **Filesystem outside the container.** UDTs cannot read `extra_files`,
  metadata indices (e.g. BAM `.bai` files), or reference data — features
  XML tools take for granted. Some of these are intentional (reference data
  is a side-channel for authority); others are #19434 limitations not yet
  resolved (configfiles partially landed in #20761).
- **Job placement.** UDTs need to be addressable by job_conf.yml so admins
  can route them to a sandboxed destination. PR
  [#20932](https://github.com/galaxyproject/galaxy/pull/20932) added a
  `tool_type` for this.
- **Network and credentials.** UDTs accept credentials parameters (a
  separate feature line) but the YAML schema has been narrowed (#22507) to
  prevent declaring properties the runtime ignores — closing a class of
  "looks valid, isn't honored" footguns.

## 4. From request to runtime: the structured tool state pipeline

The hardest part of UDTs is not authoring — it is making sure the same tool
definition runs the same way every time, that the form re-prefills correctly,
and that workflow extraction reconstructs the exact job that ran. XML tools
get away with `JobParameter` rows and pipe-delimited string state because
`basic.py` *is* the source of truth. YAML tools have a richer, typed shape
that does not fit cleanly into that legacy encoding, so the structured tool
state work was a precondition for taking UDTs seriously.

### State representations

[[Component - Tool State Specification]] catalogs roughly twelve state
representations. The ones that matter for UDTs:

| State | When | Validated by |
| --- | --- | --- |
| `request` | Inbound API payload | `RequestToolState` Pydantic |
| `request_internal` | After id resolution | `RequestInternalToolState` |
| `request_internal_dereferenced` | After URI/HDA dereferencing | same, dereferenced |
| `job_internal` | Persisted on the Job | `JobInternalToolState` → `Job.tool_state` column |
| `job_runtime` | At evaluation, with paths | dynamic discriminated unions |
| `test_case_json` | YAML test definitions | full parameter validation |

PR [#21828](https://github.com/galaxyproject/galaxy/pull/21828) added the
`Job.tool_state` JSONB column and the `runtimeify` path that converts the
persisted internal state into the runtime CWL-style inputs the YAML tool
evaluator consumes. PR
[#20935](https://github.com/galaxyproject/galaxy/pull/20935) introduced the
typed request side; #21828 closed the loop on the runtime side.

### Discriminated collection runtime models

Collections are where the typing pays for itself. #21828 and follow-ups
([#21991](https://github.com/galaxyproject/galaxy/pull/21991) for
subcollection mapping / DCE,
[#22116](https://github.com/galaxyproject/galaxy/pull/22116) for hidden_data
parameters,
[#22362](https://github.com/galaxyproject/galaxy/pull/22362) for JSON-Schema
generation) build a recursive Pydantic discriminated-union family covering:

- Leaf collections: `paired`, `list`, `record`, `sample_sheet`,
  `paired_or_unpaired`.
- Nested types: `list:paired`, `list:list:paired`, `record:paired`, … —
  generated lazily by `build_collection_model_for_type()` with LRU caching
  in `lib/galaxy/tool_util_models/parameters.py`.
- Subset unions: `list:paired,list:list` for tools that accept several
  shapes.
- DCE references for subcollection mapping (`{src: "dce", id: …}`).

The factory returns a `create_model()` Pydantic class with a
`Literal[collection_type]` discriminator — the same dynamic-model pattern
captured in [[Component - Tool State Dynamic Models]]. Unknown leaf or
nested segments yield `None` and a controlled fallback, rather than a silent
type widening.

This is the foundation that makes "user wrote a YAML tool with a
`list:paired` input" into a job whose state Galaxy can validate, persist,
and reconstruct.

## 5. Schema hardening — closing the slop surface

Once a tool format is database-stored and authored by users, every
permissive corner of the schema becomes an attack surface and a support
burden. The schema-hardening campaign:

| PR | Effect |
| --- | --- |
| [#22280](https://github.com/galaxyproject/galaxy/pull/22280) | Fix validation of optional text validators — closing a 26.0-era regression where some text validator combos let invalid tool defs load |
| [#22362](https://github.com/galaxyproject/galaxy/pull/22362) | Generate complete, tested JSON-Schema from the Pydantic tool state models; allow validating workflows via either Pydantic *or* JSON-Schema |
| [#22507](https://github.com/galaxyproject/galaxy/pull/22507) | Narrow the YAML tool schema — reject `truevalue`/`falsevalue` on boolean params and other input properties the runtime ignores. This is the branch this paper is being written from |
| [#22566](https://github.com/galaxyproject/galaxy/pull/22566) | Tighten the workflow test schema, unifying the Planemo and in-tree framework test formats |
| [#21828 follow-ups](https://github.com/galaxyproject/galaxy/pull/21828) | Credential test definitions; JSON Schema keywords (`color`, `length`, `in_range`, `regex`); recursive-union warning silencing; `format` alias |

The narrowing matters for two distinct audiences: *human authors* get told
their tool is malformed at create time instead of at job time, and *agents
generating tools* get a tighter schema to validate against, which materially
reduces invalid-but-syntactically-plausible output. The latter is the same
motivation behind exposing tool state JSON-Schema externally — agents need
schemas, not Pydantic.

There is a trade-off: the client-side `ToolSourceSchema.json` ballooned in
size after #22507, which the author flagged. Worth tracking, not yet a
problem.

## 6. The post-hoc divergence problem

[[Problem - YAML Tool Post-Hoc State Divergence]] is the open architectural
issue and the most important honest qualifier to put on the UDT story.

Today, even though `Job.tool_state` is a validated structured column, the
post-hoc consumers of "what was run" still read the legacy `JobParameter`
rows via `params_from_strings`:

| Consumer | Path | Source |
| --- | --- | --- |
| Job display UI | `summarize_job_parameters` | `JobParameter` rows |
| Tool form rerun | `Tool.to_json(job=…)` | `JobParameter` rows |
| Workflow extraction | `workflow/extract.py:step_inputs` | `JobParameter` rows |
| History export | dual: emits both `tool_state` and `params`; reads `params` on import | both written, only legacy read |

For XML tools this is fine because `basic.py` is the source of truth. For
YAML tools it is structurally risky: collection runtime metadata
(`column_definitions`, `fields`, `has_single_item`, `columns`),
comma-separated collection types, and DCE-source elements for subcollection
mapping all live cleanly on the `Job.tool_state` side and have no proven
round-trip through the flat `JobParameter` encoding.

There are no end-to-end tests today proving:

- Run YAML tool → rerun from history → second job's `Job.tool_state` equals
  the first.
- Run YAML tool → extract workflow → run extracted workflow → `tool_state`
  matches.
- Run YAML tool → export → import → rerun.

These are the missing invariants. Closing them either requires adding the
tests against the current dual representation (and accepting some lossiness),
or making `Job.tool_state` the source of truth for post-hoc consumers when
present (a `from_runtime_state(job)` symmetric to `runtimeify`). The right
answer is probably both: tests first, then a controlled switchover.

## 7. Authoring surface

UDTs are not just a backend feature; the authoring UX is a substantial part
of the value.

- **Monaco editor** with full YAML schema validation, JS intellisense for
  embedded `$()` blocks, and mixed YAML/JS syntax highlighting
  (`yaml-with-js.ts`). The narrowed schema (#22507) is what makes the
  red-squiggle experience trustworthy.
- **User Tool Panel** in the sidebar listing the user's private tools.
- **Build / runtime model preview** — `/api/unprivileged_tools/build` and
  `/runtime_model` let the editor preview the form and the JS runtime
  without committing to a job.
- **Workflow embedding** — embedding a UDT in a workflow copies the tool
  definition; importing the workflow copies it into the new owner's
  namespace. No global registry pollution.
- **Upload from URL** ([#20860](https://github.com/galaxyproject/galaxy/pull/20860))
  for sharing tools out-of-band.

## 8. Agent-native authoring

PR [#22625](https://github.com/galaxyproject/galaxy/pull/22625) lifts UDT
operations into the `agent-operations` layer with MCP wrappers — `create_user_tool`,
`delete_user_tool`, `run_user_tool`. PR
[#22628](https://github.com/galaxyproject/galaxy/pull/22628) excludes UDTs
from requiring a Galaxy-env destination, which matters because agents
generating tools on the fly cannot assume a particular cluster/Conda
environment exists.

This is the inflection point that justifies the schema-hardening work. An
agent that hallucinates `truevalue` on a boolean param under #22507 gets a
clean validation error; pre-#22507 the tool would load and silently ignore
the field. The same logic applies to JSON-Schema externalization in #22362
— agents need a schema they can target, and the schema must reflect what
the runtime actually honors.

The `run_user_tool` guards in commits `bec6b06813` / `3c02ff707c` ensure
agents can't run tools that have been deactivated, which closes a real
race window.

## 9. Where this leaves us

UDTs as of mid-2026:

- ✅ A coherent YAML format with a published schema and a sandboxed
  expression language.
- ✅ A typed, persisted, validated tool state column.
- ✅ End-to-end runtime path (`request → internal → job_internal → runtime`)
  with Pydantic validation at each step.
- ✅ Recursive collection-type modeling, including comma-separated unions
  and subcollection mapping.
- ✅ JSON-Schema externalization for cross-platform / agent consumption.
- ✅ Schema narrowing closing several "looks valid, isn't honored" classes.
- ✅ Agent-operations / MCP surface for creation, deletion, and execution.
- ⚠️ Mandatory containerization landing in 25.1 (#21161 still draft).
- ⚠️ Post-hoc consumers (rerun, display, extract, export) still use legacy
      `JobParameter` rows — divergence proven possible, not yet measured.
- ❌ No E2E tests for rerun/extract/export round-trip on YAML tools.
- ❌ Output collections in YAML tools partial — `_parse_test` still
      hard-codes `output_collections = []` per #21828.
- ❌ No `extra_files` / metadata-files / reference-data access paths for
      UDTs.

## 10. Recommended next steps

In rough priority order:

1. **Land #21161** so the container guarantee is uniform across UDTs and
   interactive tools before broader rollout.
2. **Add the missing E2E divergence tests** described in
   [[Problem - YAML Tool Post-Hoc State Divergence]] — rerun, extract,
   export, all asserting `Job.tool_state` equality across the round trip.
   Red-to-green: write the tests first, watch them fail, then drive the
   reconciliation work.
3. **Implement `from_runtime_state(job)`** symmetric to `runtimeify` for
   post-hoc consumers; switch UI form rerun, job display, and workflow
   extraction to prefer it when `Job.tool_state` is present.
4. **Finish output-collection support** in YAML tools (the `_parse_test`
   TODO).
5. **Document the JSON-Schema externalization** so agent authors and other
   Galaxy clients can consume it without reading the Pydantic source.
6. **Consider broader rollout policy**: who gets the
   `Custom Tool Execution` role by default on community Galaxies, and what
   does the operator playbook for UDT abuse look like?

## 11. Unresolved questions

- `to_cwl` deprecation timeline — the legacy fallback in
  `evaluation.py:1116` logs "may work differently in the future" but has no
  removal plan. When does it go?
- 24.2 minimum-profile bump — what happens to UDTs with no `profile` set
  or with an older one? #22507 narrowed the schema; do legacy older-profile
  YAML tools still load?
- Does `params_from_strings` round-trip `data_collection` with
  comma-separated `collection_type` for YAML tools? Likely no test today.
- Does the legacy flat encoding represent `dce`-source elements? Unverified
  for YAML tool jobs.
- For collection runtime metadata (`column_definitions`, `fields`,
  `has_single_item`, `columns`), is there any path back from
  `JobParameter` rows to a structured shape, or is it lost on rerun /
  extract / display?
- Is the dual emission of `tool_state` and `params` on history export
  acceptable, or does it need an export-time consistency check?
- ToolSourceSchema.json size after #22507 — at what size does
  client-bundle cost become a problem?
- Sharing model — only embed-in-workflow today. Is direct user-to-user
  share desired, or does workflow remain the canonical sharing unit?
- Reference data / metadata files in UDTs — is the long-term answer "expose
  via explicit `inputs` of new types" or "never, use a workflow"?

