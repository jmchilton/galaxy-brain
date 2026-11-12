Run via Claude Opus 5.5 at high effort. Codex part run via gpt-6-sol at medium effort (`codex exec -s read-only`, one session over both repos).

# Delta review (nested inline keys, list-form id pairing)

Scope: `3fd23149..a5c6cd57`, reviewed with gxformat2 `570de0f..397819a`. Head now `4d086efa`. Full findings in [the gxformat2 debrief](../../../../../gxformat2/branches/active/issue_295_workflow_diff/subagents/delta_review.md).

- **Fixed (`67ea87fd`, mirrors gxformat2 `2dff5d4`).** `merge` only threw when two reported entries collided, so an unchanged slash-keyed step could share a key with a removed nested one. `claimKeys` now records every level's step keys and input/output ids before diffing. `merge` keeps only the own-property write (`__proto__` safety). Red-to-green: "rejects a nested key colliding with an unchanged slash-keyed step" and "rejects a nested input colliding with a slash-keyed input".
- **Re-synced (`4d086efa`)** `diff.yml` and four fixtures from gxformat2 `efb2e5b`: id not unique on one side, blocked id pair, and a relabeled parent with two inline levels. All 32 cases pass. Each fallback case goes red with its TS path mutated out.
- **Needs decision:** blocked-pair rule prefers key matching (see gxformat2 debrief). **Refuted:** integer-like key order, already an accepted difference.
- **JSON shape:** unchanged. Raw `--json` from Py and TS is identical (`cmp`) on all 32 cases, 5 probes and 34 IWC inline-removal pairs.
- **Gates:** `make check`, `pnpm lint:unused:ci`, `pnpm build` and `pnpm test` all green. In one earlier run, the `gxwf-web` `--output-schema` test failed, then passed on rerun; it's unrelated.
