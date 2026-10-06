# planemo#1478 — autoupdate exits 0 on failure

[Issue](https://github.com/galaxyproject/planemo/issues/1478)

Fixed by [#1727](https://github.com/galaxyproject/planemo/pull/1727). mvdbeek caught that making `assert_at_least_one` live would break the weekly planemo-autoupdate job for repos containing only skiplisted entries; fixed by counting skipped tools and workflows as targets. Verified against tools-iuc `tools/optitype` and `tools/interproscan` with the live skip list: master 0, pre-fix 2, fixed 0.

Closed 2026-09-25.
