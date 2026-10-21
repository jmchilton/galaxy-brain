# alt: original_scope

Branch `issue_24218_can_map_over_parity_26.0_alt_original_scope` (`d45d2fdb3bc`, on `jmchilton`).

Client-only fix: `canMapOver` rule order mirrors server `has_subcollections_of_type`, plus `getCollectionTypeFromInput` resolved in server order. Parent adds `d29206dcd71`: `:` boundary on the compound `X:paired_or_unpaired` higher-rank suffix check on both client and server (`type_description.py`), so `paired_or_unpaired` / `list:paired_or_unpaired` no longer map over `paired:paired_or_unpaired`. Use the alt if a server change is unwanted on 26.0.
