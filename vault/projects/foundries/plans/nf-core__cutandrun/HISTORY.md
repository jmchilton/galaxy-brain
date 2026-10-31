# nf-core/cutandrun golden brief history

Process: [GOLDEN_PLANS.md](../../../../agents/wf_foundry/GOLDEN_PLANS.md).

| Date | Version | Foundry SHA | Run | Result | Last phase | planemo | Steps | Open gaps / dropped / surrendered / brief changes | Open questions / decisions |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-31 | v0 (seed) | `9f83fd55` + local `40fc911d`, `9b2fd539`, `38400847`; Mold fix `a1d2e24a` landed after phase 1 | `~/foundry-runs/prose-nf2wb-cutandrun-2026-10-31/` | brief valid, ready (check exit 0); verbatim copy | 2 of 2 | n/a | n/a | n/a | 17 / 2 |
| 2026-10-31 | v0 build → v1 | `9f83fd55` + local `40fc911d`, `9b2fd539`, `38400847`, `a1d2e24a`; Mold fix `f766287a` (implement-galaxy-workflow-test `decompress: true`) during the run | `~/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31/` | **planemo green, 6 runnable cases** (attempt 5: test_primary, cpm_macs2_primary; attempt 6: test_full_small; test_no_control, test_tech_reps, none_controls_off last green in attempt 4, before repair R4, not re-run; spikein_failfast fails at the intended step; planemo master `2a815808`, Galaxy release_26.1, `--biocontainers`); golden v0 `d1d5a4fc`; IgG pairing, Spikein factors with zero fallback and fail-fast, both callers, `macs_gsize` 2.7e9 carried; Spikein/CPM/None tested, RPKM/BPM untested; prebuilt index and `trim_nextseq` dropped, preseq never run; 56 inputs / 57 outputs; folded into v1 (10 open / 11 decisions) | 11 of 11 | green | 298 | 8 / 5 / 0 / 12 | 17 / 2 |
