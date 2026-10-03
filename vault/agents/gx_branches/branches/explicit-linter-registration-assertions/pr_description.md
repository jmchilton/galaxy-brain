Stop every new tool linter from editing the same `assert len(linter_names) == N` line in `test_list_linters`.

That one number is a merge-conflict magnet. Right now two open PRs change it from the same starting point:

| PR | Edits `test_list_linters` |
| --- | --- |
| 🔀 #23829 (`VersionCommand*` linters) | `157` → `159` |
| 🔀 #23815 (container tool env) | `157` → `158` |

Whichever merges second conflicts. If two PRs each add one linter, they both write `158`, merge cleanly, and leave `dev` red. 22 commits have touched the count since it was added in January 2024, and #12941 (twice), #17600, #17656 and #22061 each needed a follow-up commit just to bump it.

The count is also a poor check. It says something changed but not what, and it misses a rename entirely:

```
# A new linter, VersionCommandMissing, not listed in the test
dev:      E   assert 158 == 157
this PR:  E   Extra items in the left set:
          E   'VersionCommandMissing'

# HelpTODO renamed to HelpTodo
dev:      passes (still 157 names, still a Help* linter)
this PR:  E   Extra items in the left set:
          E   'HelpTodo'
          E   Extra items in the right set:
          E   'HelpTODO'
```

(Left is what's registered, right is the set in the test.)

This PR replaces the count and the module-prefix loop with:

- **A set equality against all 157 registered names**, sorted, one per line. A new linter adds its own line.
- **A duplicate-name check** that names the duplicate (`assert not ['CitationsFound']`). Linters are skipped by class name (`LintContext.skip_types`, `NETWORK_LINTERS`, planemo `--skip`), so two linters sharing a name would be skipped together. The old count couldn't tell a duplicate from a new linter.

***New linters still have to touch this test, on purpose. What changes is that each PR adds its own line, so concurrent PRs conflict only when they add names next to each other alphabetically, and a forgotten line fails with the linter's name.*** ***Test-only: no linter, name or registration changes.*** ***Renaming a linter now fails this test on purpose: planemo rejects unknown `--skip` names, so a rename breaks users' skip lists.***

<details><summary>Why a set, not a sorted list or one <code>in</code> assert per name</summary>

- One `assert "X" in linter_names` per name was the first version of this branch. It conflicts just as rarely, but a new linter without an assertion passes silently, and duplicates go unnoticed.
- `sorted(names) == [...]` catches both, but pytest reports a list mismatch by index (`At index 37 diff: 'HelpTODO' != 'HelpValidRST'` and `Left contains one more item: 'XSD'` for one missing name), which points at the wrong linter.
- The set comparison names every added and removed linter at once. The separate duplicate check covers what a set can't see.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Prompted by 🔀 #23829 and 🔀 #23815 both editing the count. ***Whichever of those merges after this PR adds its new names to the set instead of changing a number. If this merges after them, I'll rebase and add their names.***

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The names of the linters that were added, removed, renamed or duplicated.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - it pins the public linter names that skip lists rely on, not how they're registered.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

`pytest test/unit/tool_util/test_tool_linters.py` passes (114 tests). Checked by hand: an unlisted linter, a listed name that isn't registered, and a second class named `CitationsFound` each fail `test_list_linters` with the offending name in the output.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
