# Tool Shed stock-tool TRS version discovery

Investigated 2026-09-16 in response to [Foundry PR #558's review thread](https://github.com/galaxyproject/foundry/pull/558#discussion_r4030420153). [Foundry issue #552](https://github.com/galaxyproject/foundry/issues/552) records the original failure; PR #558 permits explicit-version probes as a workaround.

## Confirmed gap

Read-only requests to the public Tool Shed reproduced these results:

| API path (under `https://toolshed.g2.bx.psu.edu/api/`) | Result |
| --- | --- |
| `ga4gh/trs/v2/tools/__SAMPLE_SHEET_TO_TABULAR__` | 500 |
| `ga4gh/trs/v2/tools/__SAMPLE_SHEET_TO_TABULAR__/versions` | 500 |
| `tools/__SAMPLE_SHEET_TO_TABULAR__/versions/1.0.0` | 200, matching ID and version |
| `ga4gh/trs/v2/tools/Filter1/versions` | 500 |
| `ga4gh/trs/v2/tools/unknown_stock_tool/versions` | 500 |

Current Galaxy dev (`aa111536957`) has the same defect. Both TRS tool metadata and version listing call `get_tool()` in `lib/tool_shed/managers/trs.py`, which unconditionally resolves repository metadata. A bare stock ID decodes to a GUID with no repository owner/name; `guid_to_repository()` then raises `ValueError` while unpacking that GUID. New unit tests reproduced this failure before the implementation changed.

Explicit-version fetches already branch on whether the ID contains `~` and use a lazily initialized stock-tool registry. This is an endpoint inconsistency, rather than missing stock wrappers. The TypeScript client's `getLatestTRSToolVersion()` uses the last entry in the TRS list, so stock versions must be returned oldest first.

## Implemented fix

Draft PR: [Galaxy #23565](https://github.com/galaxyproject/galaxy/pull/23565), now titled `[26.1] Expose stock tool versions through the Tool Shed TRS API` and targeting `release_26.1` following Marius's approved review. Branch: [`toolshed_stock_trs`](https://github.com/jmchilton/galaxy/tree/toolshed_stock_trs), rebased tip `f211f388f0`, based on release tip `1f6bbd3c42c`. Only the three feature commits were replayed; the diff contains the same five feature files, with release-branch type annotations retained when resolving the registry conflict.

- Move the existing stock source registry into cached `galaxy.tools.stock.stock_tool_sources_by_id()` and share it between explicit-version fetches and TRS metadata.
- Resolve bare IDs from that registry in TRS, publishing wrapper-declared versions, tool name/description, GALAXY descriptor type, and URLs preserving the configured server scheme and escaping IDs/versions.
- Sort stock versions with Galaxy's version parser, so `1.10.0` follows `1.2.0`.
- Return 404 for unknown stock IDs.
- Preserve the existing workflow-safe version fallback for explicit-version stock fetches.

Representative available versions in this checkout:

| ID | Versions |
| --- | --- |
| `__SAMPLE_SHEET_TO_TABULAR__` | `1.0.0` |
| `__FILTER_FROM_FILE__` | `1.0.0`, `1.1.0` |
| `__FLATTEN__` | `1.0.0` |
| `Filter1` | `1.1.0`, `1.1.1` |
| `sort1` | `1.2.0` |
| `Show beginning1` | `1.0.2` |

Once deployed, the existing client's unversioned stock-tool lookup can discover a version via TRS and fetch its parsed model without probing candidate pins. The public Tool Shed still requires its current explicit-version workaround until deployment.

## Validation and readiness

- Tool Shed unit suite plus stock-tool tests: **82 passed, 12 skipped**.
- Tool Shed tools API suite against a temporary local server: **9 passed**, including both TRS endpoints, unknown-ID 404s, URLs for IDs containing spaces, and successful exact-version fetches for every advertised version of the six representative tools.
- Mypy: no issues in the three changed modules checked.
- Repository-pinned Ruff, isort, Black, and `git diff --check`: passed.
- Follow-up: replaced the monkeypatched ordering test with the existing `multiple_versions_sorted` XML fixtures (`1.9`, `1.10`), retaining the numeric-versus-lexical ordering check and verifying exact-version fetches through the real registry; **11 focused tests passed**. The TRS unit and API tests use no monkeypatching.
- PR lint follow-up: both Python jobs failed only on mypy's optional `descriptor_type` iteration in the unit test; formatting passed. Added an explicit non-None assertion, preserving the existing descriptor-value assertion. Reproduced that error with mypy from `lib/`, then confirmed the targeted check passes after the fix; all 11 focused tests and formatting/lint checks pass. Full local `make mypy` additionally reports 13 unused-ignore errors in unchanged code that were absent from the PR CI logs.

Lint fix pushed as `3d2873a811`; replacement PR checks are pending, and [fork Python lint](https://github.com/jmchilton/galaxy/actions/runs/35155174837) is queued.

Release rebase validation at `f211f388f0`: **75 unit tests passed, 12 skipped; all eight tools API tests passed**. Targeted mypy on the changed modules, TRS schema, and unit test passed, along with the release-pinned Ruff (`0.15.13`), isort (`8.0.1`), Black (`26.3.1`), and `git diff --check`. The branch was pushed with an exact force-with-lease check, and the PR target, title, and validation results were updated. Replacement CI remains pending; the PR stays in draft.

The initial push triggered 29 workflows: 27 queued and two skipped at the first check. After the fixture-based follow-up, current fork [Tool Shed tests](https://github.com/jmchilton/galaxy/actions/runs/35151816436), [unit tests](https://github.com/jmchilton/galaxy/actions/runs/35151816430), and [Python lint](https://github.com/jmchilton/galaxy/actions/runs/35151816366) remain queued. PR CI is also queued, with CircleCI in progress. The draft is recorded in `vault/agents/gx_branches/MY_BRANCHES.md` under waiting for CI. No review-thread reply has been posted.

## Separate existing TRS limitations

Code inspection also found that the global TRS `GET /tools` endpoint returns an empty list, and no TRS individual-version or descriptor routes are declared in `lib/tool_shed/webapp/api2/tools.py`. Those broader TRS features are separate from the stock-tool version-discovery failure addressed here; this branch does not implement full TRS conformance.
