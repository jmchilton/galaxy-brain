# Readability batch 29

Four originators drawn with seed `2610929` from 395 eligible entries; one test per commit, then one range review. [Manifest](readability_batch_29.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| ActivityItem | Two chained cases split per behavior, with `mountActivityItem(props)`, selector constants, `withPlugins` and auto-unmount. Status styles are `it.each` rows mounted directly; each row also checks the other style is absent. `mount` stays because the title and progress bar render in Popper's reference slot. [Review](reviews/batch29/ActivityItem.md). | 2 → 8 |
| ConfigTemplates `InstanceForm` | `mountInstanceForm(inputs)`, `findComponent(LoadingSpan)`, whole-component cast removed. Loading is an `it.each` over `undefined` (what callers pass) and the original `null`, and now checks the loading message. [Review](reviews/batch29/InstanceForm.md). | 2 → 3 |
| FormInput | Per-test mount replaces the shared `beforeEach` wrapper; the textarea case also checks the `<input>` is gone. [Review](reviews/batch29/FormInput.md). | 2 → 2 |
| Tool Shed RepositoryMenus | Uses the new router helper; auto-unmount added (tests attach to `document.body` and never unmounted). `menuItem(wrapper, text)` throws on a missing item, where `?.trigger` silently did nothing. Health pills and deprecate emits are exact `toEqual`s. [Review](reviews/batch29/RepositoryMenus.md). | 6 → 6 |

## Reuse and follow-through

[`createMemoryRouter`](reviews/batch29/createMemoryRouter.md) in `lib/tool_shed/webapp/frontend/src/test-utils.ts`, named after the client helper in `BaseComponents/test-utils.ts`. Supporting ShedToolbar (4 → 4) and RepositoriesByCategories (1 → 1) adopt it.

Follow-up: `galaxyUi.test.ts` has an identical local `makeRouter()`. It wasn't adopted because the file already has three ESLint warnings at HEAD (two `vue/one-component-per-file`, one `no-non-null-assertion`), so touching it fails the `--max-warnings 0` gate.

Noted: FormInput declares no `emits`, so Vue Test Utils also records the native `input` event; the emit check stays on the first emission.

Guidance: none.

## Validation and review

24 cases across 6 suites pass: 19 selected, 5 supporting. The selected baseline was 12. Each commit's tests pass at that commit, shuffled with seed `290101`. Full client vue-tsc and the Tool Shed typecheck pass at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch29/review.md) approved all five commits.

Commits: `5ba950e8784` (ActivityItem), `184e68580dd` (InstanceForm), `40451c8e2f0` (FormInput), `a39999b27bf` (router helper + ShedToolbar + RepositoriesByCategories), `f43c5a1ce75` (RepositoryMenus).
