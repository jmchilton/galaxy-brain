# nf-core/smrnaseq golden brief history

Process: [GOLDEN_PLANS.md](../../../../agents/wf_foundry/GOLDEN_PLANS.md).

| Date | Version | Foundry SHA | Run | Result | Last phase | planemo | Steps | Open gaps / dropped / surrendered / brief changes | Open questions / decisions |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-25 | v0 (seed) | `08d534a3` + local `79f5dfb6` (unused) | `~/foundry-runs/prose-nf2wb-smrnaseq-2026-10-25/` | brief valid, ready (check exit 0) | 2 of 2 | n/a | n/a | n/a | 8 / 4 |
| 2026-10-25 | v0 build → v1 | `08d534a3` + local `1c675e1a` | `~/foundry-runs/prose-wb2g-smrnaseq-v0-2026-10-25/` | **planemo green 1/1** (attempt 9; 93/93 jobs, 9 skipped by `when`; miRDeep2 skipped as in source test); folded into v1 (7 open / 9 decisions) | 11 of 11 | green | 47 | 0 / 8 / 16 / 5 | 8 / 4 |
| 2026-10-29 | v1 build → v2 | `9f83fd55` + local `e0aefee0` | `~/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29/` | **planemo green 2/2** on attempt 2 (v0: 9); case 0 123 ok / 1 skipped, case 1 (no genome) 79 ok / 19 skipped; miRDeep2 ran with real predictions on `test_full`-derived reads; golden v1 `4c6d3c07`; dropped 8 → 0, surrendered 16 → 12; folded into v2 (5 open / 11 decisions) | 11 of 11 | green | 68 | 0 / 0 / 12 / 5 | 7 / 9 |
