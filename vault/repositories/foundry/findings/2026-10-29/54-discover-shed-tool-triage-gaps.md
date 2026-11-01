# discover-shed-tool triage ignores the source tool version, whether the wrapper's container exists, and whether a confirmed hit fits the step contract

- Target: galaxyproject/foundry (`content/molds/discover-shed-tool/index.md` triage and status vocabulary; `author-galaxy-tool-wrapper` step 1). Nothing upstream: missing mulled containers and narrow wrappers are normal Tool Shed facts. Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 5 iterations ill-L7 (fastp), ill-L41 (iVar trim), ill-L64 (bcftools sort), 2026-11-01. Ledger `discover-shed-tool-version-rule-ignores-source-tool-version`, `discovery-status-has-no-contract-mismatch-case`, `discover-shed-tool-triage-ignores-container-resolvability` (all minor).
- Existing issues/PRs: none found. Related: finding [45](45-cutandrun-tool-limits-not-bugs.md) (wrappers that can't express the source; viralrecon items added there), finding [20](20-stock-converter-routing.md) (miss routing).

## Symptom and cause
1. **Version.** The Mold says to pick "the newest installable version unless the need specifies otherwise". In a translation the source pins its tool version and parity anchors (nf-test md5s) depend on it. fastp: source 1.0.1, template/IWC pin 1.1.0+galaxy0, newest 1.4.0+galaxy0; the iteration chose 1.0.1+galaxy3 by judgement (probe passed). Nothing says which wins.
2. **Runnability.** Hit scoring uses name match, owner, recency and duplicates, never whether the wrapper's requirements resolve to a container. greg/bcftools_sort (sole `bcftools sort` wrapper) needs bcftools 1.20 + htslib 1.20, whose mulled-v2 hash tag is absent from quay.io/biocontainers, so it can't run under `--biocontainers`. Found only by a manual metadata + registry check; a user tool was authored instead.
3. **Contract fit.** Status is `hit | weak | miss`, where `weak` means *ambiguous*. iuc ivar_trim 1.4.4+galaxy1 is an unambiguous hit that can't satisfy the step (no log output, rewrites the BED with a scheme conversion). The iteration recorded `weak` with the reason in prose to reach authoring, because author-galaxy-tool-wrapper continues only on `miss` or an explicit weak fall-through.
Confidence: high (Mold text read; run evidence in the pin files).

## Evidence
`galaxy-tool-pin.fastp-se.json`, `galaxy-tool-pin.ivar-trim.json` (rationale), driver-notes L7, L41, L64; open-requirements `fastp-wrapper-pin-and-se-probe`, `ivar-trim-wrapper-discovery`.

## Proposed fix
1. Version rule for translated steps: the newest wrapper revision of the source's exact tool version when one exists, else the nearest newer version; record the choice; an IWC/template pin is installability evidence, not a version mandate.
2. Triage step: check runnability from Tool Shed repository metadata (single requirement → biocontainers tag exists; several → mulled-v2 tag exists). A hit whose container doesn't resolve is `weak` with warning `container-unresolvable`.
3. Add a warning code (or status) for "confident hit, contract-incompatible" naming the unmet port/parameter, and let author-galaxy-tool-wrapper step 1 accept it as a justified fall-through. Eval cases for each.

## Draft issue
**Title:** discover-shed-tool: prefer the source tool version, check container resolvability, and record contract-incompatible hits

From the nf-core/viralrecon wb2g build (2026-11-01): (1) "newest installable" conflicts with parity to the source's pinned version (fastp 1.0.1 vs 1.4.0); (2) the sole bcftools sort wrapper is unrunnable under biocontainers (mulled-v2 tag missing) but still scores as a hit; (3) iuc ivar_trim is a confirmed hit that lacks a needed output, and the status vocabulary has no way to say so, so the run mislabelled it `weak` to reach authoring. Proposal: a source-version rule, a runnability check in triage, and a contract-incompatible warning that author-galaxy-tool-wrapper accepts.
