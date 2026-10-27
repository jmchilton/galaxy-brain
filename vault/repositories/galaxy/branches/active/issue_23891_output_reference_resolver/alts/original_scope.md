# Alt: original_scope

Branch: `issue_23891_output_reference_resolver_alt_original_scope` on the `jmchilton` remote, at `f323237f519`.

This is the branch as it stood after re-hardening, before the scope evaluation expanded it. It already has the rebase, the test challenge, the Codex `value_from` fix, the thermo-nuclear cleanups and the baseline refactor split.

How the parent differs: it adds one commit (`272d0922542`). That commit generalizes the format_source reference linter over the attribute and adds an `OutputsMetadataSourceReference` linter. Without it, a bad `metadata_source` is a profile 26.2 load error that the linter never warns about.
