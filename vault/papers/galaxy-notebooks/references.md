# References

Initial source list for the Galaxy Notebooks paper. Notes are deliberately manuscript-facing: where the citation belongs, what claim it supports, and any cautions before converting to the final bibliography.

## Core Galaxy Sources

- Goecks J, Nekrutenko A, Taylor J, The Galaxy Team. 2010. Galaxy: a comprehensive approach for supporting accessible, reproducible, and transparent computational research in the life sciences. Genome Biology 11:R86. https://doi.org/10.1186/gb-2010-11-8-r86
  - Use in Introduction and Background. This is the foundational Galaxy citation and the key precedent for the paper's claim: Galaxy already framed histories, workflows, datasets, and Pages as infrastructure for accessible, transparent, reproducible analysis communication.
  - Important: cite specifically for Pages as interactive web documents that communicate complete computational analyses, not just for Galaxy generally. Galaxy Notebooks should be positioned as a history-attached, versioned continuation of that line.

- Abueg LAL, Afgan E, Allart O, et al. 2024. The Galaxy platform for accessible, reproducible, and collaborative data analyses: 2024 update. Nucleic Acids Research 52:W83-W94. https://doi.org/10.1093/nar/gkae410
  - Use in Background and Implementation Context. Establishes current Galaxy scope, public services, tool breadth, training ecosystem, and ongoing platform evolution.
  - Good for sentences about Galaxy as active, multi-domain infrastructure rather than a historical genomics-only system.

- The Galaxy Community. Workflow Reports tutorial. Galaxy Training Network. https://training.galaxyproject.org/training-material/topics/galaxy-interface/tutorials/workflow-reports/tutorial.html
  - Use in Design or Related Work for Galaxy's existing workflow report machinery. This is documentation, not a primary research article, but it is the clearest current source for how workflow invocation reports, Galaxy Markdown, PDF export, and "share as Page" are exposed to users.
  - Connect directly to the manuscript's report-continuity claim: a notebook can seed or become a workflow report rather than remaining a separate narrative artifact.

- Galaxy Project documentation. `galaxy.workflow.reports` package. https://docs.galaxyproject.org/en/master/lib/galaxy.workflow.reports.html
  - Use only for implementation detail if needed. Supports claims about report generation APIs and the markdown report generator plugin.
  - Better suited for Methods/Implementation notes than for the main scholarly motivation.

- Galaxy Workflow Format 2 documentation. Galaxy Workflow Format 2 Description. https://galaxyproject.github.io/gxformat2/
  - Use in Workflow Extraction / Report Continuity if discussing the workflow representation and invocation report configuration surface.
  - Documentation source; cite sparingly unless the final paper discusses Format 2 directly.

## Reproducibility and Scientific Workflows

- Sandve GK, Nekrutenko A, Taylor J, Hovig E. 2013. Ten simple rules for reproducible computational research. PLOS Computational Biology 9:e1003285. https://doi.org/10.1371/journal.pcbi.1003285
  - Use in Introduction. Strong, concise reproducibility motivation, with a Galaxy author lineage. Supports claims that reproducibility requires tracking data, code, parameters, random seeds, intermediate results, and analysis decisions.
  - Good bridge from general reproducibility norms to the paper's claim that communication and interpretation are also reproducibility surfaces.

- Goble C. 2014. Better software, better research. IEEE Internet Computing 18:4-8. https://doi.org/10.1109/MIC.2014.88
  - Use if the Introduction needs a compact citation about software quality as research quality.
  - Secondary/contextual rather than central.

- Leipzig J. 2017. A review of bioinformatic pipeline frameworks. Briefings in Bioinformatics 18:530-536. https://doi.org/10.1093/bib/bbw020
  - Use in Related Work to locate Galaxy among pipeline/workflow systems without turning the paper into a workflow-system comparison.
  - Supports the claim that reproducibility infrastructure spans many workflow frameworks, while Galaxy Notebooks focus on narrative/provenance coupling.

