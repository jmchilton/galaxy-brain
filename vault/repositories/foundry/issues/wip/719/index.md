# foundry#719 — template and draft-loop evals fail correct output

[Issue](https://github.com/galaxyproject/foundry/issues/719) · [branch](../../../branches/active/issue-719-eval-draft-fixes/index.md) · [PR #720](https://github.com/galaxyproject/foundry/pull/720)

Opened 2026-10-25 with `roadmap/off`, `agent/implement`. Found independently by the nf-core/smrnaseq and nf-core/funcscan nextflow-to-galaxy runs: the template eval checked drafts with plain `gxwf validate`, and the draft-loop eval grepped the whole draft for TODOs mid-loop. PR takes funcscan's fixes (`bf4162cd`, `3308d1e5`).
