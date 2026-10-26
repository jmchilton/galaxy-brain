# foundry#731 — implement-galaxy-workflow-test: cross-check overclaims collection/datatype; output cardinality not traced

[Issue](https://github.com/galaxyproject/foundry/issues/731) · [branch](../../../branches/active/issue-731-igwt-cardinality-trace/index.md)

Labels `roadmap/off`, `priority/mvp`, `agent/implement`. Raised by the ncbi/egapx `/test-pipeline nextflow-to-galaxy` run (ledger `igwt-no-output-cardinality-trace`, `igwt-eval-crosscheck-overclaims-shape-datatype`).

## Findings

- Foundry-owned Mold/eval wording + procedure gap. Upstream half (cross-check gaining shape/datatype) is jmchilton/galaxy-tool-util-ts#210; not implemented here, Foundry fix doesn't wait on it.

## Next

Implement on branch `issue-731-igwt-cardinality-trace`.