- Wratten L, Wilm A, Göke J. 2021. Reproducible, scalable, and shareable analysis pipelines with bioinformatics workflow managers. Nature Methods 18:1161-1168. https://doi.org/10.1038/s41592-021-01254-9
  - Use in Related Work for a concise modern review of bioinformatics workflow managers and the reproducibility/shareability expectations around them.
  - Useful bridge between Galaxy/CWL/Nextflow-style workflow infrastructure and the paper's narrower claim that workflow execution alone does not capture communicative intent.

- Amstutz P, Crusoe MR, Tijanic N, et al. 2022. Methods included: standardizing computational reuse and portability with the Common Workflow Language. Communications of the ACM 65:54-63. https://doi.org/10.1145/3486897
  - Use in Related Work for portable workflow descriptions and reusable computational methods.
  - Contrast carefully: CWL standardizes execution descriptions; Galaxy Notebooks attach versioned narrative and user-facing reports to a concrete analysis history.

- Ludäscher B, Altintas I, Berkley C, et al. 2006. Scientific workflow management and the Kepler system. Concurrency and Computation: Practice and Experience 18:1039-1065. https://doi.org/10.1002/cpe.994
  - Use in Related Work only if the paper needs a canonical scientific workflow-management citation.
  - Not Galaxy-specific; good for historical grounding of workflow provenance and workflow reuse.

- Davidson SB, Freire J. 2008. Provenance and scientific workflows: challenges and opportunities. Proceedings of SIGMOD 2008, 1345-1350. https://doi.org/10.1145/1376616.1376772
  - Use in Provenance / Related Work. Clear foundation for why scientific workflows and provenance are linked.
  - Helps justify graph-backed extraction and review as more than UI convenience.

## Literate Programming, Dynamic Documents, and Computational Notebooks

- Knuth DE. 1984. Literate programming. The Computer Journal 27:97-111. https://doi.org/10.1093/comjnl/27.2.97
  - Use in Related Work or Discussion to locate Galaxy Notebooks in the long tradition of treating executable work as something explained to humans.
  - Contrast point: Galaxy Notebooks are literate documents around an already provenance-tracked analysis environment, not executable cells that own computation.

- Leisch F. 2002. Sweave: dynamic generation of statistical reports using literate data analysis. In: Compstat 2002 - Proceedings in Computational Statistics, 575-580. Physica. https://doi.org/10.1007/978-3-642-57489-4_89
  - Use in Related Work for dynamic reports combining prose and computation.
  - Useful for the "workflow reports/literate programming" section because it predates modern notebook systems and makes report generation the primary artifact.

- Xie Y. 2015. Dynamic Documents with R and knitr. Chapman and Hall/CRC. https://doi.org/10.1201/9781315382487
  - Use in Related Work if discussing knitr/R Markdown as mature dynamic-report ecosystems.
  - Book rather than paper; cite when needing a stable source for the tool family and reproducible dynamic documents.

- Baumer B, Cetinkaya-Rundel M, Bray A, Loi L, Horton NJ. 2014. R Markdown: integrating a reproducible analysis tool into introductory statistics. Technology Innovations in Statistics Education 8. https://doi.org/10.5070/T581020118
  - Use in Related Work for R Markdown as a document format that combines prose, code, output, and reproducible pedagogy.
  - This is educationally framed, so use as supporting rather than foundational.

- Kluyver T, Ragan-Kelley B, Pérez F, et al. 2016. Jupyter Notebooks - a publishing format for reproducible computational workflows. In: Positioning and Power in Academic Publishing: Players, Agents and Agendas, 87-90. https://doi.org/10.3233/978-1-61499-649-1-87
  - Use in Related Work as the canonical Jupyter publishing/notebook citation.
  - Good contrast: Jupyter binds narrative to executable code cells; Galaxy Notebooks bind narrative to a Galaxy history and its provenance graph.

