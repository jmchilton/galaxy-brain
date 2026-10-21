# faqs/galaxy/analysis_differential_expression_help.md — 26.2, text review

GTN `45d4932d33`. Tool labels checked on usegalaxy.org (DESeq2 `2.11.40.8+galaxy4`, Remove beginning).

- **"removing `.N` from all inputs" links to a site search for "olympics".** It works only by luck
  of the search. Link `topics/introduction/tutorials/data-manipulation-olympics/tutorial.html`
  directly, as `reference_genomes_custom_genomes.md` does.
- **"applies to most if not all Bioconductor tools".** Half the list isn't Bioconductor
  (StringTie, featureCounts, HTSeq-count, Salmon, Kallisto, Sailfish). Suggest "RNA-seq
  quantification and differential expression tools".
- Typos: "Kalisto" (twice) → Kallisto; "HTseq-clip" → htseq-clip; "Featurecounts" →
  featureCounts; "must all contain".

DESeq2's **Files have header?** label and **Remove beginning of a file** still match. The
seqanswers link returns 403 to scripts (likely bot blocking); not confirmed dead.
