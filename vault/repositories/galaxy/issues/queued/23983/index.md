# galaxy#23983 — CI: "TEMP" SSE/notification overrides never reverted; two are dead config keys

[Issue](https://github.com/galaxyproject/galaxy/issues/23983) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-08 by Claude for John; assigned jmchilton. Found while removing `selenium.yaml` in John's #23976.

`cc289e93f18` (#22513) added `ENABLE_NOTIFICATION_SYSTEM`, `ENABLE_SSE_HISTORY_UPDATES`, `ENABLE_SSE_ENTRY_POINT_UPDATES` overrides to E2E workflows, marked "revert before merge". The two SSE keys were collapsed into `enable_sse_updates` in the same PR and are silently dropped, so E2E runs with notifications on, SSE off. Env overrides also beat integration_selenium test kwargs.

Next: small PR reverting the three lines in `playwright.yaml` and `integration_selenium.yaml` (coordinate with #23976, which deletes `selenium.yaml`).

Open: separate issue for warning on unknown `GALAXY_CONFIG_OVERRIDE_*` keys; whether to loop in the #22513 author.
