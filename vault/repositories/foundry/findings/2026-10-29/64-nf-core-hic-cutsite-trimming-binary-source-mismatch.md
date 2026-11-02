# nf-core/hic's committed `cutsite_trimming` binary is not a build of `bin/src/cutsite_trimming.cpp`

- Target: nf-core/hic (repository content). Foundry tracking needed: no Foundry code change; the brief side is finding [57](57-brief-bundled-helpers-and-method-substitution.md) and the run's recommendation `cutsite-trimming-reference-source` for the golden brief.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phase 2 (data-flow), probe C (`.scratch/dataflow/probe_cpp/` in the run dir), fixture nf-core__hic 2.1.0 @ fe4ac656, 2026-11-01. Open-requirements `cutsite-trimming-source-binary-mismatch` (open), discovery `cutsite-trimming-committed-binary-is-hicpro-3.1.0`.
- Existing issues/PRs: none in nf-core/hic (searched issues/PRs "cutsite", "cutsite_trimming", "arima"). Related, not the same: #225 (improve Arima protocol), #113 (Arima `get_valid_interaction` memory), #210 (TRIM_READS error with HindIII).

## Symptom
The pipeline runs the committed `bin/cutsite_trimming` executable. Its C++ source in `bin/src/` is an older revision. Rebuilding from `bin/src` gives identical output for motifs without `N` (HindIII `AAGCTAGCTT`, MboI/DpnII `GATCGATC`: md5 of trimmed reads equal) but different output for motifs containing `N`, which includes the Arima ligation set (`GATCANTC`, `GANTGATC`, `GANTANTC`). Anyone rebuilding from source, or reading the source to know what the pipeline does, gets the wrong Arima behaviour.

## Root cause
Confirmed:
- Commit 90f8469b ("[HICPRO] update c++ complilation", 2023-01-13) replaced `bin/cutsite_trimming` and `bin/build_matrix` and changed no source. `bin/src/cutsite_trimming.cpp` was last changed in 2022 lint commits (7ff1d2c3).
- The committed binary contains the symbol `check_cutSites` (`strings bin/cutsite_trimming`). That function expands `N` in ligation motifs in HiC-Pro v3.1.0 (`scripts/src/cutsite_trimming.cpp:70-89`). `bin/src/cutsite_trimming.cpp` has no such function.
- Upstream HEAD (8c4018a1, 2026-10-07) has the same blobs as the fixture for both files (`c7b66081` source, `0edd84b9` binary), so it is still current.
- `build_matrix` rebuilt from `bin/src` produced md5-identical matrix and BED output on the probe's toy input, so only `cutsite_trimming` is affected as far as tested.

## Evidence
- Probe C directory: `committed_cutsite_trimming`, rebuilt `cs`, `src/`, `old.matrix`/`new.matrix` (identical md5). Data-flow brief §11 "N-motif caveat".
- `gh api repos/nf-core/hic/commits?path=bin/cutsite_trimming` and `?path=bin/src/cutsite_trimming.cpp`.

## Proposed fix
nf-core/hic: replace `bin/src/cutsite_trimming.cpp` with the source the binary was built from (HiC-Pro v3.1.0's, or whichever revision it was), or rebuild the binary from the committed source. Better, drop the committed binaries and compile in the module's container (the Galaxy translation already compiles in `gcc:13.2.0`). Foundry: nothing to change; the golden brief keeps its recommendation until the reference is decided.

## Draft issue
**Title:** `bin/cutsite_trimming` is not built from `bin/src/cutsite_trimming.cpp` (N-containing ligation motifs, e.g. Arima, differ)

Commit 90f8469b ("[HICPRO] update c++ complilation") replaced the committed `bin/cutsite_trimming` and `bin/build_matrix` binaries without updating `bin/src/`. The binary now behaves like HiC-Pro v3.1.0's `cutsite_trimming`: it contains `check_cutSites`, which expands `N` in ligation motifs. `bin/src/cutsite_trimming.cpp` predates that and does not expand `N`.

Rebuilding from `bin/src` with the HiC-Pro Makefile flags (`g++ -Wall -O2 -std=c++0x`) gives the same trimmed reads as the committed binary for `AAGCTAGCTT` and `GATCGATC`, but different reads for motifs with `N`, including the Arima set `GATCANTC,GANTGATC,GANTANTC`. `build_matrix` rebuilt from source matched the committed binary on a small test. Still the case on `master` at 8c4018a1.

Could `bin/src/cutsite_trimming.cpp` be updated to the source the binary was built from (or the binary rebuilt from the committed source, if the older behaviour is intended)? Building both tools from source in the module container would keep them in sync.
