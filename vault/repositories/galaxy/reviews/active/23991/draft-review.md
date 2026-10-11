The TypeScript/script-setup conversion looks good. I checked startup/watchers, embedded mode, themes, unsaved-change confirmation, Home query handling, and admin/library route parity without finding an actionable regression.

44 focused tests passed across eight suites. Against the exact pre-PR production modules, 21 of the 22 changed-suite tests pass; the one difference is the inactivity-banner correction already explained in the description. Existing client, startup, Selenium, and Playwright checks are green.

## Risks

Risks are minimal: this is a reversible refactor with no persisted-data or API contract change. The shell's broad UI reach makes startup and embedded-mode parity the main concern, and the added tests cover those paths well. The acknowledged user-store follow-up for the inactivity banner can remain separate.
