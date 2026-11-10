# Codex review debrief

Run via gpt-6-sol at medium effort, as two independent read-only sessions: gxformat2 at `021fd1b` and TS at `59565c31`.

I acted on the one finding (gxformat2 P2, confirmed). TS returned no findings; its sandbox couldn't run Vitest.

- **Fixed: P2, cycles that share a step are merged into one misleading error.** `_step_cycles` groups steps by mutual reachability (a strongly connected group), so a↔b and b↔c come out as one entry naming `a`, `b`, `c`. The old wording, "form a cycle; break one of its edges", was wrong advice for that group. Listing every simple cycle can blow up combinatorially, so I kept one error per group and reworded it:
  - `steps … depend on each other through a cycle`
  - `step "x" sources its own output`

  I added an `m1`/`m2`/`m3` shared-step case. Fixed in both repos: gxformat2 `d618875`, TS `4fbdf3db`.

Not acted on: none.

<details><summary>Raw findings</summary>

gxformat2:

```json
{"severity": "P2", "category": "correctness", "file": "gxformat2/draft.py", "line": 699,
 "title": "Shared-step cycles are merged into one misleading diagnostic",
 "failure_scenario": "With dependencies a→b, b→a and b→c, c→b, validate_draft returns only `steps \"a\", \"b\", \"c\" form a cycle; break one of its edges`. There are two cycles, a↔b and b↔c; breaking one edge cannot resolve both.",
 "confidence": "certain"}
```

TS: `findings: []`. Coverage note: "Focused tests could not start because the read-only sandbox blocked Vitest temporary files."

</details>
