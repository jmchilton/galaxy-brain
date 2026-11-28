# Alt: release_26.1

`stock_tools_review_clean_alt_release_26_1` at `6cfe8e271c1` is the branch as it was before it was retargeted to `release_25.1`: 25 commits on `origin/release_26.1` (`7e8075a360e`), pushed to `jmchilton`.

The parent branch has the same 25 commits rebased onto `origin/release_25.1`. Each commit has the same patch-id, and the net diff is the same apart from hunk line offsets. The one context difference is Qiskit, because 25.1 ships the older tool. Use this alt if the work goes back to 26.1, or if a 26.1 forward-port needs the original commits.

Since 2026-11-27 the alt also carries the 8 framework test-tool commits, the same ones that sit on top of the parent. Its head is now `cc4079ce8bc`, a fast-forward over `6cfe8e271c1`. Unlike 25.1, it includes the hunks for `collection_type_source_conditional`, `_digit_name` and `_section_repeat`, because those tools exist on 26.1.
