Run via claude-opus-5-5 at medium effort.

# Polish debrief: invocation_graph_embedded_outputs (stage 3)

Polished per [POLISH_BRANCH.md](../../../../../agents/gx_branches/POLISH_BRANCH.md). The head moved from `a8728b098c1` to `bfd85ad414f`, pushed to `jmchilton` with `--force-with-lease`. The base is still stage 2 (`3b546b24e6f`). There are two small code changes, both folded into their commits, so the history is still eight commits.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/differential-review/snapshots/20261104T024344Z-polishing-bfd85ad414f1.json
  polishing @ bfd85ad414f1 vs invocation_graph_embedded_workflow_outputs (merge-base 3b546b24e6f3)
  since 20261104T022910Z-hardening-a8728b098c17:
    commits: 4 same, 2 rebased, 2 changed, 0 new, 0 dropped
    hunks:   65 carried, 2 changed, 0 new, 0 dropped
    changed 0fd81d38abdd Workflow steps can name a preferred output (1 differing hunk)
    changed 57ac79605940 Invocation graph: with Embed Outputs on, show steps as their preferred output (1 differing hunk)
```

## Steps

1. **CI** (Sonnet, low effort). Fork CI on `a8728b098c1` had one related red: Python linting failed on mypy in `test/unit/data/model/test_model.py:135`. The legacy-config test assigns a JSON string to `step.config`, which is now annotated as a dict. The fix is `# type: ignore[assignment]` on that line, since the test assigns the legacy string on purpose. It's folded into `0fd81d38abd`. Python linting then passed on `e42ca09cd4b`, whose Python tree is the same as the final head's.
2. **Checklist:** GENERAL plus WORKFLOW_RELATED ([pr_checklist.md](pr_checklist.md), Opus, medium effort). All nine items pass. One gap is recorded in the details: the Embed Outputs toggle can be enabled by a scheduled step whose preferred output is never produced.
3. **Description:** [pr_description.md](pr_description.md), following stage 2's structure.
   - The visuals lead: the editor star, then three stage 2 → stage 3 flip pairs (the test workflow at 100%, ChIP-seq at 50%, ATAC-seq at 50%), with more pairs in a details block.
   - Stage 2's 07, 08 and 10 were copied into `screenshots/` as `stage2_*.png`, so every embedded image lives under this branch's `screenshots/`. Frame 18 is the live stage 2 counterpart of 06. [screenshot_debrief.md](screenshot_debrief.md) notes the copies.
   - The bold-italic sentences cover four points: it's stage 3 only and stacks on stage 2; the new metadata (stored in `config`, no migration, no schema change, existing exports unchanged); the gxformat2 and IWC caution; and that the editor gains a star while the graph changes only when a step is starred and Embed Outputs is on.
   - Details blocks cover the field's storage, serialization and version semantics, and the known gaps (gxformat2 first).
   - The organisation section says the four leading commits could move down into stage 2.
4. **Strengthening** (Opus, medium effort): no branch defects, and no claim was wrong about the code. Applied:
   - **Branch:** a vitest in `useEmbeddedOutputs.test.ts`, "moves nothing when a step shown as its preferred output finishes", folded into `57ac7960594`. It fails if the layout watches step state (mutation checked).
   - **Description:**
     - "pushes less than stage 2" softened to "no more than stage 2, and less where a grown step takes a card's place", which is what the measurements show.
     - The running-invocation bullet now says a step grows with one nudge once it's scheduled, and that the fill-in is tested.
     - The SQL number is now marked as a measurement.
     - The "nothing changes" sentence now names the editor star.
     - The no-schema-change, unchanged-export and IWC points moved into a bold-italic sentence.
5. **Check branch:**
   - `make format` is clean.
   - mypy on the six changed Python files, run from `lib/` as CI does, shows only `galaxy/managers/notification.py:862`, which is on the base too.
   - prettier, eslint and vue-tsc are clean.
   - Vitest on `Workflow/Invocation` and `Workflow/Editor`: 48 files and 453 tests pass.
   - The model unit test passes.
   - Selenium/Playwright weren't rerun: no Python test or product code changed beyond the one `type: ignore` comment.
6. **Titles and tags:** [pr_titles.md](pr_titles.md) has five options and the standing-branch line. [pr_tags.md](pr_tags.md) has `kind/feature`, `area/UI-UX` and `area/workflows`. The labeler's `area/database` is dropped, because no schema changes.

## CI

The final head `bfd85ad414f` has pending runs only, and no failures yet. Python linting, Client linting, OpenAPI linting, Database indexes and Unit w/postgres passed on `e42ca09cd4b`. The final head differs from it only by one vitest.

## Left for John

- **PR shape:** one PR on stage 2; the backend and star first on `dev`; or the four leading commits moved into stage 2 (that last option would mean refreshing stage 2's polish).
- **Scope questions** (not done, since each widens scope): subworkflow steps; an editor lint for stale names; listing preferred outputs in the invocation response; easing the dense-column push (stage 2's rule); gxformat2 support (separate repository).
- `scope_evaluation.md` still cites pre-reword SHAs (`ec94746e8cb`, `8203d9bf95b`, `b11aff0ee88`). It's a hardening artifact, so I left it alone.
