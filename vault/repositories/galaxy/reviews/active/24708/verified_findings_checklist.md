- [x] P2 1: A name filter can drop the user's own workflows
- [x] P2 2: Picking an item with no invocations removes the dropdown
- [x] P2 3: "N runs" counts every user's runs and fetches them for other people's workflows
- [x] P2 4: Two Selenium steps pass even if the filters do nothing
- [x] P3 1: Stale grid responses can overwrite newer filter results
- [x] P3 2: The admin invocations grid inherits filters that only cover the admin's items
- [x] P3 3: Name filters re-resolve on every page and sort change
- [x] P3 4: Unquoted names with punctuation match too much or nothing
- [x] P3 5: A quoted name containing a colon gives an "Invalid filters" alert
- [x] P3 6: `key:<id>,<id>` duplicates what `Filtering` already does with `MultiTags`
- [x] P3 7: New import cycle silently loses the column filters in one load order
- [x] P3 8: History access check runs one query per id
- [x] P3 9: API test skips the new failure branches
- [x] P3 10: The "any state" lookups aren't checked against a real server
- [x] P3 11: Column filter races, failures and some promised details have no tests
- [x] P3 12: Local `plural` and `uniqueById` repeat existing helpers

Other Actions:
