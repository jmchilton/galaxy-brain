Things to consider below - understandable I think fixing this is more important than holding up this up so feel free to merge as is and follow up if you're interested. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, Opus 5.5, low effort, reviewed commit deed873a70a.

Mostly a two-way door, but registering the new `sel` datatype extension is a small one-way door: once 26.2 datasets carry `ext="sel"`, removing or renaming it later strands those datasets.

<details><summary>Risk Details</summary>

- `sel` becomes a public datatype (`display_in_upload="true"`, `galaxy.datatypes.data:Text`); histories, workflows, and tool wrappers will start depending on the name, so it is effectively permanent.
- Registering a niche, BayeScan-specific extension in the sample config to work around 26.2's unknown-extension normalization sets precedent for adding one-off extensions whenever a wrapper's discovered file ext breaks; other unregistered-ext wrappers will still get `data`.
- `IntParameter.marshal` unwrapping singleton lists applies to every int metadata element and every input path (API metadata edits, extended-metadata round trips), not just output metadata actions; `[3]` is now accepted where it was rejected. Easy to revert, but it widens accepted API input.
- On a release branch: behavior change is narrow and test-covered (unit cases plus `metadata_defaults` framework/extended-metadata test), so rollback cost is low.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether `sel` deserves a permanent registered datatype (and whether `display_in_upload="true"` is wanted) versus fixing the output-extension normalization generally; the datatype name is the hard-to-undo part.

The `IntParameter` change is reversible; confirm the singleton-list unwrap belongs in the shared parameter rather than where output metadata action defaults are comma-split.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24535_review_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24535_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24535_review_1) is built on the reviewed commit `deed873a70a`. It changes the `metadata_defaults` fixture so the file's comment-line counts differ from the action defaults. Its assertions now pin the sniffed value and still go red on base.

The `comment_lines` retarget to `release_25.1` (P2 1) isn't a code change, so it isn't on this branch.

- [`87c69955d9a`](https://github.com/jmchilton/galaxy/commit/87c69955d9a) Make metadata_defaults comment counts differ from action defaults. Writes 2 and 1 comment lines against defaults of 7 and 3 and asserts the sniffed counts.

</details>

</details>

### P2 1: Integer-metadata fix belongs on `release_25.1`, not `release_26.2`

The PR says the Chopin2 failure is 26.2-only ("passing on release_26.1"), but that's no longer true. The strict `IntParameter.marshal` came in with `72dcfbe09dd` (#24357, base `release_25.1`) and was hardened in `f9c022e2d6e`. It's now at the heads of `release_25.1`, `release_26.0` and `release_26.1`. On each of them, `Tabular.comment_lines` uses `param=IntParameter`, and `MetadataToolOutputAction.apply_action` still runs `.split(",")` on the default. So `default="7"` reaches `marshal` as `["7"]`, and job creation raises `RequestParameterInvalidException`. A fix that lands only on 26.2 leaves three release branches broken, because merges only flow forward.

<details><summary>Details</summary>

- Scope is wider than Chopin2. In tools-iuc `main`, `cat` (`tools/cat/macros.xml`, 7 outputs) and `arriba` (`tools/arriba/arriba.xml`) also use `comment_lines` metadata actions and hit the same crash. This PR's unwrap fixes all three.
- tools-iuc CI pins `GALAXY_BRANCH: release_26.1` (`.github/workflows/pr.yaml`, `ci.yaml`). Those wrappers should be red there now. The 26.1 pass the PR cites probably came before the forward-merge on 2026-10-27.
- No release tag contains `72dcfbe09dd` yet. Retargeting now keeps the regression out of every shipped point release.

</details>

<details><summary>Evidence</summary>

- `git merge-base --is-ancestor 72dcfbe09dd origin/release_{25.1,26.0,26.1}` succeeds for all three branches.
- `git tag --contains 72dcfbe09dd` is empty.
- `origin/release_25.1`: `tabular.py:98` has `param=IntParameter`, and `output_actions.py:345` has `).split(",")`. `release_26.0` and `release_26.1` have the same code (lines 346 and 347).
- On the `release_26.2` `metadata.py`, the `metadata_defaults` framework test fails with `RunToolException: Expected an integer, got ['7']`.

</details>

Split the PR. The `metadata.py` change goes to `release_25.1`, along with its `test_tabular.py` rows and the `metadata_defaults` tool and its registrations. The `sel` registration stays on `release_26.2`, since the coercion it answers (`a43a281d4fa`, #23866) exists only there.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>

### P3 1: `metadata_defaults` can't tell sniffed `comment_lines` from the action default (implementation verified)

The fixture writes exactly 7 and 3 `#` lines, which match the action defaults `7` and `3`. Its `comment_lines` assertions therefore pass whichever value wins. In practice, `Tabular.set_meta` overwrites `comment_lines` from the file contents at job finish, so the action default doesn't persist on an `ok` dataset. The test proves the crash at job creation is gone, but it reads as though the default is applied.

Review branch commit `87c69955d9a` writes 2 and 1 comment lines and asserts those sniffed values. Both metadata paths agree on them, so the fixture now pins which value wins. It still goes red on base. `set_meta` also sniffs `column_types`, and the data rows still sniff to the same types the action sets, so those assertions still pass whichever value wins.

<details><summary>Evidence</summary>

- With the mismatched counts and the old assertions: `expected [7] but found [2]` and `expected [3] but found [1]`.
- With the updated assertions:
  - Framework run: 1 passed.
  - `test_extended_metadata.py -k "test_tools and metadata_defaults"`: 1 passed.
- With the `release_26.2` `metadata.py`: `RunToolException: Expected an integer, got ['7']`.

</details>

Fixed on the review branch in [`87c69955d9a`](https://github.com/jmchilton/galaxy/commit/87c69955d9a).

<details><summary>Discovery & Verification Agent Details</summary>

Found during verification, from John's regression-analysis research. Verified via Opus 5.5 at medium effort.

</details>
