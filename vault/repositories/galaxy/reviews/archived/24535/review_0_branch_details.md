`pr_24535_review_0` is built on the reviewed commit `deed873a70a`. It makes three changes:

- Hides the new `sel` datatype from the upload list and gives it a description.
- Adds a framework tool test for the `sel` registration. It goes red without the registration (`found [data]`) and green with it.
- Changes the `metadata_defaults` fixture so the file's comment-line counts differ from the action defaults. Its assertions now pin the sniffed value and still go red on base.

The `comment_lines` retarget to `release_25.1` (P2 1) isn't a code change, so it isn't on this branch.

- `d4a7755b8ec` Hide sel datatype from upload and describe it. Sets `display_in_upload="false"` and `description="BayeScan selection output"` on the `sel` entry.
- `6777f3cb916` Test discovered sel outputs keep their datatype. Adds a `discover_sel_ext` framework tool that discovers `bayescan.sel` via `__designation_and_ext__`, asserts `ftype="sel"`, and is registered in `sample_tool_conf.xml`.
- `b47ddbc1ebe` Make metadata_defaults comment counts differ from action defaults. Writes 2 and 1 comment lines against defaults of 7 and 3 and asserts the sniffed counts.
