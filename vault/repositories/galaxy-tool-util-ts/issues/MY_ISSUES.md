GitHub state last refreshed: 2026-11-06. Issues here are not assigned to jmchilton by default.

## Waiting on John (`needs_decision`)

- [#213](https://github.com/jmchilton/galaxy-tool-util-ts/issues/213) — CLI state decode uses `onExcessProperty: "ignore"`, so unknown nested keys pass; decide: always reject vs `--strict-state` only. [notes](needs_decision/213/index.md)

## In progress (`wip`)

- [#202](https://github.com/jmchilton/galaxy-tool-util-ts/issues/202) — optional default expansion with sparse-state validation preserved; PR [#207](https://github.com/jmchilton/galaxy-tool-util-ts/pull/207). [notes](wip/202/index.md)
- [#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210) — `validate-tests --workflow` ignores collection shape and datatype; stacked branches `issue_210_datatypes_snapshot` → `issue_210_test_kind_checks` (asks 1+2). [notes](wip/210/index.md)
- [#212](https://github.com/jmchilton/galaxy-tool-util-ts/issues/212) — UDT expressions never check `inputs.*` member paths against the runtime model; branch `issue_212_udt_expression_paths`. [notes](wip/212/index.md)
- [#216](https://github.com/jmchilton/galaxy-tool-util-ts/issues/216) — `draft-validate --concrete --json` says `ok: false` with empty `*_errors`, unlabelled steps; branch `issue_216_concrete_errors`. [notes](wip/216/index.md)

- [#215](https://github.com/jmchilton/galaxy-tool-util-ts/issues/215) — `draft-next-step` items omit edges around `TODO_*` ports; branch `issue_215_draft_port_edges`. [notes](wip/215/index.md)

## Queued (`queued`)

- [#214](https://github.com/jmchilton/galaxy-tool-util-ts/issues/214) — regex validator uses JS `m`-flag search, not Python `re.match`; multi-line SQL slips; next: sticky-flag fix + skip on unenforceable validators. [notes](queued/214/index.md)

## Untriaged (`untriaged`)

None yet.
