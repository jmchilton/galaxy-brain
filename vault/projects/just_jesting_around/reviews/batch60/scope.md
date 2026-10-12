# Batch 60 scope and screenshots

Recommendation: retain the implemented four-originator test scope with existing infrastructure reuse and no implementation changes.

## Implemented scope

Canonical base `bc3b5f773a059d2a19aa2be333d06ba53eaf246e` to `9b952a0b874` changes ToolRecommendation, ToolHelpRst, WorkflowInvocationStepHeader, and object-store InstanceDropdown tests only. The batch retains the original scenarios and checks while improving native mount typing, component/store/effect ownership, scoped DOM cleanup, readable setup, and complete request-body captures.

| Pros | Cons |
| --- | --- |
| Four focused reviewable originator commits; original UI and API contracts preserved; existing helpers reused | Does not extend unrelated feature coverage |

## Narrow to cosmetic edits

Retain original mount casts, handler resets, mutable setup, and manual teardown, changing only naming or formatting. This shrinks the diff but leaves concrete typing, lifecycle ownership, and request-observation issues that existing guidance covers.

| Pros | Cons |
| --- | --- |
| Smaller edits | Does not resolve the demonstrated problems driving these rewrites |

## Expand production behavior or shared helpers

Exercise additional recommendation ordering, tool rendering, popover interactions, or instance lifecycle operations, or introduce a new shared mount fixture. No review found a missing original contract or concrete supporting consumer requiring expansion; existing factories, server mocks, and mount helpers suffice.

| Pros | Cons |
| --- | --- |
| Could cover additional product conditions | Broadens implementation and review scope without evidence it is necessary to complete these four rewrites |

## Screenshots

Screenshots not relevant for this change. Applied the shared screenshot workflow and vault E2E-writing guidance: all four changed paths are unit tests, with no production component, template, styling, E2E screenshot, or screenshot capture changes. No rendered product change requires browser screenshot recording or modification.
