# #22170: Fix more paired_or_unpaired collection issues

https://github.com/galaxyproject/galaxy/pull/22170. Merged and backported to stable. +3109/-133 across 26 files, 14
commits.

## What happened

- **2026-03-18 18:40:** opened. "This builds on #22025 - I am implementing connection validation of workflows like
  happens in the workflow editor and Claude discovered some gaps on the backend ... we did have collection semantics
  examples and docs that had the correct behavior documented but the backend was broken in subtle ways."
- The body links the **two bug-fix commits** directly, so the reviewer can find the real change inside the large diff.
- **2026-03-19 09:13:** mvdbeek approved with **"Wonderful. The paired suffix bugs should probably be backported to
  26.0 ?"** He merged it the same minute. Open to merge was about 14.5 hours.
- John replied that he would backport the fixes without the integration tests.
- **About 90% of the lines are spec, docs, and tests:**

  | Lines | File |
  |---|---|
  | 740 | `collection_semantics.yml` |
  | 609 | `test_collection_semantics.py` |
  | 421 | `collection_semantics.md` |
  | ~550 | `*.gxwf-tests.yml` fixtures |

  `semantics.py` adds 343 lines, and the core fixes are small.
- #22025 (the docs and tests formalization alone, +2936) got **no mvdbeek comment**. It was closed on 2026-03-22,
  after its content shipped inside #22170.

## Why it landed well

- **The spec already said what was correct.** Fixing "backend disagrees with our own documented semantics" is a proof,
  not an argument. That is the opposite of #23369, where the PR argued for a new reading of `when_values`.
- **The real change was pointed to directly.** Linking the two fix commits made 3000 lines reviewable overnight.
- **Agent provenance was stated plainly.** "Claude discovered some gaps" sat next to tests that pin each gap. The agent
  claim came with its evidence.
- **Docs and tests alone (#22025) drew silence. The same content with two concrete bug fixes drew "Wonderful."** The
  fixes gave the spec a purpose. This is the inverse of #22217, which shipped research by-products without the
  deliverable.

## Reusable signal

- **Size isn't the problem. Contested semantics is.** A large PR whose bulk is spec plus tests, with a few linked fix
  commits that bring code in line with already documented behavior, is easy to approve.
- **Link the commits that matter** in the description of any large PR.
- **Pair documentation work with a bug it found.** On its own, documentation work waits for a review.
