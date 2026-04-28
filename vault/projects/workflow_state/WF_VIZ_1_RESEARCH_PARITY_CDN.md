# WF_VIZ_1 — Parity + CDN Research

## Question 1: Python parity for map_depth / reduction

### Findings

**Reduction detection (Python)** lives in Galaxy at `lib/galaxy/tool_util/workflow_state/connection_validation.py:266-276`. The branch is structurally identical to the TS one: when `target_resolved_input.multiple and target_resolved_input.type == "data"` and the source is list-like, return `_ok(mapping=remaining)` (deeper-than-list reduces over the inner list and maps the outer levels) or `_ok()` (full reduction, no map-over). Critically, the reduction signal is **not** distinguished in the result — `_ok(mapping=remaining)` looks identical to a plain map-over result. Whether a connection reduced is recoverable only by re-deriving it from `target_resolved_input.multiple` + source/target collection types after the fact.

**Map-over depth (Python)** isn't materialized as a number anywhere. `ConnectionValidationResult.mapping` (`connection_validation.py:61`) is the textual collection type (`"list"`, `"list:paired"`); depth = colon count + 1 when set, 0 otherwise — same derivation the TS plan proposes. `StepConnectionResult.map_over` (`:72`) carries the resolved per-step type as another string. No numeric depth field, no per-connection reduction flag.

**Report-model surface.** `_report_models.py:129-143` — `ConnectionResult` is the natural Pydantic mirror of `ConnectionValidationResult`. It already carries `source_step`, `source_output`, `target_step`, `target_input`, `status`, `mapping`. Adding `map_depth: int = 0` and `reduction: bool = False` is a two-line edit, and the conversion at `connection_validation.py:485-496` (`to_connection_validation_report`) needs the same two fields populated.

**To populate them**, the dataclass `ConnectionValidationResult` (`connection_validation.py:52-62`) needs the same two fields, and `_validateConnection`'s `_ok` helper (`:236-244`) needs to take `reduction: bool = False` and compute `map_depth` from `mapping`. The reduction branch (`:266-276`) is the only caller that flips `reduction=True`. Total surface: ~15 lines across `connection_validation.py` + 2 fields in `_report_models.py`.

**gxformat2 cytoscape builder** (`gxformat2/cytoscape/_builder.py:119-142`) is purely structural — it reads NF2 (`step.in_`, `source`, `nf2.resolve_source`) and emits `CytoscapeEdgeData(id, source, target, input, output)`. There is no validator hook and no way to thread per-edge metadata through it today. Models live in `gxformat2/cytoscape/models.py` (CytoscapeEdgeData). The builder is deliberately decoupled from validation, but extending it to accept an optional `connection_report: ConnectionValidationReport | None` parameter and look up `(source_step, source_output, target_step, target_input)` to enrich `CytoscapeEdgeData` with `map_depth`/`reduction` would be a small additive change (~30 lines).

