# original_scope

Branch `issue_24220_drop_collection_matching_26.0_alt_original_scope` (`27146fc2ef7`): the hardened #24220 fix before the re-scope. Same stack on `issue_24218_can_map_over_parity_26.0`.

Differs from the parent by lacking two `canAcceptSrc` fixes the scope evaluation recommended: column-definition check only on direct (not map-over) drops onto `sample_sheet` inputs, and treating an empty `collectionTypes` as no constraint. Its baseline commit also lacks the column-definition baseline tests.
