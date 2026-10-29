Run via Claude Opus 5.5 (claude-opus-5-5) at low effort.

# yaml_tool_model_validation_26.1 — scope evaluation (second pass)

**Recommendation: expand modestly (Scope 2).** Make YAML tool citations resolve for user-defined tools. Because this is the second evaluation, any change parks the branch as BLOCKED for John's decision.

The re-scope's `bbeabb0cc91` now loads `citations` for `GalaxyUserTool` too. A user tool that declares citations therefore reports `citations: true` in its form model, and `ToolFooter` fetches `api/tools/{formConfig.id}/citations`. `CitationsManager._get_tool` resolves only `toolbox.get_tool(tool_id)`, which never finds user tools. So the footer gets an error entry and renders an empty "References" heading. If the user tool's id matches an admin tool's id, it shows that admin tool's citations instead. Before this branch, YAML citations were always `[]` and the footer never fetched, so the branch itself introduces this.

This was traced through the code (`ToolForm.vue` → `ToolCard.vue` → `ToolFooter.vue` → `services.ts` → `api/tools.py:812` → `managers/citations.py`) but not checked in the UI. The test-challenge pass reached the same conclusion independently.

The general fix resolves tools the way the rest of Galaxy does: by uuid plus user in the tool endpoint, and through `ToolBox.tool_for_job` in history citations. History citations (`services/histories.py`) already return "not found" for every user-tool job.

The fallback contraction (Scope 3) is to stop loading `GalaxyUserTool` citations on this branch. Everything else raised is either a different seam, contradicts John's 2026-10-28 decisions, or is structural.

Possible security issue, details withheld.

Evaluated at `bbeabb0cc91` against merge-base `19281d57645` (`origin/release_26.1`). Issue #23888 has no comments. Prior slice #24365 merged 2026-10-28. The second Codex review didn't run because the model was at capacity, so this pass has no Codex input.

## Possible Decompositions

Size: 1057 changed lines (+660/−397) across 25 files. `client/.../schema.ts` (151) is generated, which leaves about 906 non-generated lines. Fixtures are counted, as in the earlier evaluations. Production under `lib/galaxy` (excluding `galaxy_test`) is +136/−135. The model files are net deletions (scalar outputs, `ContainerRequirement`).

Commits, oldest first:
1. `30f634afe49` Baseline tests (+136, three test areas).
2. `3797304f268` Unify YAML tool test output parsing loop (refactor).
3. `c9f1a8ac86e` `create_tool_from_path_raw` populator helper.
4. `f44815ac98f` Extract `ToolSource._parse_citation_list` from XML (refactor, no behavior change).
5. `7635a96463b` Verify collection outputs in YAML tool tests.
6. `9c69a9f70e7` Read `assert_stdout`/`assert_stderr`.
7. `f73effdec08` Convert in-tree GalaxyTool YAML to the model's form.
8. `14a0bd413eb` `extra="forbid"` on admin dataset outputs.
9. `f816f484267` Drop scalar outputs (includes a `schema.ts` regen).
10. `732d7a153e6` Validate GalaxyTool YAML when loading, with the `create_tool` 400 and the stored-row `ToolMissingException`.
11. `3be27d3b4a1` Drop `ContainerRequirement` (includes a `schema.ts` regen).
12. `bbeabb0cc91` Load YAML citations and honor collection `hidden`.

Ordering constraints (from the history; nothing has been cherry-picked in isolation):
- 10 needs 7, 8 and 9 (valid fixtures, strict outputs), and its API test needs 3.
- 7's converted collection and stdout tests only verify anything after 5 and 6.
- 5 needs 2.
- 12 needs 4.
- 9 and 11 each carry a `schema.ts` regen, so the OpenAPI lint job needs each regen to land with its model change.
- Commit 1 splits by test area.

**Option A: two PRs**
1. YAML tool test-parsing fixes: 2, 5, 6 and their baselines. This standalone bug fix makes YAML tool tests actually verify collections, stdout/stderr, `metadata` and `collection_type`.
2. Semantics lock-down: 3, 4 and 7–12 plus the remaining baselines.

**Option B: three PRs**
1. As A.1.
2. Lock-down: 3 and 7–11. This is the fail-loud change John's stance covers.
3. Model→loader drops: 4 and 12 (citations and collection `hidden`). Under Scope 2 this is also where the citation-lookup fix lands, so the user-visible citation change is reviewed in one place.

**Option C: one PR.** Every commit is a red→green step or a no-behavior refactor, so reviewers can go commit by commit.

## Scope 1 — As implemented