**Cross-repo split** is confirmed: reduction detection sits in galaxy `tool_util/workflow_state/`, the cytoscape emitter in gxformat2. A parity PR touches both: (1) galaxy adds the two fields to dataclass + report model + populates them in the validator (~20 lines, one PR); (2) gxformat2 optionally consumes the report in `_builder.py` (~30 lines + tests, separate PR after #1 releases). The seam is the `ConnectionValidationReport` Pydantic model, which gxformat2 doesn't currently import — adding that dep crosses a layer that's been deliberately thin.

**Cheap defaults.** Python emitting `map_depth: 0, reduction: False` for unannotated connections (i.e., when no validator has been run) is trivially viable: defaults on the Pydantic field do exactly that. The `ConnectionResult` model is only constructed inside `to_connection_validation_report`, so unannotated workflows simply won't have a `ConnectionValidationReport` at all — the cytoscape builder would emit edges *without* `map_depth`/`reduction`, matching what the TS plan does today (the fields are `?:` optional). No problem with the cheap-defaults approach.

### Recommendation

(a) **Where**: add `map_depth: int = 0` and `reduction: bool = False` to both `ConnectionValidationResult` (dataclass at `connection_validation.py:52`) and `ConnectionResult` (Pydantic at `_report_models.py:129`). Populate at the `_ok` helper.

(b) **Size**: ~25 LOC galaxy PR + tests; ~40 LOC gxformat2 follow-up if/when the cytoscape builder consumes the report. Galaxy PR is mechanical and worth doing; gxformat2 follow-up is genuine new feature work and should wait until the TS encoding has shaken out.

(c) **File now**: file the parity issue against galaxy now while context is fresh, but mark it as low-priority — TS-only is fine for the next release cycle. Don't block Phase B0 on it.

(d) **Cheap defaults are fine**: optional fields with sensible defaults match the existing pattern (`mapping: Optional[str] = None`).

## Question 2: CDN bumps for cytoscape.html

### Findings

Current upstream (verified via `npm view`, 2026-04-27):
- cytoscape: **3.33.2** (pinned: 3.9.4 — same major, ~7 years of patches)
- tippy.js: **6.3.7** (pinned: 4.0.1 — two major bumps)
- popper: **@popperjs/core 2.11.8** (pinned: popper.js 1.14.7 — full rebrand + rewrite at v2)
- cytoscape-popper: **4.0.1** (pinned: 1.0.4); v2.x couples to `@popperjs/core ^2.0.0`; v4 has no popper dep at all (BYO popper factory)

**API surfaces the template uses** (`cytoscape.html`):
1. `cytoscape({container, elements, layout: {name: 'preset'}, style: [...]})` — fully stable across cytoscape 3.x. No break.
2. Style selectors: `'node'`, `'edge'`, `.input`, `.runnable` with `label`, `curve-style`, `target-arrow-shape: 'vee'`, `arrow-scale`, `shape`, `background-color` — all stable.
3. `ele.popperRef()` — the cytoscape-popper hook. v1.0.4 returns a popper.js v1 reference; v2 returns a `@popperjs/core` v2 reference; v4 requires you to pass a popper factory explicitly (`popper({popper: createPopper})`). **Breaking** at every major.
4. `new tippy(ref, {content, delay, interactive, placement, trigger: 'manual'})` — tippy 4 API. Tippy 5 made it a default-export factory function (`tippy(ref, opts)`, no `new`). Tippy 6 changed `content` to accept a function directly (still works), removed `multiple` mode, restructured themes. **Breaking** at 4→5.
5. `ele.tippy.show()` / `.hide()` — instance methods, stable.

So a bump touches the popper-tippy axis. Cytoscape itself is essentially free.

**Risk vs. reward.** No CVEs of note for popper.js v1 / tippy 4 / cytoscape 3.9.x in the workflow-rendering context (these load via CDN in standalone HTML files; no server-side surface). The pinned versions render fine; the `tests/examples/cytoscape/` scratch directory was working as recently as the gxformat2 #196 fixture-cleanup PR. No known rendering bugs. The motivation is purely "modernize" / "the CDN URLs feel stale," and `popper.js@1.14.7` on unpkg is technically EOL but still served.

### Recommendation

(a) **Leave pinned for now.** The TS port should sync the template verbatim per the plan's existing `cytoscape-template` group — don't fork.

(b) **If we bump later** (separate gxformat2 PR), the minimum coordinated set is: cytoscape 3.33.x + cytoscape-popper 2.x + @popperjs/core 2.x + tippy.js 6.x. Going to cytoscape-popper 4.x is a bigger refactor (factory wiring) with no payoff over 2.x for this template.

(c) **Effort estimate** for the 2.x/6.x bump: ~30 minutes — swap four `<script>` URLs, change the popper.js URL to `@popperjs/core`, rewrite the `new tippy(...)` line as `tippy(ref, {...})` (drop `new`), verify rendering against the 13 `cytoscape.yml` cases. Phase B will need to touch this template anyway (added selectors for `mapover_*` / `reduction` classes, tooltip extension); fold the bump into that edit if we decide it's worth it then.

## Suggested next steps

1. **File galaxy issue**: "Add `map_depth` + `reduction` to `ConnectionResult` / `ConnectionValidationResult`". Reference `connection_validation.py:266-276` and `_report_models.py:129`. Mark low-priority, link from `WF_VIZ_1_PLAN.md`. ~25 LOC PR.
2. **Defer gxformat2 builder enrichment.** Don't file an issue yet — wait until TS Phase B encoding stabilizes and we know what shape `EdgeAnnotation` settles on. Capture as a "convergence" note alongside the existing one in A8.
3. **Don't file a CDN-bump issue.** Sync the template verbatim per plan. If/when Phase B's template edits land in gxformat2, package the popper/tippy bump into the same PR; otherwise leave alone.
4. **Plan resolution**: update `WF_VIZ_1_PLAN.md` "Unresolved questions" to point at the galaxy issue URL once filed, and mark CDN as "leave pinned, revisit during B3 template edit."
