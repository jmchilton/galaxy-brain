Thanks for the detailed report. This is fixed upstream: Galaxy commit 494722a792f changed `replacement_collection` to `value.get("rows")`. The fix shipped in Galaxy 26.1.0, so it's in `galaxy-tool-util` 26.1.0 and later (26.1.1 is current on PyPI). The 25.1 and 26.0 releases still index `rows` unconditionally, so the crash you hit was probably from an older `galaxy-tool-util`.

Planemo 0.75.47 accepts `galaxy-tool-util>=25.1,<26.2`, so upgrading Planemo (or just `galaxy-tool-util`) in your environment should pick up the fix.

Closing as fixed upstream. If you try an updated Planemo and staging a `sample_sheet` input without `rows` still fails, please reopen this and yell at us.
