# Readability batch 67

Eight originators selected with seed `2610967` from 237 eligible tests; [manifest](readability_batch_67.yml). Recorded base/remote `1aefd1948d07` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Separate disposable author worktrees and commits; Tool Shed uses its installed native Vitest 3 environment.

All 40 original cases and 138 intended successful checks remain; retrying waitFor observations are counted at successful evaluations and heading includes a collection-time guard. Final total is 51 cases/143 checks. Pairing splits eleven YAML examples into named cases and adds the missing foo check while preserving the original duplicated bar check. Export adds four exact-expiry boundary checks in one new case; a bounded >= mutation passes the original suite and fails the addition, then production/test files restore and pass.

| Originator | Change | Cases / checks |
| --- | --- | ---: |
| [Export records](reviews/batch67/exportRecordModel.md) | Owned deterministic clock and exact expiration boundary | 7 / 21 |
| [Markdown tool help](reviews/batch67/ToolHelpMarkdown.md) | Owned native Pinia/mount and precise sanitizer history | 1 / 4 |
| [Tool Shed repository](reviews/batch67/RepositoryPage.md) | Native inferred mounts, partial schema fixtures and required targets | 5 / 9 |
| [Heading scale](reviews/batch67/headingScale.md) | Guarded optional match extraction, existing source contract retained | 3 / 6 |
| [Shared v-model](reviews/batch67/vModelContract.md) | Inferred native parent bindings and owned wrappers | 2 / 4 |
| [Collection pairing](reviews/batch67/pairing.md) | Named typed YAML examples, all pair strings retained | 23 / 64 |
| [Unprivileged tools](reviews/batch67/unprivilegedToolStore.md) | Owned real Pinia and canonical toast mock reuse | 5 / 23 |
| [Collection chips](reviews/batch67/CuratedCollectionChips.md) | Native fixture types and owned geometry/mount cleanup | 5 / 12 |

Every actual covered source location remains. Default maps: export5 files/98 locations exact, help41/132 exact, repository89/3385 exact, heading3/3 exact, v-model6/140→151, pairing4/266 exact, tools142/495 exact, chips14/121 exact. Actual external UI: repository43/2636 exact through verified byte-identical scratch aliases (native Vitest3 excludes node_modules); chips2/54 exact. Help external23/12 is setup/import coverage with stubbed popover, and heading reads component/SCSS as text: neither claims rendered UI coverage. V-model additions cover actual GCollapse/GTab/GTabs cleanup. No production, dependency, helper, supporting or guidance edits. Existing guidance suffices.

Final integrated shuffled runs pass seven client suites/46 cases and native Tool Shed one suite/five cases, seed670101 with one worker. Full client and Tool Shed frontend types, native Tool Shed ESLint/Prettier and absolute-config repository hooks pass. Independent normal, strict, challenge and scope reviews are recorded separately; screenshots/E2E are not relevant to test-only changes. Shared vault retains unrelated empty reviews/Untitled.md; completed snapshot excluding only that note passes122files with zero errors and15existing warnings.

Fast-forward published `a716c7d6a82a497f52a1831309c67531451c35fa`; exact GitHub head and draft verified. All eight independent normal, strict, challenge and scope reviews approve. Eight originating counters written after publication; downstream branches unchanged and vault records local only. Status remains ci_wait. Previous-head Mulled backend timeout is diagnosed in [CI observation](reviews/batch67/ci_observation.md).
