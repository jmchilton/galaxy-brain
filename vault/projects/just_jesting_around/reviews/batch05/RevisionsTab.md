# RevisionsTab

Selected originator: `lib/tool_shed/webapp/frontend/src/components/MetadataInspector/RevisionsTab.test.ts`.

Reviewed the goal, iteration instructions, client best practices, native ToolShed setup, component implementation, real fixture values, and sibling consumers. All 15 cases remain. Assertion statements change from 30 to 28; the two removed statements validated a fixture-discovery fallback, while the final scenario directly names the invalid revision and checks its actual rendered details.

## Scenario preservation

| Scenario | Final evidence |
| --- | --- |
| Null metadata | Same no-revisions message. |
| Empty metadata | Same no-revisions message, without a cast. |
| Revision list | Same list presence. |
| Revision identifiers | Exact three labels `[2:062143f]`, `[1:191823a]`, `[0:d6e7311]`, replacing a fixture-derived loop. |
| Newest first | Exact ordered revision-toggle labels, replacing a conditional newest/oldest text comparison. |
| Tools in summary | Same `Add_a_column1` text. |
| Revision without tools | Same no-tools message using the existing typed revision factory. |
| Invalid badges | Existing `1 invalid` text remains checked; complete ordered badge values `2 invalid`, `1 invalid` strengthen the regex check. |
| Valid revisions | Same absence of invalid-tools badge. |
| Expanded invalid revision | Explicit original first invalid key `0:c35bbde3c5e0`; rendered invalid-tools list contains `bismark_bowtie_wrapper.xml` and `Tool XML parsing error`. |
| Initial expandRevision | Original first fixture key `0:d6e73113c7a5` and viewer presence. |
| Changed expandRevision | Zero expanded/viewers initially, one of each after awaited setProps; redundant additional nextTick removed. |
| One expansion control per revision | Original exact fixture-size check. |
| Accessible toggle | All eight button/ARIA/region/viewer/collapse checks retained. |
| Many invalid tools | Same five supplied invalid tools and both exact count checks. |

The shared `MetadataJsonViewerStub` and typed mount arrangement are described in [ToolHistoryTab review](ToolHistoryTab.md). Real GButton/GCollapse remain, and wrappers automatically unmount. Supporting OverviewTab keeps its original cases and assertions and does not gain an iteration counter.

No additional schema/domain factories were needed: `makeRevision` and real typed fixtures already cover these cases. Existing scenario and sharing guidance covers the findings; no new README advice is proposed.

Validation: all three viewer-stub consumers pass 35 cases with native ToolShed Vitest. Scoped ESLint, formatting, and the full ToolShed type check pass. Evidence: `/private/tmp/batch05_metadata_final.log`, `/private/tmp/batch05_metadata_lint.log`.
