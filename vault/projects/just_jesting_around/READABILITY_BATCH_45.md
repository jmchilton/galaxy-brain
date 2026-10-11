# Readability batch 45

Four originators, one test per commit, then one range review. vNoSanitizeHtml is follow-through from batch 44; the other three were drawn with seed `2610945`. [Manifest](readability_batch_45.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| `vNoSanitizeHtml` | Same fix as its sibling: one `mountWith` host with `other` and `rich` props, so the two `one-component-per-file` warnings are gone with no disable. The mount → change → null walk is three cases (the directive keeps no state, so the order wasn't load-bearing). New: mounted with null, an unrelated re-render leaves the DOM alone, markup stays during destroy. Branch coverage of `vNoSanitizeHtml.ts` rises 4/6 → 6/6. [Review](reviews/batch45/vNoSanitizeHtml.md). | 2 → 7 |
| CollectionProgress | `mountWithJobs`, `summaryOf` and `renderedBars`; the static cases are one `it.each`, and each checks the exact set of bars. The update case no longer mutates a shared object. New: the bar is hidden when every job is terminal. [Review](reviews/batch45/CollectionProgress.md). | 4 → 5 |
| admin GroupForm | Named fixtures, `serveGroup()` in `beforeEach` (still before mount), VTU2 mount options without the `as object` cast. Rename split into "title keeps the saved name while editing" and "rename PUT plus redirect". The users-load failure became an `it.each` over the group, users and roles requests, each with its own message. `GroupForm.vue` coverage rises 51 → 59 lines. [Review](reviews/batch45/GroupForm.md). | 3 → 6 |
| FormNumberList | VTU2 options, `SELECTORS`, `inputValues`; exact input-value lists, the empty row's `""`, and the remaining `"2"` after removing the first row. [Review](reviews/batch45/FormNumberList.md). | 5 → 5 |

## Reuse and follow-through

Closes batch 44's vNoSanitizeHtml follow-up. Follow-ups:
- **Needs John's call:** `CollectionProgress.test.js` duplicates the four original cases. The 2024 TypeScript port (`96736787c84`) added the `.ts` and never removed the `.js`, which upstream `dev` still has. After this batch it covers nothing the `.ts` doesn't. Removing it means deleting a test, so it waits.
- The sanitize-directive tests now share nearly the same host and `targetOf`. A shared helper would mean editing both; not worth it for two files yet.

Guidance: none.

## Validation and review

23 cases across 4 suites pass; the baseline was 14. Each commit's test passes at that commit, shuffled with seed `450101`; full client vue-tsc, ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches (79 compared). The [independent review](reviews/batch45/review.md) approved three commits and asked GroupForm to spread `localVue.stubs` again. The rewrite had dropped the Portal stubs the original got through the adapter; the fix was folded into its commit.

Commits: `90792076b37` (vNoSanitizeHtml), `0738d720ced` (CollectionProgress), `412e60961ef` (GroupForm), `e1ccfc2131e` (FormNumberList).
