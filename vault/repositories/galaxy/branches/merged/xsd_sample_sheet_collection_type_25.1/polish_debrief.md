# Polish — 2026-10-17

Status: `branches_ready_for_final_review`; exactly one strengthening round returned nothing to add. No approval SHA/title choice, no PR opened.

Base release_25.1 at `2ae14b0eac33c47cc87cc8941cae6270a3c10a01`; final published head `5d35c8c7db348d5c9e2850876a7145ccb06976a8`. Fetch/rebase confirmed already current; no code change, new commit or fork push needed. Preserved John's explicit kept-history decision and lint-only testing scope.

Fresh independent general checklist passes all agent-answerable items. Human-read remains unchecked. Workflow checklist does not apply: no workflow editor/scheduler/invocation/mapping/gxformat2 changes. Declaration-only converter caveat is explicit in the description.

Fresh lint verification used the same 281 selected XML tools and load_tool -> xmllint macro expansion as scripts/validate_tools.sh, without dependency-installing common_startup. Base XSD fails exactly the real sample_sheet_to_tabular input declaration; branch XSD passes 281/281. Added core tools are data_fetch and sample_sheet_to_tabular. XML syntax, sh -n, ShellCheck and git diff --check pass. Local script/log: /tmp/xsd-sample-sheet-polish-lint.{py,log}. No runtime conversion or browser coverage claimed.

Read Galaxy label definitions and labeler. Recommended kind/bug, area/tool-framework and area/dataset-collections; bot matches area/tool-framework from schema/core tool paths. Collection syntax is central; generic testing labels are unnecessary. Three release-prefixed titles prepared. Description includes original-scope alternative and merge-forward instructions for issue_23978_parameter_tools_xsd.

Final-head fork CI snapshot: 22 runs, 17 queued, 4 pending and 1 skipped; no observed failures. Relevant CI validation remains pending. Local lint evidence is separate. Vault validation: 124 files, 0 errors, 15 advisory warnings. [Description](pr_description.md) · [Titles](pr_titles.md) · [Labels](pr_tags.md) · [Checklist](checklist_evaluation.md) · [One strengthening review](strengthening_review.md).

Human read-through/title choice remain for John. No approval assigned; no PR, review, comment or labels posted to GitHub. Tracking updates synced to galaxy-brain main.
