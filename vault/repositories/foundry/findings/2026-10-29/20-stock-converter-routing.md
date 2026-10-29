# advance-galaxy-draft-step has no route from a Tool Shed miss to Galaxy's stock CONVERTER_* tools

- Target: galaxyproject/foundry (Mold, eval, research note). A CLI converter lookup in jmchilton/galaxy-tool-util-ts is optional follow-up, not required. Foundry tracking needed: no, the target issue is the tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-callings-v0-2026-10-29, phase 5 loop iteration 12 ("compress and index known SNPs"), 2026-10-29, Mold revision 10 at foundry_head f0515353 (text unchanged on origin/main 9f83fd55).
- Existing issues/PRs: none for this. Related: [#655](https://github.com/galaxyproject/foundry/issues/655) (step 2 cascade gaps; its correction 8 adds a generic-wrapper route just before the same fall-through), [#552](https://github.com/galaxyproject/foundry/issues/552) (stock version branch is circular, which a first-seen converter also hits), open [PR #686](https://github.com/galaxyproject/foundry/pull/686) (rewrites the same fall-through sentence), galaxy-tool-util-ts [#208](https://github.com/jmchilton/galaxy-tool-util-ts/issues/208) (`--connections` ignores datatypes, would need the same converter registry).

## Symptom
The step plan was a pure vcf → vcf_bgzip conversion for the workflow output `known_snps`. discover-shed-tool missed (nilesh/tabix `bgzip` emits `bgz`; iuc `bcftools_view` has its `z` output commented out). The brief describes the agent as authoring a user tool. It didn't. It went outside the procedure and pinned `CONVERTER_vcf_to_vcf_bgzip_0` 1.0.3. It recorded that as a `miss` pin with an `other` warning, and the eval scored "falls through to authoring" ❌ because the agent did the right thing. The final workflow validated. Its explicit converter step is correct.

## Root cause
Confirmed, high confidence. Step 2's stock branch lists only panel tools and collection ops. Both the Mold and its eval send every shed miss to author-galaxy-tool-wrapper. Nothing in the bundle maps a datatype pair to a converter tool id or version. The vendored registry lists converter *file names*, not ids or versions, and the run had to fetch Galaxy's converter XML through `gh api`.

## Evidence
- `content/molds/advance-galaxy-draft-step/index.md:163-164` (origin/main): the stock examples are `Filter1`, `sort1`, `Cut1`, `Show beginning1`, collection ops and `__APPLY_RULES__`, with no converters. `:169` says "if no acceptable shed candidate emerges, fall through to [[author-galaxy-tool-wrapper]]".
- `content/molds/advance-galaxy-draft-step/eval.md:111-114`: a shed miss must fall through to authoring.
- `content/molds/discover-shed-tool/index.md:68,107,176`: a miss means authoring, and the pin schema has no stock outcome.
- `content/research/galaxy-datatypes-conf/datatypes_conf.xml.sample:585-591` (pinned at 7765fae): `vcf` has **two** converters to `vcf_bgzip`, `vcf_to_vcf_bgzip_converter.xml` (:588) and `uncompressed_to_gz.xml` (:591). The file gives no tool id (`CONVERTER_vcf_to_vcf_bgzip_0`) and no version (1.0.3). Neither Mold links this note.
- Run: `foundry-feedback.ledger.yml:505-538` (`advance-step-no-route-to-stock-converter-on-shed-miss`), `:365-384` (`implement-step-silent-on-implicit-datatype-conversion`: settling the pair took `gh api` reads of release_26.1 `datatypes_conf.xml.sample`, `vcf_to_vcf_bgzip_converter.xml` and `VcfGz.set_meta`), `galaxy-tool-pin.compress-and-index-known-snps.json` (status `miss`, rationale names the converter), `.bin/driver-notes.md:19,21`, `run-summary.md:22,59,80`.
- Implicit conversion: `galaxy-workflow.gxwf.yml:279` (BaseRecalibrator `known_sites` takes the plain-vcf bedtools output, and Galaxy converts it to vcf_bgzip on connection; `run-summary.md:80` says this worked at runtime). `:563-566` explains the explicit step: "a workflow output's datatype is not implicitly converted".

## Proposed fix
1. **When a conversion step is needed.** vcf → vcf_bgzip *is* an implicit conversion. Galaxy runs the registered converter when a vcf is connected to an input that accepts vcf_bgzip. So a conversion step is needed only when its output is a workflow output, or when it feeds something that won't convert implicitly (for example a user-defined tool that needs the result as-is). Otherwise the step should be dropped, which is a topology call for the template Mold. advance-galaxy-draft-step should flag it to the ledger rather than implement it.
2. **Route.** On a shed miss for a pure conversion that is needed, look up the source datatype's `<converter target_datatype=…>` in [[galaxy-datatypes-conf]] and bind the converter as a stock tool. Don't author.
3. **Catalog.** Extend the galaxy-datatypes-conf note with a generated companion table (source, target, converter file, tool `id`, `version`, `depends_on`), produced from Galaxy's `lib/galaxy/datatypes/converters/*.xml` at the same pin. That table answers both questions: which id, and which version. It also fixes #552 for converters. When one pair has two converters, prefer the specific one (`vcf_to_vcf_bgzip`) over `uncompressed_to_gz`. A `galaxy-tool-cache converters <src> [<target>]` command could come later, and gxwf-ts #208 would reuse the same table.
4. **Records.** Give the discover-shed-tool pin schema and miss rationale a "stock fallback" outcome, so a converter pin isn't recorded as a `miss`. In the eval, replace the exception text with a check that the converter id came from the registry.

## Local Mold fix 1782eefb
**Revise, don't drop.** The direction is right, and iterations 14–17 ran on it without regressions. Gaps:
- It doesn't say how to find the id or version. "Galaxy's own `CONVERTER_*` tool for that pair" sends the agent to Galaxy source, and the version still hits the #552 loop.
- It doesn't cite [[galaxy-datatypes-conf]].
- It doesn't skip the step when implicit conversion already covers it.
- It leaves discover-shed-tool's miss semantics as they are.

Revision 11 doesn't collide with origin/main, which is at revision 10. PR #720 edits only `eval.md:~69` (no bump, no overlap). PR #686 is stale: it bumps 7 → 8 and rewrites the `:169` sentence, so whichever lands second rebases and renumbers. Proposed branch: `issue-<n>-stock-converter-route`, rebuilt on origin/main, with the catalog note in the same PR.

## Draft issue
**Title:** advance-galaxy-draft-step: route a Tool Shed miss on a pure datatype conversion to Galaxy's stock converter

Step 2 of `advance-galaxy-draft-step` sends every Tool Shed miss to `author-galaxy-tool-wrapper` (`index.md:169`, `eval.md:111-114`). Its stock branch (`:163-164`) never mentions Galaxy's datatype converters. In a CalliNGS-NF brief-to-galaxy run, a vcf → vcf_bgzip workflow output found no usable shed wrapper. The agent correctly used `CONVERTER_vcf_to_vcf_bgzip_0` 1.0.3 outside the procedure, and the eval failed it for that. Getting the converter's id and version took reading Galaxy source through `gh api`. The vendored `galaxy-datatypes-conf` sample lists converter file names only, and for `vcf` it has two `vcf_bgzip` converters (`:588`, `:591`).

Proposed:
- (a) Use a converter only when the conversion is needed: a workflow output, or a consumer that won't convert implicitly. Otherwise flag the step as redundant.
- (b) On a shed miss for such a step, bind the converter from the registry as a stock tool.
- (c) Add a generated converter table (source, target, id, version) to `galaxy-datatypes-conf`.
- (d) Give discover-shed-tool's pin schema a stock-fallback outcome.
- (e) Update the eval property to match.

Related: #655 (correction 8), #552, PR #686.
