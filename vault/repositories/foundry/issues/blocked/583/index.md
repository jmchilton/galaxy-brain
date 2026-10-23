# #583 `replacement_collection` indexes `rows` unconditionally, crashing Planemo staging for a `sample_sheet` input without `rows`

[Issue](https://github.com/galaxyproject/foundry/issues/583)

## Proposed labels

Currently only `needs-triage` (opened 2026-09-18 by scottcain, AI-assisted).

- `roadmap/off`: upstream Galaxy/Planemo bug, not a Foundry backbone item or step; no parent.
- `priority/v2`: sample_sheet inputs without `rows` are an edge case; workaround is to supply `rows:` in fixtures.
- `agent/research`: confirm the fix's release path and whether Foundry needs a fixture/pattern note.
- `upstream/galaxy`: bug is in `galaxy.tool_util.cwl.util`; blocked until fix is in a Galaxy release Planemo consumes.

Status: `blocked` (upstream/*).

## Findings

- Claim confirmed: `release_26.0` and `release_25.1` have `kwds["rows"] = value["rows"]` in `replacement_collection`.
- Galaxy `dev` already has `value.get("rows")` (yields `None` when absent, not `{}` as the issue suggests). Not yet in release_26.0. Did not find the fixing PR/issue (no Planemo or Galaxy issue found by search).
- No Foundry PR/branch addresses it; no comments.
- Possible override: if Planemo pins a Galaxy with the fix, drop the blocker. Verify `None` rows is accepted by the collection-create API.

## Next

Find the Galaxy commit that changed it and its target release; link it in a comment; check Planemo's galaxy-tool-util pin.
