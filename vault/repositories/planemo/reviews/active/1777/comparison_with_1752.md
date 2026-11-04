# #1777 vs #1752

Both fix the same problem (#1613 ≈ #1525): untouched sibling tools in a multi-tool repository fail ShedVersion. Both use the `tool_source` endpoint from galaxy#21794, compare it with `ToolSource.to_string()` only when the versions are equal, and compare only the tool XML. #1777 is the superset. Neither PR links the other.

| | #1752 (`6e478925`) | #1777 (`8c509cb7`) |
|---|---|---|
| Size | +79/−1, an added skip block | +267/−43, restructures `lint_shed_version` |
| Base | Predates #1751; conflicting; `str == Version` merge trap (#1752 P2 2) | On current master, uses `parse_tool_version` |
| Comparison | `ET.canonicalize(strip_text=True)` | Raw strings; live check matched |
| HTTP | Bare `requests.get`, 60s | `tsi.make_get_request` in `shed/interface.py`; no timeout (fixed in `2489034c`) |
| Unfetchable source | Old generic error | Its own error |
| Tool Shed queries | Per tool | Once per repository |
| New tool in existing repo | Assertion | Info message (overlaps #1775) |
| Tests | Helpers only | Through `lint_shed_version` with mocks; end-to-end added in `ca913f57` |
| Docs / HISTORY | None | Both |

#1752 review findings against #1777: P2 2, P2 3, P3 1 and P3 3 handled by the PR's design; P2 1 and P3 2 addressed by the pushed commits (P2 1 by scope messaging only).
