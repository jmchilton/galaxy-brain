# Planemo #1740 — Invocation output collection sampling

[GitHub issue](https://github.com/galaxyproject/planemo/issues/1740) · [Published problem and design context](issue.md) · [Reproduction script](reproduce.py) · [Master evidence](reproduction_master.json) · [#1724 evidence](reproduction_pr1724.json)

Status: `needs_decision`, open and unassigned. Filed 2026-10-11 at John’s request after reproducing the existing `definition_style="outputs"`/`"output"` mismatch identified in [Marius’s #1724 review](https://github.com/galaxyproject/planemo/pull/1724#pullrequestreview-5478947695).

The real `output_stubs_for_workflow(..., from_invocation=True)` path downloads every leaf because its invalid plural mode bypasses the helper’s sampling branch while still using output formatting. A three-member flat list produces three output downloads; a two-pair nested collection produces four. Explicit singular output mode produces one in each case. Inputs retain all three/four datasets. These observations match on master `48725d692ee3371ace6a042b70ec3dc84a3b0ba6` and #1724 head `4ba96f396f0a1e870322b16213fe0022a16c89d3`.

History confirms the mismatch originated in `6a9eebc59207fa0cb77a4b6f394db09dcc1df028` in June 2022; the preceding generator explicitly selected the first output element. It is independent of #1724’s sanitization/collision changes. The mismatch causes extra downloads and generated fixtures; this reproduction does not demonstrate wrong data contents.

John’s next decision: choose and document output sampling cardinality, including whether sampled paired collections should retain both mates. A spelling-only fix narrows generated assertion coverage and samples only one mate, so do not change it blindly. A fix should validate the mode, preserve all inputs, and cover multi-element, nested/paired and empty collections through the invocation generation path. Existing helper tests only pass the singular mode and use one-element collections.

No implementation branch is open. The script uses real Planemo entry points with controlled API responses and a download recorder; it starts no live Galaxy and downloads no actual datasets. Reproduce in an environment with Planemo’s dependencies with `python reproduce.py /path/to/planemo-checkout`.

[#1724 review record](../../../reviews/active/1724/index.md) · [October follow-up ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md)
