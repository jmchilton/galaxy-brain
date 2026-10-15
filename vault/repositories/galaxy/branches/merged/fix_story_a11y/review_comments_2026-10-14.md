# PR #24046 review follow-up — 2026-10-14

All four comments are valid. Commit: `58849d66e99e47903b48856382ea362a7510d765`. Base: `release_26.2` at `8b729ff0050`, identical to the existing branch base; no rebase.

| Comment | Repair and evidence |
| --- | --- |
| [Action/count names](https://github.com/galaxyproject/galaxy/pull/24046#discussion_r4270565161) | Explicit localized action + count/size labels on active/deleted/hidden/storage and converted-item controls. Labels follow count updates; the tooltip directive continues preserving visible and explicit names. |
| [Editable heading typography](https://github.com/galaxyproject/galaxy/pull/24046#discussion_r4270565166) | Scope `font: inherit` to `button.click-to-edit-label`. Chromium comparison using the actual compiled scoped stylesheet and Bootstrap shows editable h3 matches plain h3 at 28px/500; native button inherits 16px/400. |
| [Inert collection selection](https://github.com/galaxyproject/galaxy/pull/24046#discussion_r4270565174) | New `selectable` prop gates selection control/row behavior. List creation and manual pairing explicitly enable it; fixed-identifier rows expose removal without a dead toggle. Existing selection/rename/removal regressions remain. |
| [Focus after tag removal](https://github.com/galaxyproject/galaxy/pull/24046#discussion_r4270565181) | The dependency patch restores focus only when the disappearing tag button owned focus. Prefer the next tag, then previous, then input/root. Disallowed removal keeps focus. Unit tests cover both searchable states; Chromium executes native Enter/Space removal through middle, end, and final tags. |

Explicit caller labels are preferable to ignoring digit-only text globally. This addresses count and byte-size controls while preserving meaningful visible names elsewhere. Nothing to refute.

## Validation

New regressions first produced six expected failures on the old head (names, inert controls, focus). The final affected set passes **223 tests in 26 files**; the last fixture/import edits also pass 14 tests in three files. `vue-tsc --noEmit`, changed-file Prettier, `git diff --check`, and all commit hooks pass. ESLint reports zero errors and seven pre-existing event-name warnings. Vault validation passes: 122 files, zero errors, 15 advisory warnings.

Chromium reports six native keyboard removals with correct focus, plus heading/button computed style comparison. [Probe](validation/review-24046-browser.cjs), [results](validation/review-24046-browser-results.json). Set `A11Y_SOURCE` to the production worktree and `STORYBOOK_CLIENT_DIR` to a client checkout with Playwright installed; execute the probe with Node. The heading comparison uses compiled component CSS and equivalent DOM markup; it does not claim a full DetailsLayout browser flow or manual screen-reader validation.

The independent [checklist](review_polish_checklist_2026-10-14.md) passes with human-read reserved. One fresh strengthening round found no further development needed; it corrected the CI wording to distinguish suspected timing from a proven diagnosis. Audience and bounded scope are highlighted in the local description.

## Prior-head CI and publication

Old head `801a8f293fc` has 57 successful checks, two skipped and one failed. [Client unit run](https://github.com/galaxyproject/galaxy/actions/runs/38536493295) fails only `CommandPalette > runs the secondary action of the selected item on shift+enter`: no options after the test's fixed wait. 4,596 other tests pass. The local full CommandPalette suite passes, and the branch changes its result markup rather than search/provider timing; timing is suspected, not proven. Upstream Playwright, Integration Selenium, tool-form harness, lint and package checks pass on that old head.

The normal fast-forward push updates the existing fork/PR to `58849d66e99`. New-head CI is pending. No public replies, thread resolutions, description edits or draft changes were posted. The local PR description incorporates the repairs and dated validation; its human-read checkbox is unchecked for John's final read. Tracking remains `branches_ready_for_final_review` under the branch-change approval rule.
