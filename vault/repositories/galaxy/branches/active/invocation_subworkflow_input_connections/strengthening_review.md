# Fresh strengthening review

Nothing to add. No necessary in-scope code or prose task found.

The pitch establishes an observable problem before implementation: an accepted request produces an invocation that later fails, whereas the fix returns HTTP 400 identifying the saved graph error before creating run state. The baseline API evidence and four negative cases support that claim without depending on APIs introduced by the fix. The diff implements recursive validation before history creation and shares the runtime predicate; optional/defaulted positive controls match the stated compatibility boundary. Further generalized input validation would expand the approved motivation rather than strengthen this extraction.

Likely misreadings checked:

- **Scope:** reviewers might read “required input” as requiring every optional/defaulted input to be connected, or as comprehensive invocation-input validation. The highlighted sentence directly addresses both: “This checks the saved subworkflow connections; it does not require every optional input to be connected or add general invocation-input validation.” The table separately confirms false, zero and empty-text defaults remain accepted.
- **Audience:** callers might expect an invocation ID and inspect its later failure. The opening and before/after table identify an invocation-request/API change; the visible Risks paragraph explicitly says clients now receive HTTP 400 instead of an invocation ID. The highlighted saved-connections sentence also distinguishes graph validation from supplied invocation values. This is sufficient without another highlighted disclaimer.
- **Completeness:** the “Toward” opener could be mistaken for unsupported hedging. Context names the independent extraction and the highlighted boundary identifies the concrete subset; the tests demonstrate that subset, not the entirety of issue #20900. Keeping “Toward” is justified.

No additional development is needed to make the stated pitch persuasive. Preserve the fresh-check/CI evidence distinction when the owner finalizes the description; this reviewer performed no Git operations, tests, code edits or publication.
