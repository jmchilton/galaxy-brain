Recommend preserving the scope as implemented and handing this branch off as READY. Restoring tracked `lib/` inclusion filters in eight workflows and Selenium exclusions in seventeen workflows repairs both consequences of the same path-alias replacement in #23999. The independent reviews recommend no scope changes; no additional runtime code, repository tests, UI work, or source migration is needed for this repair.

## As implemented: repair inclusions and exclusions

Keep the 59 additive event-filter patterns across 25 workflows, alongside existing package patterns. This restores scheduling on current tracked sources and dependencies and avoids newly introduced unrelated runs for Selenium-only changes, while preserving package metadata triggers and runtime configuration.

| Pros | Cons |
| --- | --- |
| • Covers both missed runs and unnecessary runs from the reported regression.<br>• Retains compatibility with the planned source move.<br>• Uses existing workflow configuration without new infrastructure. | • Touches 25 workflow files.<br>• Both layouts remain in filters until the source move revisits them. |

## Narrower: restore only the eight inclusion workflows

Restore the source and dependency triggers that silently stopped running, leaving Selenium exclusion repairs for later. This would address the highest-impact symptom but omit the related inverse regression already identified in the initial recommendation and independently reviewed.

| Pros | Cons |
| --- | --- |
| • Smaller file count.<br>• Repairs the missing validation coverage. | • Leaves unnecessary unrelated CI runs on Selenium-only edits.<br>• Splits one straightforward cause into separate maintenance work. |

## Broader: add permanent filter regression tooling

Add a repository-owned filter matcher and scheduling fixtures, or a workflow linting system, to guard future layout migrations. Existing validation already checks all 59 restored patterns against actual tracked paths and demonstrates the symlink behavior; no reviewer requested a new test system.

| Pros | Cons |
| --- | --- |
| • Could help future changes detect path drift.<br>• Makes migration expectations executable in the repository. | • Adds tooling ownership and fixture maintenance beyond this repair.<br>• A local matcher still cannot prove GitHub service scheduling.<br>• Requires separate decisions about the intended test infrastructure. |

## Broader: perform the source move or redesign trigger architecture

Move sources into packages now, or centralize change detection and regenerate workflow triggers. Either changes the project layout or CI architecture substantially and exceeds the user's request to fix the merged filter regression.

| Pros | Cons |
| --- | --- |
| • Could eventually eliminate dual-layout filters.<br>• A shared system could reduce repeated declarations. | • Introduces a separate migration and its validation burden.<br>• Delays restoration of source-only CI coverage.<br>• No implementation review identified a need for this expansion. |

## Handoff implications

The current independent normal and code-quality reviews and recorded parsed-filter validation apply to the recommended unchanged scope. No additional validation is required for scope evaluation itself. Future GitHub runs remain pending and workflow-file-triggered runs alone cannot demonstrate source-only scheduling; that limitation is already documented in validation.md. No new test code or UI changes were introduced, so test-challenge, E2E-polish and screenshot processes do not apply.
