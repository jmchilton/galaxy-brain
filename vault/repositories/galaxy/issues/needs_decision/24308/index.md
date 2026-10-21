# galaxy#24308 — `type_source` output collections can get a different type than the input the tool received

[Issue](https://github.com/galaxyproject/galaxy/issues/24308) · [proposal](proposal.md) · [debrief](debrief.md) · [source draft](issue_draft.md)

Filed 2026-10-20, assigned to jmchilton. Came out of #24303 research (branch `issue_24303_collection_type_prefix_26.2`, which already fixes the subworkflow-export path).

Reproduced on dev `2cca8565861`: direct `list:list` into `list,list:list` → `list` output; `list:paired` mapped over a `paired_or_unpaired` input → implicit `list:paired` with `paired_or_unpaired` elements. Editor rule from code only. Latent for in-tree tools.

Decide: mapped outputs take the concrete subcollection type (flips one assertion in open PR #24227) — confirm, or land #24227 first and adjust.

Next after decision: red API tests (repro tools in debrief), then the shared server helper.

#24303 branch Codex round 2 (2026-10-20): `type_prefix` inherits both divergences. Mapped `paired_or_unpaired` + prefix gives an implicit `list:list:paired` with `list:paired_or_unpaired` children. The editor shows `list:paired_or_unpaired` for a `paired` connected with a prefix, then rejects a valid downstream `paired` connection. See `vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/codex_review.md`.
