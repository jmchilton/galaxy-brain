# galaxy#24221 — Paged collection options lose a collection's "map over" entry

[Issue](https://github.com/galaxyproject/galaxy/issues/24221)

Filed 2026-10-17 from [proposal](proposal.md) ([source draft](issue_draft.md), [debrief](debrief.md)). Assigned to jmchilton.

Paging (#22643, 26.1) breaks mid-row and `has_more` counts rows; client merges dedupe by id+src. Hits Extract dataset. Needs server + client halves. Fixed on [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode) (`76750495c46`, `05907884de9`, `826a64a9784`, `562ce4f58fa`). Backport target release_26.1. Sibling of #24219.

Backport: [issue_24221_paged_map_over_options_26.1](../../../branches/active/issue_24221_paged_map_over_options_26.1/index.md).
