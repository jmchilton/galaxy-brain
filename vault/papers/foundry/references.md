# References

Working reference collection for the Foundry manuscript. Inline citations in `manuscript.md` use short `[Author YYYY]` / short-key form; full records are collected here. Entries marked **verify** are not yet confirmed and must be resolved (or the prose generalized to drop them) before submission.

## Internal Sources (project docs)

The Foundry project lives at `~/projects/worktrees/foundry/branch/update-workflow/` (active worktree as of 2026-06). Source docs the manuscript draws on:

- `docs/ARCHITECTURE.md` — full content model, validator checks, casting pipeline.
- `docs/COMPARISONS.md` — positioning against wikis, skills, RAG, generated docs.
- `docs/COMPILATION_PIPELINE.md` — per-kind casting dispatch, two-phase deterministic+LLM contract.
- `docs/GUIDING_PRINCIPLES.md`, `docs/MOLDS.md`, `docs/MOLD_SPEC.md` — Mold authoring contract.
- `vault/projects/workflow_state/proposal/FOUNDRY_WHITE_PAPER.md` — the white paper this draft is derived from.

(Avoid hardcoding a worktree path in the manuscript itself; cite the repository, not a local checkout.)

## External References

Resolved into manuscript citation keys. Full bibliographic records below.

- **Blankenberg 2014.** Blankenberg D, et al. Dissemination of scientific software with Galaxy ToolShed. Genome Biology 15:403 (2014). doi:10.1186/s13059-014-0403-5.
- **Bray 2023.** Bray SA, et al. The Planemo toolkit for developing, deploying, and executing scientific data analyses in Galaxy and beyond. Genome Research 33(2):261–268 (2023). doi:10.1101/gr.276963.122.
- **Crusoe 2022.** Crusoe MR, et al. Methods Included: Standardizing Computational Reuse and Portability with the Common Workflow Language. Communications of the ACM 65(6):54–63 (2022). doi:10.1145/3486897.
- **Di Tommaso 2017.** Di Tommaso P, et al. Nextflow enables reproducible computational workflows. Nature Biotechnology 35(4):316–319 (2017). doi:10.1038/nbt.3820.
- **Ewels 2020.** Ewels PA, et al. The nf-core framework for community-curated bioinformatics pipelines. Nature Biotechnology 38:276–278 (2020). doi:10.1038/s41587-020-0439-x.
- **Galaxy Community 2024.** The Galaxy Community. The Galaxy platform...: 2024 update. Nucleic Acids Research 52(W1):W83–W94 (2024). doi:10.1093/nar/gkae410.
- **gxformat2.** Chilton J, and Galaxy Project contributors. gxformat2: Galaxy Workflow Format 2. https://github.com/galaxyproject/gxformat2 — repository.
- **IWC.** Intergalactic Workflow Commission. https://github.com/galaxyproject/iwc — repository; site https://iwc.galaxyproject.org/.
- **MCP.** Anthropic. Model Context Protocol. https://modelcontextprotocol.io/ — specification.
- **Agent Skills.** Anthropic. Agent Skills. **verify** canonical citation (docs/announcement URL).
- **llms.txt.** Howard J. The /llms.txt file proposal. https://llmstxt.org/ — specification.
- **Sun 2026.** Sun Y, Wei P, Hsieh LB. Don't Retrieve, Navigate: Distilling Enterprise Knowledge into Navigable Agent Skills for QA and RAG. arXiv:2604.14572 (2026). Implementation: https://github.com/dukesun99/Corpus2Skill. (Closest prior work — Corpus2Skill; cited inline as [Sun 2026].)
- **FastMCP.** FastMCP contributors. FastMCP: generating MCP tools from OpenAPI specifications. https://gofastmcp.com/integrations/openapi — documentation. (Representative OpenAPI-to-tool generator.)

## Companion Papers (this issue / Galaxy paper set)

- **gxwf.** Format 2 and gxwf: schema-aware authoring and validation of Galaxy workflows. `vault/papers/gxwf/`. **verify** final title/citation.
- **Galaxy Notebooks.** Reproducible notebook-driven workflow extraction. `vault/papers/galaxy-notebooks/`. **verify** final title/citation.

## External References To Resolve / Verify

- **Agent Skills** — confirm Anthropic's canonical citation URL (docs vs. announcement).
- **RAG failure analyses** — optional: a citable analysis of retrieval-augmented-generation failure modes would further support the "compile-time grounding beats runtime retrieval" claim; [Sun 2026] already supplies external evidence for navigation over retrieval, and the claim is otherwise framed as the paper's own wager in Comparisons.
