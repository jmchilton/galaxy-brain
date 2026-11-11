GitHub state last refreshed: 2026-11-06. Issues here are not assigned to jmchilton by default.

## Waiting on John (`needs_decision`)

- [#213](https://github.com/jmchilton/galaxy-tool-util-ts/issues/213) — CLI state decode uses `onExcessProperty: "ignore"`, so unknown nested keys pass; decide: always reject vs `--strict-state` only. [notes](needs_decision/213/index.md)

## In progress (`wip`)

- [#202](https://github.com/jmchilton/galaxy-tool-util-ts/issues/202) — optional default expansion with sparse-state validation preserved; PR [#207](https://github.com/jmchilton/galaxy-tool-util-ts/pull/207). [notes](wip/202/index.md)
- [#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210) — `validate-tests --workflow` ignores collection shape and datatype; contributor PR [#224](https://github.com/jmchilton/galaxy-tool-util-ts/pull/224), our branch `pr_224_kind_checks` into it. [notes](wip/210/index.md)
- [#212](https://github.com/jmchilton/galaxy-tool-util-ts/issues/212) — UDT expressions never check `inputs.*` member paths against the runtime model; branch `issue_212_udt_expression_paths`. [notes](wip/212/index.md)
- [#216](https://github.com/jmchilton/galaxy-tool-util-ts/issues/216) — `draft-validate --concrete --json` says `ok: false` with empty `*_errors`, unlabelled steps; draft PR [#226](https://github.com/jmchilton/galaxy-tool-util-ts/pull/226). [notes](wip/216/index.md)
- [#225](https://github.com/jmchilton/galaxy-tool-util-ts/issues/225) — unknown frame `contains_steps` label passes validate/lint, converts to `child_steps: [null]`; PR [#227](https://github.com/jmchilton/galaxy-tool-util-ts/pull/227). [notes](wip/225/index.md)
- [#232](https://github.com/jmchilton/galaxy-tool-util-ts/issues/232) — no TS port of gxformat2's workflow diff (`gxwf diff`, gxformat2#295); branch `issue_232_workflow_diff`. [notes](wip/232/index.md)

## Queued (`queued`)

- [#214](https://github.com/jmchilton/galaxy-tool-util-ts/issues/214) — regex validator uses JS `m`-flag search, not Python `re.match`; multi-line SQL slips; next: sticky-flag fix + skip on unenforceable validators. [notes](queued/214/index.md)

## Untriaged (`untriaged`)

- [#218](https://github.com/jmchilton/galaxy-tool-util-ts/issues/218) — `gxwf validate --mode json-schema` silently ignores `--connections` and strict flags
- [#219](https://github.com/jmchilton/galaxy-tool-util-ts/issues/219) — `gxwf validate --json` prints no JSON when `--strict-structure` or `--strict-encoding` fails
- [#220](https://github.com/jmchilton/galaxy-tool-util-ts/issues/220) — `gxwf validate --connections --json` fails with nothing in the report saying why
