# #668 Loop CLI surfaces: errors hidden below empty `*_errors` arrays, in-port wiring unreported, `--connections` unpackaged

[Issue](https://github.com/galaxyproject/foundry/issues/668) — opened by scottcain's AI assistant. No comments, and no PR or branch addresses it (`gh pr list --search 668` only hits #750, whose body happens to contain the number 668).

gxwf issues, filed 2026-11-06: [gxwf#215](https://github.com/jmchilton/galaxy-tool-util-ts/issues/215) in-port and out-port edges ([source](upstream_gxwf_in_port_sources.md)), [gxwf#216](https://github.com/jmchilton/galaxy-tool-util-ts/issues/216) concrete diagnostics ([source](upstream_gxwf_concrete_diagnostics.md)).

## Labels

- `roadmap/substep`: loop CLI and Mold contract gaps, not backbone work.
- Parent: #318 "Revise how skills working on draft coordinate - more direct, more deterministic, more YAML" (`roadmap/main`, `priority/mvp`). It wants the "next piece of work" to be definitive, and these are the reports that say what the next work is. #678 is staged under the same parent.
- `priority/mvp`: whether a step reduces or maps over decides a promoted output's shape, and no step of the loop checks it. The issue rates the wiring gap major rather than blocker because `draft-validate` catches the deletion case later.
- `work/ready-implement`: all three parts reproduce and are scoped. We maintain gxwf, so this isn't `upstream/gxwf` unless the Foundry half ends up waiting on a gxwf merge or release.
- No blocker labels.

## Derived status

`queued` (`queued_implement`), rule 6: `work/ready-implement` is on GitHub.

## Findings

Checked on Foundry `origin/main` (51338d1d) and gxwf `origin/main` (f5470fe5, 1.15.0, the version on npm and Foundry's `^1.15.0` pin), running the local build against small fixtures.

**Part 1, hidden errors: holds.**

- `draft-validate --concrete --strict-state --json` gives `ok: false`, `summary: "1 error"`, and empty `*_errors` arrays. The message appears only at `concrete.tool_state.results[].errors`.
- `content/cli/gxwf/draft-validate.md:27` names the `concrete` buckets but gives no shape or example, and doesn't say failures stay out of the arrays. The Mold's step 6 only says "the JSON diagnostics".
- New, not in the issue: the same step has two numbers. `tool_state` counts format2 steps and `connection_report` counts native steps with inputs first, so the gap equals the input count. Neither maps back to the draft, because both count the extracted subset. `tool_state` has no `label`, so a failure can't be routed by step from the JSON alone. Standalone `gxwf validate --json` has the same mismatch on format2.

**Part 2, wiring: the symptom holds, but the issue's remedy doesn't fit its incident.**

- A wired and an unwired `TODO_*` port print identical text (`draft-checks.ts:930` drops the value), and the survey only counts.
- Correction 2(a)'s drafty-source flag can't fire on a valid acyclic draft. `nextDraftStepIn` offers the first step in topological order that has work, so a consumer isn't offered while its source is still `TODO_*`. By the issue's own account M13 wasn't offered at all; M12 was. Run on `wired.gxwf.yml` and variants.
- The edge is lost on the out side: `TODO[out.TODO_mid]` names workflow outputs but no consuming step. The in-port draft proposes both sides.
- Correction 2(c) is partly already there. `galaxy-workflow-draft-format` line 56 says the connection "is topology and MUST be present", and line 46 says the loop doesn't edit topology. gxwf's own guide agrees ("never the wiring"). What's missing is an explicit sentence that changing a source is a topology act. The issue's "may or may not carry a source" conflicts with the contract, yet `TODO_unwired: {}` validates as `draft valid`.
- The strings are shared with gxformat2: `gxformat2/draft.py` `_step_work_items` emits the same text, and `next_draft_step.yml` is synced from gxformat2 (`scripts/sync-manifest.json`), so a wording change starts there.

**Part 3, `--connections`: the gap holds, but the issue overstates it and its fix isn't the smallest one.**

- "Packaged nowhere" is wrong: `references/cli/validate.json` ships with `validate-galaxy-workflow` and `summarize-galaxy-workflow`, and `content/cli/gxwf/validate.md:39` recommends `--connections` for map-over. It's missing only from the `advance-galaxy-draft-step` bundle, which now has six CLI references (`summarize` was added).
- "It alone answers" is wrong: `draft-validate --concrete --connections --json` emits the same report at `concrete.connection_report`, and that flag is already in the sidecar this bundle ships. Likely smaller fix: use it in the Mold's step 6 and document the shape, with no new sidecar.
- Still true: step 6 doesn't pass `--connections`, nothing documents the report shape, and the text output only gives counts.

**Related.** "Draft N17" is #654 (correction 4 asks for `gxwf draft-show-step` / `draft-diff-steps`). #653 is the `when` false positive the issue cites. #667 and #652 are `--connections` blind spots. #656 and #731 are the output-shape checks closest to part 3's assertion. gxwf#208: `--connections` ignores datatypes.

**Not verified.**

- The run's draft and brief: only the issue's account of them.
- A real reduction or map-over report: my fixture only produced `map_depth: 0`, `reduction: false`, so the `reduction: true` and `map_over: "list"` shapes come from `report-models.ts` and the issue.
- Whether `--connections` on a partly concrete subset gives false reds. An invalid report fails `concrete.ok` (`isConcreteOk`), so turning it on changes the loop's gate. Try it on a real draft before adopting it; #667 is a known risk.
- An invalid connection through `concrete_errors`: read from the code, not run.
- gxformat2 was read through the GitHub API, with no local checkout. `DraftSurveyReport` looks TS-only there.

## Proposal review

One round each, per TRIAGE_ISSUE step 6.

- **In-port draft:** the reviewer pushed back on the drafty-source pitch and the missed gxformat2 sync rather than editing. I confirmed both against the code and rewrote it around edges on both sides, plus rejecting unwired ports. The rewrite hasn't had a second review.
- **Concrete diagnostics draft:** the reviewer revised it in place. Its design change is still worth checking on gxwf#216: `concrete_errors` entries carry no `step`, only `label`, so the array doesn't mix two numberings.

Seen along the way, not in either draft (from reviewers unless noted):

- A cyclic draft validates, although comments in `_topo_ordered_steps` and `topoOrderedSteps` expect validation to report cycles. Separate from #668 and gxwf#215. Confirmed in gxformat2 and gxwf; filed as [gxformat2#288](https://github.com/galaxyproject/gxformat2/issues/288) because gxwf syncs its draft fixtures and expectations from there ([source](upstream_gxformat2_draft_cycles.md)).
- `ReportShell.vue` has no `draft-validate` branch, so `--report-html` looks broken (source only).
- `docs/guide/workflow-operations.md` documents a stale `gxwf validate --json` shape.
- `openapi.json`'s `ValidationStepResult` status enum lacks `skip_no_tool_state`.

## Next

1. Foundry PR, which needs no gxwf release: document the `draft-validate` and `validate --connections` report shapes, add the topology-act sentence to the format note, and add `--connections` plus the reduce/map-over assertion to step 6 once tried on a real draft. Regenerate casts, and update the Mold evals.
2. gxwf#215 (starts in gxformat2, which has no issue of its own yet) and gxwf#216.
3. After those release: bump Foundry's pin and pick up the new work-item text.

Questions for John:

- Should this be split? The Foundry half can land now, and the gxwf half is separate work.
- Should `TODO_x: {}` be rejected? The contract says yes, and gxwf#215 proposes it, but I haven't checked whether any template emits that form.

Staged labels applied 2026-11-06: +roadmap/substep, +priority/mvp, +work/ready-implement; parent #318.
