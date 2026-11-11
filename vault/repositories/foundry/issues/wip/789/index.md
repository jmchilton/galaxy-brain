---
related_records: foundry/branches/issue-789-readme-no-archeology
---
# foundry#789: Maturation README talks about failed attempts (archeology)

[Issue](https://github.com/galaxyproject/foundry/issues/789) · branch [`issue-789-readme-no-archeology`](../../../branches/active/issue-789-readme-no-archeology/index.md)

From martenson's review of the first IWC maturation, [iwc-lab#4](https://github.com/galaxyproject/iwc-lab/pull/4). The README there includes earlier invocations, failed medaka runs, local-Planemo emulation failures, a "History" block and validator notes for reviewers. John said to skip the label process (2026-11-11). Labels on GitHub: `priority/mvp`, `roadmap/off`, plus `work/in-progress` added at pickup.

Root cause: step 5 of `mature-galaxy-workflow-for-iwc` asks for "evidenced purpose, valid inputs, and expected outputs" but sets no limit on scope. Nothing says where development history goes, so the run evidence ended up in the README.
