Recommend retaining the eight-test batch64 scope, pinned from `846fdc7466ed145ef8bab8fdf76a10bdb2c0476e` to integrated `98e8e836455918807d7c2c7c09a8ca64be807f02`. The completed changes preserve existing scenarios and assertions while improving native mounting, types and ownership; check-style-imports adds a demonstrated aggregate-report blind-spot check. No production, shared helper, dependency or documentation change is needed.

## As implemented

Eight originators span JobsTable, VisualizationHeader, ChangesIndicator, RegisterForm, GCheckbox, ToolBoxSearch, check-style-imports and fetchModels. Local helpers remain local; real component/store/event boundaries are retained. Search's explicit recent-history defaults remove a reproduced pristine shuffled failure, while an unknown recent ID makes formerly incidental filtering coverage intentional.

| Pros | Cons |
| --- | --- |
| Preserves each originator's behavior contracts and measures source locations, including actual external shared UI where relevant. | Eight files require separate author and independent review evidence. |
| Test ownership prevents detached wrappers, timers, stores and attached DOM targets from persisting. | Main and supplemental UI coverage counts must be kept separate. |

## Contract to purely cosmetic edits

Limit changes to names, required lookups and casts while retaining legacy mounting and implicit persistent history. This would reduce the diff but leave the reproduced Search ordering failure and resource ownership problems unresolved.

| Pros | Cons |
| --- | --- |
| Smaller immediate diffs. | Leaves known test isolation problems and fabricated public-instance typing. |
| Fewer fixture decisions. | Does not meet the loop's readability and real-boundary objectives. |

## Expand into production/schema, shared fixtures or E2E

Repair generated fetch schemas, redesign shared mounting/persistence helpers or add browser tests across these components. Those are separate workstreams: the batch proves existing component/utility contracts without changing application behavior, and targeted fixture typing/ownership suffices.

| Pros | Cons |
| --- | --- |
| Could address broad schema or fixture concerns in a dedicated follow-up. | Expands beyond the authorized originators and introduces production/support risk. |
| Browser evidence could validate future rendering changes. | No rendered change exists here to justify browser/screenshot cost. |

## Screenshots

Screenshots are not relevant for this change. The shared screenshot instructions and E2E-writing research were considered: every changed file is a unit-test originator, no Vue template/style or browser screenshot test is modified, and the same rendered expectations remain. No screenshot capture, E2E modification or screenshot artifact is warranted.

Final diff contains exactly these eight test files and no production, shared helper, supporting, dependency or documentation edits. Original65 cases/179 intended checks become66 cases/180 checks solely through the aggregate style-import case. FetchModels retains seven cases/36 executed checks with13 files/399 covered source locations exact; native fixture/type changes preserve omission and round-trip inputs. Independent Models normal review and integrated full types/all-eight-suite gates are pending in this historical scope snapshot; neither changes the scope or screenshot applicability conclusion.
