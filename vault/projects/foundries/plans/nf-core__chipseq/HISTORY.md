# nf-core/chipseq golden brief history

Process: [GOLDEN_PLANS.md](../../../../agents/wf_foundry/GOLDEN_PLANS.md).

| Date | Version | Foundry SHA | Run | Result | Last phase | planemo | Steps | Open gaps / dropped / surrendered / brief changes | Open questions / decisions |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-30 | v0 (seed) | `9f83fd55` + local fixtures `40fc911d`; Mold fix `9b2fd539` landed after phase 1 | `~/foundry-runs/prose-nf2wb-chipseq-2026-10-30/` | brief valid, ready (check exit 0); verbatim copy | 2 of 2 | n/a | n/a | n/a | 15 / 4 |
| 2026-10-31 | v0 build → v1 | `9f83fd55` + local `40fc911d`, `9b2fd539`; Mold fix `38400847` (run-workflow-test resolver) during the run | `~/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30/` | **planemo green, all 6 cases** (attempt 5: primary, skip_consensus, skip_trimming 3/3; attempt 4: se_bowtie2, chromap, star; planemo master `2a815808`, Galaxy release_26.1, `--biocontainers`); golden v0 `cace974e`; pairing, `macs_gsize` k-mer fallback (11622260 vs khmer 11624332) and all four aligners carried; MACS2 for MACS3, SPP and R peak-QC plots dropped; 40 inputs / 48 outputs; folded into v1 (8 open / 13 decisions) | 11 of 11 | green | 219 | 14 / 9 / 0 / 10 | 15 / 4 |
