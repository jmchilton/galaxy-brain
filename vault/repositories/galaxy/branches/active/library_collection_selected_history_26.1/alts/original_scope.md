# original_scope

Branch `library_collection_selected_history_26.1_alt_original_scope` (`c57876ad7b5`, on `jmchilton`): the branch before the scope evaluation's expansion. It has three commits: baseline tests, the refactor of the library dialog, and the fix that makes collection creators build in their `historyId` and the library dialog switch to the picked history.

The parent adds `fc218167da1` (originally `5857b17da80`): `ListWizard` (Auto/Advanced Build List) builds in the history the selection came from, with a cross-backend E2E. Without that commit, Build Dataset List and the wizard entries in the same selection menu disagree on a non-current history's view page.
