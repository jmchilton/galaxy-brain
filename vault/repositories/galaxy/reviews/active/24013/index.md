# galaxy #24013 — Keep the card title and menu caret on the first header row

[PR #24013](https://github.com/galaxyproject/galaxy/pull/24013) · **Recommendation: approve; no actionable findings.** Initial review completed 2026-10-11. Status: active, open and out of draft. Delivery: review and approval draft unposted.

[Latest review and risk assessment](review-2026-10-11.md) · [Unposted review draft](draft-review.md) · [Validation evidence](validation-evidence.txt) · [Browser measurements](browser-layout-evidence.jsonl) · [Browser probe](browser-layout-probe.cjs)

Reviewed HEAD: `484ec3bc63652699ac41b489f91381fb1e0faec1` (base `dev`; merge base `5deaa44ee72e52f09fccdd529ab7ce0182d3a024`). Author: itisAliRH. Live HEAD unchanged at final GitHub check on 2026-10-11.

John requested this review and reports that the visual result looks good. One dedicated subagent reviewed implementation behavior, accessibility, lifecycle, supported sibling paths and regressions. All 55 tests across six focused/sibling suites passed; Chromium verified 17 HEAD and 13 exact pre-PR layout samples plus keyboard/menu/font/dynamic-content checks.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24013/`, clean and retained while open. CI cache: `/Users/jxc755/projects/ci-artifacts/galaxy/pr/24013/`; no artifacts were available. Isolated temporary browser server and copied client dependencies are cleaned up after validation. No source edits or external review submissions. Coordinator handles queue and vault synchronization.
