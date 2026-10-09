# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `ag_grid_36` (`10df5b747af`, stacked on `sample_sheet_vue3` at its pre-rebase `4dd34fe8db3`; needs restack onto `5b921635fb2`, add/add conflict on `FetchGrid.test.ts`) — Description: Upgrades ag-grid-community + ag-grid-vue3 31.3.4 → 36.2.0, pinned together; optional now that #23938 fixes the CVE; module registration, legacy Alpine theme, row-copy write-back for FetchGrid and the paired list builder, renderers passed as components; blockers: parent branch; restack (new SHA needs fork CI); fork CI on `10df5b747af` green incl. E2E except unrelated Client Unit (`focusOrder`/`GPopover`, red on dev base `4fe00d9e7ab`, fixed on dev by `d9074b78886`) and packages (social-auth); [debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ag_grid_36?expand=1).
