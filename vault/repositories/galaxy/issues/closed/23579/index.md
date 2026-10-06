# galaxy#23579 — PostgreSQL annotation B-tree indexes reject long text and may cause workflow-import 500s

[Issue](https://github.com/galaxyproject/galaxy/issues/23579)

Branch `issue_23579_annotation_indexes` — PostgreSQL B-tree indexes on annotation text reject long values and can 500 workflow imports; state: mvdbeek agreed to dropping the indexes plus a 64KB annotation limit, both committed, rebased on `9ba67b81398`, pushed to `jmchilton`; PR description ready in `vault/agents/gx_branches/old/issue_23579_annotation_indexes_pr_description.md`, awaiting CI before opening.

Closed 2026-09-21.
