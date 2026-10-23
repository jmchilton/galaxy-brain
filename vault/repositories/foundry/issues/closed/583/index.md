# #583 `replacement_collection` indexes `rows` unconditionally, crashing Planemo staging for a `sample_sheet` input without `rows`

[Issue](https://github.com/galaxyproject/foundry/issues/583)

## Proposed labels

Currently only `needs-triage` (opened 2026-09-18 by scottcain, AI-assisted).

- `roadmap/off`: upstream Galaxy/Planemo bug, not a Foundry backbone item or step; no parent.
- `priority/v2`: sample_sheet inputs without `rows` are an edge case; workaround is to supply `rows:` in fixtures.
- `agent/research`: confirm the fix's release path and whether Foundry needs a fixture/pattern note.
- No blocker: the fix is already released (below), overriding the initial `upstream/galaxy` proposal.

Status: `closed`.

## Findings

- `release_25.1` and `release_26.0` have `kwds["rows"] = value["rows"]` in `lib/galaxy/tool_util/cwl/util.py` `replacement_collection`.
- Fixed to `value.get("rows")` by Galaxy commit 494722a792f ("Add sample_sheet workflow runtime framework tests"), on `release_26.1` and `dev`; in tags v26.1.0 and v26.1.1. PyPI `galaxy-tool-util` latest is 26.1.1.
- Planemo 0.75.47 requires `galaxy-tool-util>=25.1,<26.2`, so a fresh install picks up the fix; the reporter probably had galaxy-tool-util < 26.1.
- Unverified: that `rows: None` is accepted by the collection-create API end to end.
- No Foundry PR/branch addresses it; no comments.

## Next

Closed 2026-10-23 as fixed upstream with [issue_comment.md](issue_comment.md): https://github.com/galaxyproject/foundry/issues/583#issuecomment-6375434070. Reporter asked to reopen if an updated Planemo still fails.
