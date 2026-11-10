# Polish debrief

Run via Claude Opus 5.5 at default effort. This covers both branches; the gxformat2 record links here.

- **Descriptions:** [gxformat2](../../../../gxformat2/branches/active/issue_288_draft_cycles/pr_description.md) and [TS](pr_description.md). Both lead with before/after on the issue's own draft:
  - Python `validate_draft` on `main` vs branch;
  - `gxwf draft-validate` with exit 0 → 1.
- **Strengthening round:** one fresh subagent read both descriptions and checked the claims against the code. Applied, in both repos (gxformat2 `6cc1d0a`, TS `8c04726c`):
  - `[dev]` `next_draft_step` cases on both cycle fixtures. They pin that it stays total, that a stripped self-edge doesn't block its step, and the alphabetical drain.
  - `[dev]` a cycle closed through an undeclared port, asserting both the cycle and the unknown-port error.
  - `[dev]` (from its non-blocking notes) `synthetic-draft-shadowed-step-ref.gxwf.yml`. It pins the topo ref-resolution alignment: `main` offers `y` and the branch offers `b`, so the test fails on `main`. It also checks that an input label like `z/out` doesn't fake a cycle with step `z`.
  - `[desc]` changes:
    - why a cycle is wrong (Galaxy refuses to run cyclic workflows, verified at `lib/galaxy/workflow/run_request.py:370` and `managers/workflows.py:1374` on `dev`);
    - "only drafts are checked";
    - corpus counts made consistent: 240 files, 209 PyYAML-loadable, and "redefine a YAML anchor";
    - Thermo bullet count;
    - Python's Codex line;
    - TS nested-draft sentence promoted.
  - The description now also says the shadowed-ref ordering change is deliberate and observable, where it had claimed `next_draft_step` was unchanged everywhere.
- **Not applied:** the agent's claim that Galaxy's `topsort` ignores self-pairs. I didn't verify it, so the descriptions argue the self-loop case on its own terms.
- Implementation debrief corrected: messages, the changeset level, and the corpus counts (it counted fixtures as real drafts).
- Titles and tags: [gxformat2 titles](../../../../gxformat2/branches/active/issue_288_draft_cycles/pr_titles.md), [gxformat2 tags](../../../../gxformat2/branches/active/issue_288_draft_cycles/pr_tags.md), [TS titles](pr_titles.md), [TS tags](pr_tags.md).

## Questions for John

- Merge order: gxformat2 first (it owns the fixtures), then TS. OK to open both together when approved?
- Scope-widening follow-ups raised along the way, none done here. Want issues filed?
  - Follow `$link` refs for edges, cycles and ordering.
  - Reject duplicate list-form step labels; they can hide a cycle.
  - Move extract's `_split_source_ref` callers onto input+step resolution.
  - One resolved-edge index per workflow level.
  - Cycle lint for non-draft `GalaxyWorkflow`.
