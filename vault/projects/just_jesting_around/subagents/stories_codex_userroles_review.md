# UserRolesGroupsForm stories review — a3cd5206c85

Independent read-only review approved without corrections. No recommendations were left unaddressed. The accessibility finding is recorded in BUGS_FOUND.md; component changes are outside this lane.

## Review details

All 21 original sites survive across eight cases: loaded identity and tags (3), initial search count/query/private exclusion/QA visibility (4), first-character search/private exclusion (2), loaded membership payloads/redirect (3), changed memberships (2), loading error/no submit (2), role failure/no group save/no redirect (3), group failure/no redirect (2).

Fixture substitutions preserve the exercised features and recompute exact expectations. Errors match Galaxy codes/messages. The private role remains in successful responses; request observers preserve story responses; router spy starts after initial navigation. Stories are independently readable and use a signed-in administrator.

Reviewer was read-only and did not rerun reported checks or kill processes.

## Validation

Targeted unit: 8 cases passed. Removable Chromium probes: 4 passed, verifying selected memberships, short-role search, loading refusal, and both save refusals. The probes found role/group comboboxes have empty accessible names; missing FormElementLabel labelFor is recorded without component edits. Full unit: 671 cases in 82 files passed. Full browser: 323 cases in 82 files passed. Type-check, formatting, lint, and normal hooks passed.
