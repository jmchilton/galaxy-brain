Add `gxwf fill-defaults` to write an explicit expansion of the static defaults available in a workflow's tool definitions. This is an optional operation for inspecting defaults or exporting expanded state. A workflow that omits a conditional selector with a declared default remains valid under `--strict-state`.

Addresses the optional default-expansion part of #202. Galaxy already fixes the missing-selector import crash in [galaxyproject/galaxy#24272](https://github.com/galaxyproject/galaxy/pull/24272), merged into `release_26.1` on October 20. Its generic conditional-selector initialization also handles the fastp example. Request and workflow state may omit defaulted selectors, while effective job state must contain the values used for execution. This PR follows that contract without making an importer limitation a new validation rule.

```bash
# Sparse state with declared defaults is already valid.
gxwf validate workflow.gxwf.yml --strict

# Expand defaults only when an explicit representation is wanted.
gxwf fill-defaults workflow.gxwf.yml --output expanded.gxwf.yml
gxwf validate expanded.gxwf.yml --strict
```

The command supports native and format2 workflows, `$graph` entries, inline subworkflows, and embedded tool definitions. It preserves connections and existing connection markers. The new `connectedPaths` option on `expandToolStateDefaults` leaves connected inputs absent and creates repeat instances required by connections.

Strict validation retains its existing schema semantics. Invalid explicit selectors still fail, and validation leaves the input file unchanged. The exact fastp fixture from #202 passes both Effect and JSON Schema validation before and after optional expansion.

Validation: `pnpm build`, `make check`, and `make test`. Focused regressions cover sparse selectors across validation backends, native workflows, subworkflows, tree validation, lint, and concrete drafts, plus connection preservation and the six expanded fastp selectors.

The command expands available static defaults and does not perform validation or guarantee server importability. Unresolved tools, JSON-string state, and external subworkflows warn and remain unchanged. Connection paths use `|`, with `/`-separated paths unsupported. Follow-up live API checks on `release_26.1` confirm sparse fastp import succeeds with `fill_defaults` omitted, false, or true. Removing only #24272's five-line fix reproduces `KeyError: 'eval_dups'` when default filling is omitted or false. Fastp execution was not tested.
