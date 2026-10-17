# Codex review (re-harden)

Nothing acted on. Codex's one finding is the mapped-HDCA case already recorded under Follow-ups in index.md. It predates the branch: the HDCA renders as `<HistoryDatasetCollectionAssociation(...)>` on base too. A real fix needs a per-job replacement dict, which is new plumbing in `ToolModule.execute` and `tools/execute.py`, so it's out of scope here (also excluded by the first scope evaluation). Its other half follows from the same limit: the subworkflow pre-read skips HDCA members, so there's no FS-lag delay for mapped expression collections. That matters only once collections resolve at all.

<details><summary>Findings (codex exec, read-only, brief = issue + intended behavior only)</summary>

1. **P2, NEEDS-DECISION / known follow-up** (`run.py:633`, `run.py:786`). A parent expression tool that is mapped produces an HDCA. `replace_expression_json_dataset` returns HDCAs unchanged, so the stored replacement is the model repr, and the pre-read doesn't check member files. Codex reproduced this in memory. Verified: `replace_expression_json_dataset` handles only `DatasetInstance` and `DatasetCollectionElement` (modules.py, 26.1 ~line 243).

Coverage: codex reviewed the full diff and surrounding scheduler code; it ran no API/framework suites.
</details>
