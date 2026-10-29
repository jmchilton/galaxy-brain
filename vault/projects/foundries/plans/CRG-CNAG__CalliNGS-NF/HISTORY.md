# CRG-CNAG/CalliNGS-NF golden brief history

Process: [GOLDEN_PLANS.md](../../../../agents/wf_foundry/GOLDEN_PLANS.md).

| Date | Version | Foundry SHA | Run | Result | Last phase | planemo | Steps | Open gaps / dropped / surrendered / brief changes | Open questions / decisions |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-29 | v0 (seed) | `9f83fd55` + local `0d8daf0e` (unused) | `~/foundry-runs/prose-nf2wb-callings-2026-10-29/` | brief valid, ready (check exit 0); 3 coordinator corrections | 2 of 2 | n/a | n/a | n/a | 13 / 3 |
| 2026-10-29 | v0 build → v1 | `9f83fd55` + local `0d8daf0e`, `1782eefb`, `619ae0a7` | `~/foundry-runs/prose-wb2g-callings-v0-2026-10-29/` | **planemo green 1/1** on attempt 5 (23/23 assertions, 24 jobs; Galaxy release_26.1 via `planemo serve` + `external_galaxy` for 3 embedded user tools: VariantFiltration, ASEReadCounter, diff-site, no GATK4 wrapper exists); golden v0 `f8993830`; both replicates consumed; folded into v1 (6 open / 13 decisions) | 11 of 11 | green | 18 | 0 / 2 / 4 / 1 | 13 / 3 |
