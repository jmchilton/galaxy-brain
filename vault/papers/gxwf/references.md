# References

Canonical bibliography for the gxwf manuscript. The manuscript's inline citations use short `[Author YYYY]` keys; this file holds the full BibTeX records they resolve to. Software whose canonical citable form is a repository is recorded with `@misc` entries and flagged in the manuscript prose so the absence of a peer-reviewed reference is visible to readers.

## Status Notes

Honest gaps to surface in cover letter or methods footnote:

- **gxformat2, IWC, Cromwell/womtool, miniwdl, Sprocket, nf-schema, OpenWDL spec** — no peer-reviewed publication exists at time of writing. Cited as repositories.
- **TRS** — specification only; cited alongside Dockstore (O'Connor 2017) which serves as the peer-reviewed companion for the protocol.
- **BioAgents 2025** — author byline and exact venue record require verification before submission.
- **Xin 2024 (BIA)** — preprint only; verify whether a peer-reviewed form has appeared before submission.

## BibTeX Entries

```bibtex
@article{blankenberg2014toolshed,
  author  = {Blankenberg, Daniel and Von Kuster, Greg and Bouvier, Emil and Baker, Dannon and Afgan, Enis and Stoler, Nicholas and Taylor, James and Nekrutenko, Anton},
  title   = {Dissemination of scientific software with {Galaxy} {ToolShed}},
  journal = {Genome Biology},
  volume  = {15},
  pages   = {403},
  year    = {2014},
  doi     = {10.1186/s13059-014-0403-5},
  pmid    = {25001293}
}

@article{bray2023planemo,
  author  = {Bray, Simon A. and Chilton, John and Bernt, Matthias and Soranzo, Nicola and van den Beek, Marius and Batut, B{\'e}r{\'e}nice and Rasche, Helena and {\v C}ech, Martin and Cock, Peter J. A. and Gr{\"u}ning, Bj{\"o}rn and Nekrutenko, Anton},
  title   = {The {Planemo} toolkit for developing, deploying, and executing scientific data analyses in {Galaxy} and beyond},
  journal = {Genome Research},
  volume  = {33},
  number  = {2},
  pages   = {261--268},
  year    = {2023},
  doi     = {10.1101/gr.276963.122},
  pmid    = {36828587}
}

@misc{cromwell,
  author       = {{Broad Institute}},
  title        = {{Cromwell}: A Workflow Management System for {WDL} and {CWL}},
  howpublished = {\url{https://github.com/broadinstitute/cromwell}}
}

@article{crusoe2022cwl,
  author  = {Crusoe, Michael R. and Abeln, Sanne and Iosup, Alexandru and Amstutz, Peter and Chilton, John and Tijani{\'c}, Neboj{\v s}a and M{\'e}nager, Herv{\'e} and Soiland-Reyes, Stian and Gavrilovi{\'c}, Bogdan and Goble, Carole and {The CWL Community}},
  title   = {Methods Included: Standardizing Computational Reuse and Portability with the {Common Workflow Language}},
  journal = {Communications of the ACM},
  volume  = {65},
  number  = {6},
  pages   = {54--63},
  year    = {2022},
  doi     = {10.1145/3486897}
}

@article{ditommaso2017nextflow,
  author  = {Di Tommaso, Paolo and Chatzou, Maria and Floden, Evan W. and Prieto Barja, Pablo and Palumbo, Emilio and Notredame, Cedric},
  title   = {{Nextflow} enables reproducible computational workflows},
  journal = {Nature Biotechnology},
  volume  = {35},
  number  = {4},
  pages   = {316--319},
  year    = {2017},
  doi     = {10.1038/nbt.3820},
  pmid    = {28398311}
}

@misc{ga4gh_trs,
  author       = {{Global Alliance for Genomics and Health}},
  title        = {Tool Registry Service ({TRS}) {API} Specification},
  howpublished = {\url{https://github.com/ga4gh/tool-registry-service-schemas}}
}

@article{galaxy2024,
  author  = {{The Galaxy Community}},
  title   = {The {Galaxy} platform for accessible, reproducible, and collaborative data analyses: 2024 update},
  journal = {Nucleic Acids Research},
  volume  = {52},
  number  = {W1},
  pages   = {W83--W94},
  year    = {2024},
  doi     = {10.1093/nar/gkae410},
  pmid    = {38769056}
}

@misc{gxformat2,
  author       = {Chilton, John and {Galaxy Project contributors}},
  title        = {{gxformat2}: {Galaxy} {Workflow} {Format} 2},
  howpublished = {\url{https://github.com/galaxyproject/gxformat2}},
  note         = {Documentation at \url{https://galaxyproject.github.io/gxformat2/}}
}

@article{hiltemann2023gtn,
  author  = {Hiltemann, Saskia and Rasche, Helena and Gladman, Simon and Hotz, Hans-Rudolf and Larivi{\`e}re, Delphine and Blankenberg, Daniel and others},
  title   = {{Galaxy} Training: A powerful framework for teaching!},
  journal = {PLOS Computational Biology},
  volume  = {19},
  number  = {1},
  pages   = {e1010752},
  year    = {2023},
  doi     = {10.1371/journal.pcbi.1010752},
  pmid    = {36622853}
}

@misc{iwc,
  author       = {{Intergalactic Workflow Commission}},
  title        = {{IWC}: A curated library of {Galaxy} workflows},
  howpublished = {\url{https://github.com/galaxyproject/iwc}}
}

@misc{lsp,
  author       = {{Microsoft Corporation}},
  title        = {Language Server Protocol Specification},
  howpublished = {\url{https://microsoft.github.io/language-server-protocol/}}
}

@misc{miniwdl,
  author       = {Lin, Mike and {Chan Zuckerberg Initiative contributors}},
  title        = {{miniwdl}: {Workflow Description Language} developer tools and local runner},
  howpublished = {\url{https://github.com/chanzuckerberg/miniwdl}}
}

@article{molder2021snakemake,
  author  = {M{\"o}lder, Felix and Jablonski, Kim Philipp and Letcher, Brice and Hall, Michael B. and Tomkins-Tinch, Christopher H. and Sochat, Vanessa and Forster, Jan and Lee, Soohyun and Twardziok, Sven O. and Kanitz, Alexander and Wilm, Andreas and Holtgrewe, Manuel and Rahmann, Sven and Nahnsen, Sven and K{\"o}ster, Johannes},
  title   = {Sustainable data analysis with {Snakemake}},
  journal = {F1000Research},
  volume  = {10},
  pages   = {33},
  year    = {2021},
  doi     = {10.12688/f1000research.29032.2},
  pmid    = {34035898}
}

@misc{monaco,
  author       = {{Microsoft Corporation}},
  title        = {{Monaco Editor}: The code editor that powers {VS Code}, in the browser},
  howpublished = {\url{https://github.com/microsoft/monaco-editor}}
}

@misc{nfschema,
  author       = {{Seqera Labs and nf-core community}},
  title        = {{nf-schema}: Schema validation for {Nextflow} pipelines},
  howpublished = {\url{https://github.com/nextflow-io/nf-schema}}
}

@article{oconnor2017dockstore,
  author  = {O'Connor, Brian D. and Yuen, Denis and Chung, Vincent and Duncan, Andrew G. and Liu, Xiang Kun and Patricia, Janice and Paten, Benedict and Stein, Lincoln and Ferretti, Vincent},
  title   = {The {Dockstore}: enabling modular, community-focused sharing of {Docker}-based genomics tools and workflows},
  journal = {F1000Research},
  volume  = {6},
  pages   = {52},
  year    = {2017},
  doi     = {10.12688/f1000research.10137.1},
  pmid    = {28344774}
}

@misc{openwdl,
  author       = {{OpenWDL community}},
  title        = {{Workflow Description Language (WDL)} Specification},
  howpublished = {\url{https://github.com/openwdl/wdl}}
}

@misc{snakemake_lint,
  author       = {{Snakemake contributors}},
  title        = {{Snakemake} best practices and linter documentation},
  howpublished = {\url{https://snakemake.readthedocs.io/en/stable/snakefiles/best_practices.html}}
}

@misc{sprocket,
  author       = {{St. Jude Rust Labs}},
  title        = {{Sprocket}: A bioinformatics workflow engine for the {Workflow Description Language (WDL)}},
  howpublished = {\url{https://github.com/stjude-rust-labs/sprocket}}
}
```

## Pending / Under Verification

```bibtex
@article{bioagents2025,
  author  = {TBD},
  title   = {{BioAgents}: Bridging the gap in bioinformatics analysis with multi-agent systems},
  journal = {Scientific Reports},
  year    = {2025},
  note    = {Citation pending verification of authors, volume, pages, and DOI against final journal record.}
}

@article{xin2024bia,
  author  = {Xin, Qi and others},
  title   = {{BioInformatics Agent (BIA)}: Unleashing the Power of Large Language Models to Reshape Bioinformatics Workflow},
  journal = {bioRxiv},
  year    = {2024},
  doi     = {10.1101/2024.05.22.595240},
  note    = {Preprint. Verify final published form before submission if peer-reviewed version has appeared.}
}
```

## Optional Companion References

Not currently cited but worth keeping in scope:

- Goecks J, Nekrutenko A, Taylor J, and the Galaxy Team. *Galaxy: a comprehensive approach for supporting accessible, reproducible, and transparent computational research in the life sciences.* Genome Biology 11:R86 (2010). doi:10.1186/gb-2010-11-8-r86. *The foundational Galaxy paper; cite alongside Galaxy Community 2024 only if a reviewer specifically requests historical grounding.*
- Köster J, Rahmann S. *Snakemake — a scalable bioinformatics workflow engine.* Bioinformatics 28(19):2520–2522 (2012). doi:10.1093/bioinformatics/bts480. *The original Snakemake paper; Mölder 2021 is the current canonical reference, but include this if a reviewer prefers both.*
- Ewels PA, et al. *The nf-core framework for community-curated bioinformatics pipelines.* Nature Biotechnology 38:276–278 (2020). doi:10.1038/s41587-020-0439-x. *Cite if the discussion of nf-core's module collection in the Validation Across Workflow Systems section grows.*
- WorkflowHub — citation in flux; see Goble C, Soiland-Reyes S, et al. work from 2021–2025. Track this for the IWC discussion if the manuscript adds a reference to cross-registry workflow exchange.
