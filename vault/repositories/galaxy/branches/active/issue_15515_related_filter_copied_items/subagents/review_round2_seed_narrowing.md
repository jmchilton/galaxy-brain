# Normal review: seed narrowing (2026-10-15)

I acted on all three wording findings: the comment on the dataset narrowing now says it is an approximation that avoids walking every copy, the docstring says "seed HDAs", and the ordinary-history comment sits back on its `if`. I kept the optional sibling-copy test unchanged. The comment fixes were squashed into `6c8b5b22a29`.

Not acted on:
- No red-to-green test for the performance change. The reviewer agreed that statement count stays fixed and EXPLAIN or row assertions would be brittle on SQLite. The evidence is the PostgreSQL size benchmark (`history_size_probe.py`, `history_size_results.json`).
- The sibling-copy test also passes on `4d82165af62`. It guards the chain-walk requirement and is not a red test.

<details><summary>Full review</summary>

**Verdict:** correct and proportionate. No must-fix findings. The reviewer re-ran the manager tests: 28 passed.

1. **should-fix (wording):** the narrowing comment read like an invariant. Deferred materialization that isn't in place, and model-store "sinks", break it. Suggested rewording to describe it as narrowing. Applied.
2. **nit:** the docstring said "seed datasets'". Changed to "seed HDAs'". Applied.
3. **nit:** the ordinary-history comment had drifted above the loop. Moved it back to `if copies_by_class[...]`. Applied.
4. **test note:** the sibling test is not red-to-green but keeps a useful guard. A perf red-to-green test isn't practical.

Checked and fine:
- **Candidate ownership:** the candidate-seeded ownership chain is a superset of every node the outer mapping walk visits, so no collection-owned ancestor is missed.
- **Copy paths:** the main copy paths preserve `dataset_id`. Nothing is missed beyond the documented deferred-materialization and archive-import cases.
- **HDCA side:** left unchanged, which is correct.
- **Naming and imports:** no CTE name collisions. No new imports, and the existing helpers are reused.
- **Security:** no concerns.

</details>