`class: GalaxyTool` YAML validates against its authoring model on every load path (disk, raw-source factory, stored rows, admin `from_path`/representation). The legacy dialect is rejected. Admin dataset outputs are strict. Scalar outputs and `ContainerRequirement` leave the model. YAML tool tests verify collections and stdout/stderr. YAML citations load for both classes, and explicit collection outputs honor `hidden`. Class-less YAML is untouched, and invalid stored `GalaxyTool` rows raise `ToolMissingException`.

| Pros | Cons |
|---|---|
| - Matches John's 2026-10-28 scope plus the re-scope he accepted<br>- After the re-scope, every `GalaxyTool` root and output field the model accepts is read by the loader<br>- One validation seam (`YamlToolSource.__init__`), and callers only translate the error<br>- Production change is net zero lines. Reviews found no other open defects | - **User-tool citations reach the tool form but not the footer.** The result is an empty "References" heading, or another tool's citations on an id clash (Scope 2). Introduced by `bbeabb0cc91`<br>- The PR body's "user-tool citations now render" claim is wrong as written<br>- Drops a public `ContainerRequirement` import from a package that already shipped in 25.1/26.0 (Scope 4)<br>- Conda `package` requirements and tool-level `credentials` go away for GalaxyTool YAML. This needs a PR-body line |

## Scope 2 — Modest expansion: resolve citations for user-defined tools (recommended)

Make the citation endpoints find user tools:
- `GET /api/tools/{id}/citations` accepts the tool's uuid (for example a `tool_uuid` query parameter) and resolves it with `toolbox.get_tool(tool_uuid=…, user=trans.user)`, which is the existing unprivileged lookup.
- `ToolFooter` gets `toolUuid` from `ToolCard` and passes it on.
- History citations collect tools through `ToolBox.tool_for_job(job, user=trans.user)` rather than bare `job.tool_id`.
- An API test for each: user-tool citations in the footer endpoint and in the history endpoint.

| Pros | Cons |
|---|---|
| - Fixes a visible regression this branch introduces, in a feature the re-scope added<br>- Reuses existing abstractions (`get_tool(tool_uuid, user)`, `tool_for_job`). No new lookup code<br>- Also fixes the pre-existing "Tool not found" error that history citations return for every user-tool job<br>- Makes "the model accepted `citations`" true end to end for UDTs, which is #23888's thesis<br>- Rough size: about 15 server lines, 5 client lines, and two API tests | - Parks the branch for John's decision (second scope change)<br>- Crosses into new seams (the citations manager, the history service and the client), so it is no longer YAML-parser-only<br>- Possible security issue, details withheld<br>- On shared or published histories, `tool_for_job(check_access=True)` raises `ItemAccessibilityException` for viewers who don't own the user tool. The history path has to catch that and keep the error entry<br>- `tools/{id}/citations` is `expose_api_anonymous_and_sessionless`. Logged-in requests still carry `trans.user`, but anonymous viewers can't resolve user tools. That's acceptable, but it needs a test |

<details>
<summary>Details</summary>

- `ToolCard`'s `footer` slot renders `ToolFooter` unconditionally, so user-tool forms reach it.
- `ToolForm.vue` passes `:id="formConfig.id"` and `:tool-uuid="uuid"` to `ToolCard`. `formConfig.id` comes from `Tool.to_json`'s `"id": self.id`, the representation's id. `ToolCard` hands only `props.id` to `ToolFooter`, and `ToolFooter.loadCitations` calls `getCitations("tools", this.id)`.
- `CitationsManager.citations_for_tool_ids` → `_get_tool` → `app.toolbox.get_tool(tool_id)`. With no uuid and no user, that looks only in `_tools_by_id`. User tools are never registered there; they're built per request by `get_unprivileged_tool` → `dynamic_tool_to_tool`. Admin `GalaxyTool` dynamic tools are registered there, which is why `test_dynamic_tool_citations` passes.
- `getCitations` turns `format: "error"` entries into `warnings`, and `ToolFooter` ignores those. `hasCitations` stays true, so the heading renders with no entries.
- `services/histories.py::citations` takes `job.tool_id` for every dataset's creating job. `tool_for_job` already handles `job.dynamic_tool` with an access check, so routing through it is the general fix.
- An alternative that avoids the endpoint: inline the citations into the tool-form model instead of `bool(self.citations)`. That changes the tool-form response shape and still leaves history citations broken, so it isn't preferred.

</details>

## Scope 3 — Contraction: don't load `GalaxyUserTool` citations on this branch

Have `YamlToolSource.parse_citations` return citations only for `GalaxyTool` (and class-less YAML), and leave user-tool citations to a follow-up that does Scope 2.

