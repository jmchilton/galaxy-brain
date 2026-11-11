Draft of a new `galaxyproject/foundry` issue split from #796 part 3. Not filed.

---

**Title:** Test phase: steps removed on a justification that later turns out wrong are never restored

## Summary

#796 parts 1–2 make every step removed during the test phase visible and labelled: a diff against the draft snapshot, plus a `kind: dropped` ledger entry for each removed step. That catches removals nobody recorded. It does not catch a removal that *was* recorded, but whose reason a later attempt disproves.

In the nf-core/bamtofastq run (galaxyproject/iwc-lab#8), five ledger entries justified removals by citing Galaxy's `validation_failed` log line, which isn't a failure verdict (galaxyproject/galaxy#24837). At attempt 15 the real cause turned out to be one stale `when:` guard. All five entries were labelled, so the #796 check passes them, yet each one cites a cause that attempt 15 disproved. `open-requirements-ledger` already says "a refuted justification reopens its decision". Nothing acts on it in the test phase.

## Options

1. **Harness loop.** After green, re-add the removed steps in source topological order, re-running the test each time. A step that fails again goes back to the ledger with that attempt's error. Doesn't depend on the model. Costs one planemo run per removal (12 on bamtofastq). Interdependent removals (chr filter → collate → fastx) can't be re-added one at a time. Needs test-phase routing, which #753 left out.
2. **Mold.** A restore step reads the dropped entries whose `because` cites evidence that a later attempt contradicts, and re-adds only those. Cheaper and handles rewiring. Relies on the model's diligence, which is what failed here ("after 15 failed attempts I optimized for a green result").
3. **No restoration.** Rely on #796's labels, #784's report and the ledger note now bundled with the test-phase skills. A refuted removal stays visible in the report, labelled with a reason that is now wrong.

## Suggested first step

Wait for #796 parts 1–2 and #784 to land, then count across runs how often a labelled test-phase removal turns out to rest on a disproved reason. On the same pipeline, Claude Opus 5.5 (iwc-lab#6) and GLM-5.3-flash (iwc-lab#7) kept the source steps. The single bamtofastq run may not justify a loop.

Related: #796, #784, #753, galaxyproject/galaxy#24837.
