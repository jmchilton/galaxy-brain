Draft comment for [#224](https://github.com/jmchilton/galaxy-tool-util-ts/pull/224), to post once the PR into the fork branch is open. Not posted; waiting for John's go-ahead. `<PR>` is the fork PR's link.

---

Thanks for this! It covers the same ground as a branch we had for #210, and it adds the output `ftype` check we had deferred.

Rather than open a competing PR, I've opened <PR> into your branch. It keeps your commit and adds ten small ones on top. The main reason is false positives. We ran both branches over Galaxy's `lib/galaxy_test/workflow` tests, which all pass in Galaxy, and over IWC. `e82bc455` reports 25 errors on the Galaxy tests and 3 on IWC (4 with `--datatypes`). With the PR, both report 0 new errors:

- 24 of the Galaxy errors are collections that Galaxy maps the workflow over: a `Collection` on a `data` input, or `list:list` on a `list` input. These are now warnings, and that test's output checks are skipped.
- `pick_value_skip_pja` expects `expression.json` from a skipped output. Outputs of steps that can be skipped no longer get a fixed format.
- IWC asserts collections with `element_tests` and no `class`, as planemo allows. These now count as collection assertions.
- Without `--datatypes` the filetype check never ran, so the PR bundles a usegalaxy.org datatypes snapshot as the default. Filetype mismatches become warnings.

Each commit message explains one change, so feel free to push back on, or drop, any of them. If you'd rather, I can push the commits straight to your branch, but that needs "Allow edits by maintainers" turned on.

***Posted by agent [workflow_libs](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/workflow_libs/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