| Pros | Cons |
|---|---|
| - Removes the regression with about 2 lines, and keeps the branch YAML-parser-only<br>- Avoids the withheld security question on a release branch | - Leaves a model→loader drop for UDTs, the exact class of bug the re-scope set out to close<br>- Special-cases a field by class with no trust reason. UDT citations are just metadata<br>- Still a scope change, so it also parks the branch |

## Scope 4 — Small: keep `ContainerRequirement` importable

Keep the `ContainerRequirement` class exported from `galaxy.tool_util_models` (deprecated, unused) and only remove it from the `requirements` union.

| Pros | Cons |
|---|---|
| - Avoids a public-import break in a `galaxy-tool-util-models` release-branch package<br>- About 10 lines | - No known consumers (normal review 2 checked Galaxy, planemo and galaxy-tool-util-ts)<br>- Keeps dead model code around, against the "stop advertising what can't load" precedent<br>- A changelog line covers it |

## Scope 5 — Small: honor `hidden` on mapped-over (implicit) collections

`ExecutionTracker.precreate_output_collections` (`tools/execute.py`) creates implicit HDCAs and never reads `output.hidden`, so a mapped-over hidden collection output is still visible.

| Pros | Cons |
|---|---|
| - Completes the `hidden` behavior the re-scope added for explicit collections | - The same path ignores `hidden` on **dataset** outputs for XML and YAML tools alike, so a fix there changes long-standing XML behavior for every mapped-over hidden output<br>- A different seam with its own semantics question: should a hidden per-element output hide the implicit collection?<br>- Better as its own issue |

## Scope 6 — Larger: retire class-less YAML tools

Reject disk YAML without `class:` (or treat it as `GalaxyTool`), and delete the parser's legacy branches: Cheetah `command`, `interpreter`, `checked`, `blocks`, `when`, `display`, untyped outputs, static `elements`, `stdout:` test spelling and similar.

| Pros | Cons |
|---|---|
| - The direct reading of "abandon legacy YAML behaviors, UDTs won". The disk loader already logs that YAML is "experimental… will not function in future"<br>- No in-tree consumers: every YAML tool under `test/functional/tools/` declares `class:` (31 files). The admin API can't create class-less YAML (`create_tool` raises "Unknown tool format")<br>- Large net deletion in `yaml.py` | - John's 2026-10-28 note says "class-less YAML untouched", and #24365 also kept the class-less dialect<br>- It removes a disk format on a release branch. Unknown third-party disk YAML would stop loading<br>- `YamlInputSource` legacy reading is still needed for workflow module input dicts (`workflow/modules.py:1817`), so only part of the parser can go<br>- Much bigger than "a smaller chunk". A good next #23888 slice on `dev` |

## Scope 7 — Carried forward from the first evaluation (not recommended)

| Scope | Why not now |
|---|---|
| Normalize on load and slice 6 parity/docs (the rest of #23888) | Brings back #24365's dump-policy concerns. Slice 6 and #23877 are `dev`-targeted docs/test seams |
| `_encode_tool_request` catches `ValidationError` for historical legacy-dialect GalaxyTool snapshots | No production non-UDT YAML tools exist (John). Fail-loud is his choice. Covered by a PR-risk line |
| Typed `tool_util` parser error instead of pydantic `ValidationError` | Structural, not scope. Declined twice by the thermo-nuclear review: only two catch sites, plus churn in about 30 assertions |
| Lift stored legacy GalaxyTool rows | John chose fail-loud with no lift |
| Validate `GalaxyUserTool` at parser construction | Tried; it breaks historical user-tool raw-source snapshots. Creation-time validation plus `lift_user_tool_source` already cover it |
| Drop the dead test-level `credentials` field; parse YAML element `expected_sort_order`; make `CanonicalYamlInputSource` read only `whens` | Cosmetic or test-parsing niceties. Each could ride with Option A.1, but none is a user-facing gap |

## Review notes on scope

- **Re-scope debrief, PR-body items.** The `ContainerRequirement` import break → Scope 4. The user-tool citations caveat → Scope 2/3. Mapped-over `hidden` → Scope 5.
- **Normal review 2.** It preferred removing collection `hidden` over honoring it. The coordinator honored it, with an API test, and that decision stands.
- **Test challenges (second pass).** It flagged that the footer can't reach user tools by id. That is the basis for the recommendation, re-traced here.
- **Thermo-nuclear (second pass).** The typed error → Scope 7. Its other notes are structural.
- **Baseline refactor (second pass).** It split out commit 4, which gives Option B.3 a clean base.
- **First scope evaluation.** Its Scopes 3–8 were re-checked. None changed except that the stored-row `ToolMissingException` and the representation-path validation are now in.
