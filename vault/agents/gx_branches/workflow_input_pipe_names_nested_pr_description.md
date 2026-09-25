# Reserve pipes in workflow input names and upgrade nested input interfaces

Galaxy uses `|` to delimit nested input paths. This change rejects pipe-containing
workflow input names on import and update, and offers deterministic editor-time
replacement of legacy pipes with underscores, with collision-safe suffixes.
Older data-input names stored in tool state are also recognized.

For legacy subworkflows, the parent step's input interface and connection keys
are remapped to the replacement names. Referenced subworkflows are copied to
hidden upgraded workflows before changing labels, leaving the originals intact.

Unlike the original proposal, this version does not rewrite `when` expressions
or any other expression text. Editor messages and save-time logs call for manual
review when a renamed nested interface has a `when` expression. References to an
old input name must be repaired manually before running the upgraded workflow.
This is a limited interface migration, not an automatic semantic migration.

## Tests

- Input-name validation, collision handling, and legacy tool-state coverage.
- Editor remapping of nested interfaces and input connections.
- Stored-subworkflow copy behavior and both `input_connections` and gxformat2
  `in` remapping, with original workflow labels preserved.
- Unchanged `when` text and manual-review upgrade messages/logs.
- Retained API regressions for invalid names on update and nested import.
- Local focused unit tests pass; fork CI and the API regressions have not been
  rerun for this comparison branch.

## How to test the changes?

- [x] I have included appropriate automated tests.

## License

- [x] I agree to license these and all my past contributions to the core Galaxy
  codebase under the MIT license.
