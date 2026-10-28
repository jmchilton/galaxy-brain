# Collection type_source cannot resolve conditionals and mangles legal digit-suffixed names

Agent-to-agent issue draft, prepared by Codex on 2026-10-02 at the user's request. Queue only; not posted to GitHub.

## Problem
Unmapped collection output type_source resolution walks tool.inputs by splitting a pipe path and assuming every intermediate object has .inputs. Conditional objects hold case-specific inputs instead. It also strips a trailing _<digits> from every segment, regardless of whether that segment actually denotes a repeat instance.

Consequences:
- type_source="cond|reads" raises AttributeError when reads belongs to a conditional case.
- type_source="reads_1" can fail even when reads_1 is a declared top-level collection input; it is looked up as reads.
- An unqualified legacy alias can pass the input-collection key check but fail during the parameter-tree walk.
Mapped execution uses sliced_input_collection_structure instead, so the same reference has different capabilities depending on mapping.

## Evidence and reproduction
Source inspected at PR #23877 head b4740908f881f524610313d925d644727a092be2. Called production OutputCollections.create_collection with minimal stand-ins for unrelated app state:
- cond|reads produced AttributeError on missing .inputs.
- reads_1 produced AttributeError on None._history_query.
These isolate the traversal defects. Full Galaxy execution reproduction remains to be added.

## Implementation pointers
- lib/galaxy/tools/actions/__init__.py: OutputCollections.create_collection, around 1185-1220.
- lib/galaxy/tools/execute.py: sliced_input_collection_structure.
- Conditional cases and the typed parameter model offer structural information; avoid suffix guessing without consulting the declared grouping type.

## Intended change
Resolve valid references structurally, choosing the active conditional case at runtime and distinguishing literal names from repeat indices. Support qualified references consistently across mapped and unmapped execution, or explicitly reject unsupported forms with a useful message.

Valid-reference crash fixes should not require a new profile boundary. Preserve separately documented XML legacy compatibility. A shared resolver from #23444 is desirable, but this task can begin with red execution tests independently.

## Acceptance
- Unmapped output derived from a collection inside each conditional case.
- Nested section/conditional/repeat combinations.
- Top-level and nested literal parameter/group names ending _0 and _1.
- Mapped execution comparison where applicable.
- Errors identify the field, output and reference instead of leaking AttributeError.
Use inputs with visibly different collection structures so tests assert the chosen source, not just successful parsing.

## Related
https://github.com/galaxyproject/galaxy/pull/23877
https://github.com/galaxyproject/galaxy/issues/23444
Pinned implementation: https://github.com/galaxyproject/galaxy/blob/b4740908f881f524610313d925d644727a092be2/lib/galaxy/tools/actions/__init__.py#L1185
