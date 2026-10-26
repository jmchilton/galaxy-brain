# Normal review debrief

Acted on all three real issues and nits 4–7 and 9 (commit after 044a8d12): every shed repo is now preinstalled before the data-table check, the user/role/key payloads are spelled out (role `description` is required, verified in `RoleDefinitionModel`), required data-table selects count even at their default, Mold step 3 now points at the note instead of repeating it, the eval allows `not-run` for UDT workflows, the `.loc.sample` hedge allows shipped rows, and the step-0 semicolon is gone. Verified planemo sets `enable_beta_tool_formats="true"` (0.75.47 config.py:462) before rewording.

Not acted on:
- Nit 8 (architecture note links reference-data-mapping and iwc-test-data-conventions, not bundled in the cast): context links only; bundling them would widen the cast for little gain.
- Reviewer saw 404 rather than 500 for the guid-form tool_source URL; the note only says it "does not work", so no change.

<details><summary>Full review</summary>

Verdict: merge after two runnability fixes. Claims confirmed against planemo 0.75.47/master, Galaxy schema/managers, Tool Shed endpoint, and planemo flags.

Real issues: (1) data-table check runs before top-level repos are installed by planemo test, so a 404 would be misread; preinstall all repos. (2) Role payload needs `name` and `description`; spell out payloads. (3) "Count only selects the step's state sets" misses required selects left at default.

Nits: (4) planemo already enables beta tool formats; env var redundant. (5) eval should allow `not-run`. (6) Mold step 3 duplicates the note. (7) `.loc.sample` "usually no rows" vs static deferral. (8) linked notes not bundled. (9) step-0 semicolon.

Scope: no overreach; #1757 and #582 correctly left out.

</details>
