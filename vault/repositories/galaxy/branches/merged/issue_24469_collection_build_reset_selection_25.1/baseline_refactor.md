No refactoring of the base branch was performed.

Branch is 2 commits (baseline tests `206d8cb3a59`, fix `33914ab23fd`), ~47 lines. The fix is two `update:show-selection` emits in `SelectionOperations.vue`; the only non-fix pieces are two `navigation.yml` selectors and a Selenium helper, which exist solely to assert the new behavior and would be unused on the base. Nothing worth hoisting.
