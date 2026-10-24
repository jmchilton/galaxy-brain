Risks are low - this change only relaxes the `shed_lint` ShedVersion check (an equal version now passes when the local tool matches the Tool Shed's published source), fails closed to the old error whenever the fetch or comparison doesn't succeed, persists nothing, and is easily reverted (a two-way door).

<details><summary>Risk Details</summary>

- Behavior change: repos whose unchanged tools previously failed ShedVersion (e.g. tools-iuc CI) will now pass; that's the intent, but it's a lint outcome change for downstream pipelines.
- New network dependency: one extra unauthenticated `requests.get` (60s timeout) per tool whose version equals the latest installable revision; large multi-tool repos or a slow Tool Shed can noticeably lengthen lint runs. It bypasses `tsi`'s session/auth/proxy settings.
- Relies on the Tool Shed `/api/tools/{trs_id}/versions/{version}/tool_source` endpoint and on its rendering (macro expansion, tokens) matching `tool_source.to_string()`; mismatches only produce false errors (old behavior), not false passes.
- Canonical comparison with `strip_text=True` ignores leading/trailing whitespace in text, so a change that only alters whitespace inside `<command>`/`<configfile>` (which can matter for Cheetah/shell) would be treated as unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the endpoint and its rendered output against a real Tool Shed (main and test) for a macro-using tool, so the skip actually fires in practice. Consider whether whitespace-only command edits matter enough to compare text exactly. Nothing here is destructive; a revert restores prior behavior.

</details>
