# Citation services — independent review, batch 66

Approve author commit `6f37481eecea3936878be7d5454d92d487b37987` against pinned base `a0dc0eccc9e8be67715f0390337c0e2f969cc022`. Independent shuffled seed 660201 passes both cases. All five original checks remain; an additional exact warnings-array expectation now proves preservation of the full upstream warning instead of only its tool-ID substring.

Independently decoded and compared pristine/final BibTeX literals: all 1,060 runtime UTF-8 bytes are identical, including tabs, newlines, TeX escapes and Unicode author names. The joined literal fields make the fixture easier to inspect without changing the real citation parser/formatter boundary. MSW remains appropriate for this legacy response shape.

Verified mutation logs: reducing the warning to its tool ID passes both original cases, fails the added exact-warning check, and restored source passes both. No production mutation or helper change is committed. Author covered source locations remain exact across nine files/38 locations; no shared UI renders. No blocking finding or useful new guidance gap.