- Rule A, Birmingham A, Zuniga C, et al. 2019. Ten simple rules for writing and sharing computational analyses in Jupyter Notebooks. PLOS Computational Biology 15:e1007007. https://doi.org/10.1371/journal.pcbi.1007007
  - Use in Related Work and Discussion. Supports the point that computational notebooks require discipline to be readable, reusable, and reproducible.
  - Strong contrast for the document-first claim: Galaxy Notebooks avoid making the communication layer responsible for execution ordering and environment capture.

- Pimentel JF, Murta L, Braganholo V, Freire J. 2019. A large-scale study about quality and reproducibility of Jupyter notebooks. 2019 IEEE/ACM MSR, 507-517. https://doi.org/10.1109/MSR.2019.00077
  - Use in Related Work for empirical evidence that ordinary notebook artifacts often have reproducibility issues.
  - This can motivate the separation between reproducible Galaxy execution and versioned narrative documentation.

- Samuel S, Mietchen D. 2024. Computational reproducibility of Jupyter notebooks from biomedical publications. GigaScience 13:giae021. https://doi.org/10.1093/gigascience/giae021
  - Use in Introduction or Related Work if making a biomedical-specific notebook reproducibility argument.
  - Stronger than generic notebook critiques because it studies biomedical publication-associated notebooks.

## Provenance, Research Objects, and Versioned Scholarly Artifacts

- Moreau L, Missier P, eds. 2013. PROV-DM: The PROV Data Model. W3C Recommendation. https://www.w3.org/TR/prov-dm/
  - Use in Provenance Background. Canonical standard for entities, activities, agents, derivations, and responsibility.
  - Relevant to `edit_source`, notebook revisions, and the relation between datasets, jobs, histories, users, and agents.

- Lebo T, Sahoo S, McGuinness D, eds. 2013. PROV-O: The PROV Ontology. W3C Recommendation. https://www.w3.org/TR/prov-o/
  - Use if the manuscript discusses machine-readable provenance or future export/interchange.
  - Do not overclaim that Galaxy Notebooks implement PROV-O unless that is actually built.

- Groth P, Moreau L. 2013. PROV-Overview: An Overview of the PROV Family of Documents. W3C Working Group Note. https://www.w3.org/TR/prov-overview/
  - Use for an accessible single citation to the PROV family if space is tight.
  - Prefer PROV-DM for technical claims.

- Belhajjame K, Zhao J, Garijo D, et al. 2015. Using a suite of ontologies for preserving workflow-centric research objects. Journal of Web Semantics 32:16-42. https://doi.org/10.1016/j.websem.2015.01.003
  - Use in Related Work for workflow-centric research objects: bundling workflows, data, provenance, annotations, and metadata for understanding and reuse.
  - This is one of the closest conceptual neighbors to "analysis communication as a reproducible artifact."

- Bechhofer S, De Roure D, Gamble M, Goble C, Buchan I. 2010. Research Objects: towards exchange and reuse of digital knowledge. Nature Precedings. https://doi.org/10.1038/npre.2010.4626.1
  - Use in Related Work if introducing Research Objects historically.
  - Preprint/position source; pair with Belhajjame et al. 2015 for a stronger archival citation.

- Soiland-Reyes S, Sefton P, Crosas M, et al. 2022. Packaging research artefacts with RO-Crate. Data Science 5:97-138. https://doi.org/10.3233/DS-210053
  - Use in Discussion/Future Work for packaging notebooks, histories, workflows, reports, and provenance into interoperable research objects.
  - Useful if the paper suggests export or FAIR packaging of Galaxy Notebook artifacts.

- Soiland-Reyes S, Bacall F, Crusoe MR, et al. 2024. Recording provenance of workflow runs with RO-Crate. PLOS ONE 19:e0299210. https://doi.org/10.1371/journal.pone.0299210
  - Use in Provenance/Discussion for workflow-run provenance packaging.
  - Strong fit for future export of notebook-linked workflow invocations, but avoid implying current Galaxy Notebooks emit Workflow Run RO-Crate unless implemented.

