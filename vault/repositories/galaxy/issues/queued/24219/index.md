# galaxy#24219 — Tool form drops a selected collection that isn't on the first option page when the form refreshes

[Issue](https://github.com/galaxyproject/galaxy/issues/24219)

Filed 2026-10-17 from [proposal](proposal.md) ([source draft](raw.md), [debrief](debrief.md)). Assigned to jmchilton.

Visible in-history HDCA outside the page never reaches `pinned` (both `data_collection` and `data` inputs); client falls back to first option. Reproduced by a failing API test (`limit: 1`). Not fixed on [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode). Watch: id_src keep-key collapses direct + map-over entries. Affects 26.1+. Sibling of #24221.

Next: red API test from proposal, then shared server helper pinning live selected HDCAs.
