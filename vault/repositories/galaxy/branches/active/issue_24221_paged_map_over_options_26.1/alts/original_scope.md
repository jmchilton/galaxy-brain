# original_scope

Branch: [`issue_24221_paged_map_over_options_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24221_paged_map_over_options_26.1_alt_original_scope) at `e4a0f756c63`.

The #24221 fix as filed: the server finishes a two-entry row on one page, and the client merges pages by src+id+map_over_type. Parent adds a commit that makes the map-over row selectable and labelled on its own. Without it, 26.1 lists the map-over row but it can't be picked (same select key and label as the direct row).