- Muniswamy-Reddy KK, Holland DA, Braun U, Seltzer M. 2006. Provenance-aware storage systems. USENIX Annual Technical Conference, 43-56. https://www.usenix.org/conference/2006-usenix-annual-technical-conference/provenance-aware-storage-systems
  - Use only if the paper needs a broader systems precedent for automatically captured provenance.
  - Useful analogy for why provenance should be infrastructure, not an afterthought imposed on users.

## Workflow Extraction and Narrative-to-Workflow Precedents

- McPhillips T, Song T, Kolisnik T, et al. 2015. YesWorkflow: a user-oriented, language-independent tool for recovering workflow information from scripts. International Journal of Digital Curation 10:298-313. https://doi.org/10.2218/ijdc.v10i1.370
  - Use in Related Work for recovering workflow structure from annotations embedded in scripts.
  - Strong conceptual neighbor: structured comments make latent workflow information explicit. Galaxy Notebooks similarly use narrative references to mark meaningful datasets and outputs, but recover structure from the Galaxy provenance graph rather than source code annotations.

- Pimentel JF, Murta L, Braganholo V, Freire J. 2017. noWorkflow: a tool for collecting, analyzing, and managing provenance from Python scripts. Proceedings of VLDB Endowment 10:1841-1844. https://doi.org/10.14778/3137765.3137789
  - Use in Related Work for retrospective provenance capture outside workflow systems.
  - Contrast: Galaxy already captures execution provenance; the open problem is connecting that graph to durable communicative intent.

- Deelman E, Gannon D, Shields M, Taylor I. 2009. Workflows and e-Science: an overview of workflow system features and capabilities. Future Generation Computer Systems 25:528-540. https://doi.org/10.1016/j.future.2008.06.012
  - Use in Related Work if summarizing workflow-system capabilities: composition, execution, provenance, sharing.
  - Broad survey; keep brief.

- Garijo D, Gil Y. 2011. A new approach for publishing workflows: abstractions, standards, and linked data. Proceedings of the 6th Workshop on Workflows in Support of Large-Scale Science. https://doi.org/10.1145/2110497.2110504
  - Use if discussing workflow publication and abstraction.
  - Helpful for a section on notebook-seeded workflow reports and graph confirmation, though not essential.

## Agent-Assisted Bioinformatics and AI-Science Context

- Boiko DA, MacKnight R, Kline B, Gomes G. 2023. Autonomous chemical research with large language models. Nature 624:570-578. https://doi.org/10.1038/s41586-023-06792-0
  - Use in Introduction/Discussion as a high-profile example of LLM agents orchestrating scientific tasks.
  - Supports the paper's motivation that agents need provenance-aware infrastructure. Do not make it central; it is outside bioinformatics.

- Qu Y, Huang K, Yin M, Zhan K, Liu D, Yin D, Cousins HC, et al. 2026. CRISPR-GPT for agentic automation of gene-editing experiments. Nature Biomedical Engineering 10:245-258. https://doi.org/10.1038/s41551-025-01463-z
  - Use in Discussion as a biomedical example of agentic experimental design and human-AI collaboration.
  - Relevant because it frames agents as co-pilots and automated planners; pair with Galaxy Notebooks as infrastructure for documenting agent-authored analysis outputs.

- Mehandru N, Hall AK, Melnichenko O, Dubinina Y, Tsirulnikov D, Bamman D, Alaa A, Saponas S, Malladi VS. 2025. BioAgents: bridging the gap in bioinformatics analysis with multi-agent systems. Scientific Reports 15:39036. https://doi.org/10.1038/s41598-025-25919-z
  - Use in Discussion for agent-assisted bioinformatics specifically.
  - Good citation for claims that LLM agents are being applied to bioinformatics workflows and that tool versions, help documentation, missing data, and computational context remain practical issues.

