# Galaxy PR #24123 — Use Galaxy's brand color and spacing for GCheckbox

- PR: https://github.com/galaxyproject/galaxy/pull/24123
- Latest review: 2026-10-14
- Reviewed commit: `cf771b5285d479f9cd1fa659d708b18df5c86a73` (latest head rechecked after validation).
- Base: `dev`.
- Delivery: **UNPOSTED** — approval draft prepared; nothing submitted to GitHub.
- Recommendation: **Approve**.
- Findings: no actionable defects found.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24123` (clean after validation).

## Review

Reviewed the full three-file diff, surrounding checkbox and group implementation, design tokens, Bootstrap spacing defaults and Galaxy typography, checkbox wrapper re-export, table selection consumers, workflow runtime-setting switches, existing tests, PR description, and discussion. No conversation comments, inline comments, or existing reviews were present when checked.

The change reuses the existing `--color-blue-600` token and its matching navy fallback for native accent color and checked switch borders/tracks. It preserves native input behavior, model/event handling, accessibility attributes, focus outlines, reduced-motion handling, and forced-colors fallback.

The additional three-pixel input margin is conditional on a following label, so unlabeled table-selection inputs retain zero margins. The more specific switch rule resets all margins after the new rule, preserving existing switch geometry. The new markup regression test checks the child-order assumption behind this selector. Stacked groups override only the row gap; inline column and row gaps remain intact. Bootstrap's one-rem indicator plus half-rem gutter gives a 24px text offset at the normal 16px root size, matching the native 13px box plus the new 3px margin and existing 8px label margin. Galaxy's 0.85rem base text and 1.5 line height explain the approximately 20.4px row pitch.

## Validation

Installed locked client dependencies from the local pnpm cache (`pnpm install --frozen-lockfile --ignore-scripts --offline`), then ran the existing targeted suite from `client/`:

```sh
pnpm exec vitest run packages/ui/src/components/GCheckbox.test.ts packages/ui/src/components/GCheckboxGroup.test.ts packages/ui/src/components/GTable.test.ts
```

**45 tests passed in three files**, including the new markup check and existing checked/indeterminate state, model updates, group inheritance, and table-selection behavior. Only existing Vite config and GDropdown compatibility warnings were emitted.

```sh
pnpm exec prettier --check packages/ui/src/components/GCheckbox.vue packages/ui/src/components/GCheckboxGroup.vue packages/ui/src/components/GCheckbox.test.ts
git diff --check origin/dev...HEAD
```

Both passed. The PR worktree has no tracked or untracked changes after validation.

All **25 reported CI checks succeeded** at the final head check, including client unit tests/linting, Playwright, Integration Selenium, CodeQL, and startup checks. The PR remained open and ready for review.

### Visual evidence and limits

Inspected all three author-provided before/after images in the PR description: [table selection](https://github.com/user-attachments/assets/12c5a99c-3ac4-444e-9a89-b220c9591b38), [workflow switches](https://github.com/user-attachments/assets/ddbbdee3-821a-4d55-88c4-5aa9b8d54910), and [stacked group comparison](https://github.com/user-attachments/assets/0f175602-386b-47d7-b7d9-31595138b4f0). They show navy checked/indeterminate controls, preserved selection-column alignment and focus rings, unchanged switch geometry, and the intended tighter stacked rows.

The screenshots identify earlier/stacked source commits and the stacked image is a rendered CSS comparison, so they are supporting visual evidence rather than independent captures of the reviewed head. A fresh interactive check was unavailable: the browser runtime reported no browser available and its documented discovery returned an empty list. Keyboard, forced-colors, and native-control rendering were therefore reviewed in code and existing tests rather than independently exercised in a browser at this head.

## Risks

Risks are minimal — this is a two-way door: a reversible CSS adjustment with no new API, persistent format, or behavioral contract. The practical remaining risk is browser-dependent native checkbox appearance and spacing in less common font/theme contexts; switch geometry, focus styles, forced-colors fallback, and unlabeled table-cell margins are preserved in the source.

## Review draft

The navy accent and stacked spacing look consistent with the existing tokens and Bootstrap layout. I checked the table-selection and workflow-switch consumers: the conditional margin leaves unlabeled checkboxes centered, and the switch rule preserves its existing geometry.

All 45 focused checkbox, checkbox-group, and table tests passed locally, including the new markup regression test. All reported CI checks are green. I inspected the supplied before/after images; I could not run a fresh interactive browser check in this environment. No blocking findings.

Risk is low: this is a reversible CSS change with no new API or data-format contract.

## Tracking ended — 2026-10-14

GitHub confirms MERGED at `2026-10-14T21:20:27Z`, head `cf771b5285d479f9cd1fa659d708b18df5c86a73`. Archived after merge and removed from the queue. The clean worktree matched the merged head exactly and was removed with `ghwt rm galaxy 24123`.
