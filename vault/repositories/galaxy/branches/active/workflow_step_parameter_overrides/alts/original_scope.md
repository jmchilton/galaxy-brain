# Alt: original_scope

Branch `workflow_step_parameter_overrides_alt_original_scope`, head `20c7b0feaea`, on `46db8f9d5b6`. It is the branch as first hardened, before the re-scope.

## What it does

The branch as first hardened. It has a bottom refactor commit, the 3-commit API series that can be extracted onto `dev`, the list picker with a pop-out workflow view, "Rerun with this changed", and E2E tests. The first-round debriefs are in [earlier_drafts/1/](../earlier_drafts/1/).

## How it differs from the parent

The [scope evaluation](../earlier_drafts/1/scope_evaluation.md) recommended a modest expansion, which the parent adds:

- Server validation errors are mapped onto the matching override cards. On this alt they appear only in the general submission alert.
- The #24177 legacy-rerun alert is reworded. On this alt it still says the simplified form doesn't support step parameters.