- Bu D, Sun J, Li K, He Z, Huang W, Hu J, Zhang S, et al. 2026. Empowering AI data scientists using a multi-agent LLM framework with self-evolving capabilities for autonomous, tool-aware biomedical data analyses. Nature Biomedical Engineering. https://doi.org/10.1038/s41551-026-01634-6
  - **Unverified. Do not cite until a primary publisher page is located.** Search currently surfaces secondary aggregators rather than a Nature page.
  - If verified before submission, use cautiously as future-facing motivation that autonomous biomedical agents are moving toward tool-aware workflows.

- Wang L, Ma C, Feng X, et al. 2024. A survey on large language model based autonomous agents. Frontiers of Computer Science 18:186345. https://doi.org/10.1007/s11704-024-40231-1
  - Use only for a compact general-agent background sentence.
  - Avoid letting this paper pull the manuscript into generic LLM-agent taxonomy.

- Lu C, Lu C, Lange RT, Foerster J, Clune J, Ha D. 2024. The AI Scientist: towards fully automated open-ended scientific discovery. arXiv:2408.06292. https://arxiv.org/abs/2408.06292
  - Use sparingly in Introduction/Discussion as an example of the direction of travel: agents that generate experiments and papers.
  - Preprint; cite only for motivation and risk framing, not as settled evidence.

## Internal Project Sources

- `vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md`
  - Use to align implementation details: Page model reuse, `history_id`, `PageRevision.edit_source`, page-scoped chat, history-aware tools, revision/rollback behavior, and content pipeline.

- `vault/projects/history_markdown/gcc2026/HISTORY_NOTEBOOKS_EXECUTIVE_SUMMARY.md`
  - Use for the clearest internal articulation of the three authoring modes: human solo, human plus in-app agent, external agent via API.

- `vault/projects/history_markdown/gcc2026/ABSTRACT_CHATGPT.md`
  - Use only as framing contrast. It is agent-heavy; the journal paper should borrow the reproducibility-in-the-age-of-agents motivation but keep chat/AI as an authoring path rather than the central claim.

- `vault/papers/galaxy-notebooks/index.md`
  - Use for the paper's current central claim and target ladder.

- `vault/papers/galaxy-notebooks/outline.md`
  - Use for section placement: problem, design, authoring modes, narrative-to-workflow, graph confirmation, report continuity, evaluation.

## Citation Gaps To Fill

- A primary/archival citation for Galaxy built-in workflow reports. Current best sources are GTN and API docs; a peer-reviewed Galaxy update may mention workflow invocation reports, but this still needs exact confirmation before final submission.

- A direct citation for Galaxy Pages after the original 2010 paper. The 2010 Genome Biology paper is strong, but if there is a later Pages/report publication or Galaxy release note with scholarly status, it would help distinguish "old Pages" from "new history-attached notebooks."

- A concrete workflow-extraction citation from Galaxy histories to workflows. If this is mostly new implementation work, the manuscript should cite YesWorkflow/noWorkflow as conceptual neighbors and cite local implementation evidence, but it still needs a direct Galaxy-specific source if one exists.

- User-facing computational lab notebook literature outside Jupyter/R Markdown. Electronic lab notebooks and provenance-aware lab notebooks may give better language for "history-attached narrative" than the computational-notebook literature alone.

- Empirical evidence for analysis communication failures in biomedical papers. The reproducibility citations establish the general problem; the paper would be stronger with one or two sources showing that methods/reporting omissions specifically block reuse of bioinformatics analyses.

- AI-agent bioinformatics literature is moving quickly. Before submission, re-check 2025-2026 agent papers and prefer peer-reviewed versions over arXiv/preprints where possible.

- Verify or remove the Bu et al. 2026 AI data scientist reference. It is currently retained only as a candidate lead and should not be cited from the manuscript.
