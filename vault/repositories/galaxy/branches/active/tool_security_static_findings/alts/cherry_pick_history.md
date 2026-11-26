# Alt: cherry-pick history

`tool_security_static_findings_alt_cherry_pick_history` at `d4ae281e442`: the branch before the history rewrite. It has 101 commits on `origin/dev` `ce63095e7a8`: 63 by mvdbeek and 38 by John. They are the `cherry-pick -x` port from `tool_security_review_spec` `d5f7cb05e91` plus the hardening and re-scope commits.

The tree is identical to the parent's. Only the history differs:

- The parent squashes it into 6 commits.
- Many of the alt's messages describe runtime enforcement that the port dropped.
- Some of the alt's commits add code that later commits remove.
- Two of its commits carry a misleading "Baseline tests" prefix.

Keep the alt for per-commit archaeology, or to re-port single commits.
