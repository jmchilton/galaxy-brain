# Polishing checklist — 2026-10-13

Reviewed independently against `0d7309fa5a5...debd555d9cd`; no blockers. The human-read item remains unchecked for John.

| Item | Answer and evidence |
| --- | --- |
| What does the user see when it fails? | Browser tests report mismatched cells or query values, or time out waiting for collection mode. No production behavior changes. |
| Is the diff free of unrelated or stale generated changes? | Yes! |
| Are unit tests not just testing the literal implementation? | Yes. Browser tests compare visible state with workbook-derived row contents, identifiers, pair ordering, and exact query parameters. |
| Are the comments free of excess archeology? | Yes. New comments explain indexing and virtualization constraints. |
| If comments describe previous implementations or bugs, what purpose do they serve? | N/A. |
| Which existing workflows change behavior? | None; only tests and shared navigation helpers change. |
| Who hits this in practice and what is the evidence? | Workbook import maintainers; recorded deliberate mutations break the corresponding new assertions. |
| Were simpler or existing approaches considered? | The helper reuses `press(..., element=...)`; direct selectors cannot read horizontally virtualized columns. |

The workflow checklist is included conservatively because the scope guidance names collection mapping. These changes do not alter workflow execution.

Collection-name visibility is a valid mode marker for these fixtures because none maps a collection-name column. The helper reads rendered rows only, explicitly appropriate for the small six- and twelve-row examples.
