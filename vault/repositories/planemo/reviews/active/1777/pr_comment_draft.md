I pushed three small commits on top of `8c509cb7`; drop any you disagree with.

- `2489034c` Bound and narrow the published tool source fetch: bioblend defaults to no timeout, and the Tool Shed clones the repository for each `tool_source` request, so the request is now capped at 30s. Only `requests` errors are caught, so unrelated bugs don't show up as "could not fetch".
- `c82f6fb6` Say ShedVersion compares only the tool XML: a same-version tool whose wrapper script, `.loc.sample` or other repository file changed still lints clean. The info message, docstring, docs and HISTORY now say that only the tool XML is compared.
- `ca913f57` Test ShedVersion tool source comparison through `shed_lint`: the unit tests mock `shed_tool_source`, so this adds two `ShedLintTestCase` tests. They mock the main Tool Shed with `responses` for a two-tool repository at `1.0+galaxy1`, with one tool unchanged, one edited, and a 404 case. Both fail against master.

This overlaps #1752, which fixes #1525 (the same problem as #1613) with the same endpoint. #1777 covers everything #1752 does.

A guard for non-XML changes would need file digests from the Tool Shed, since nothing public exposes them today. It seems better as a follow-up than as part of this PR.

***Posted by agent [planemo](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/planemo/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
