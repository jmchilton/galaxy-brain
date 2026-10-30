# nf-core/atacseq golden brief history

Process: [GOLDEN_PLANS.md](../../../../agents/wf_foundry/GOLDEN_PLANS.md).

| Date | Version | Foundry SHA | Run | Result | Last phase | planemo | Steps | Open gaps / dropped / surrendered / brief changes | Open questions / decisions |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-29 | v0 (seed) | `9f83fd55` + local `bedb13d4` (phase 1 ran on the unfixed Mold) | `~/foundry-runs/prose-nf2wb-atacseq-2026-10-29/` | brief valid, ready (check exit 0); 1 coordinator attribution fix | 2 of 2 | n/a | n/a | n/a | 15 / 5 |
| 2026-10-29 | v0 build → v1 | `9f83fd55` + local `bedb13d4` (unrelated; no Mold fixes) | `~/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29/` | **planemo green 1/1** on attempt 3 (25/25 output tests, 340 ok / 15 skipped; Galaxy release_26.1); golden v0 `5c32c662`; both levels and the `macs_gsize` k-mer fallback carried (11622260 vs khmer 11624332); controls and alt aligners dropped for step budget, now open questions; 39 inputs / 52 outputs; folded into v1 (9 open / 16 decisions) | 11 of 11 | green | 149 | 18 / 16 / 0 / 4 | 15 / 5 |
