`pr_24535_review_1` is built on the reviewed commit `deed873a70a`. It changes the `metadata_defaults` fixture so the file's comment-line counts differ from the action defaults. Its assertions now pin the sniffed value and still go red on base.

The `comment_lines` retarget to `release_25.1` (P2 1) isn't a code change, so it isn't on this branch.

- `87c69955d9a` Make metadata_defaults comment counts differ from action defaults. Writes 2 and 1 comment lines against defaults of 7 and 3 and asserts the sniffed counts.
