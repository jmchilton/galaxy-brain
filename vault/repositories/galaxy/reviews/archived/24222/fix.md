# P2 fix — preserve raw tool searches

On 2026-10-17 John authorized implementing and pushing a straightforward correction directly to the PR author's branch.

The existing UI already disables tag and ontology pickers for Boolean and mixed searches that the structured editor cannot preserve. The correction extends that guard to all nonempty searches containing unparsed text, including plain keywords, favorites aliases, and unknown fields. Empty searches and recognized structured filters remain editable. No new query-combination semantics are introduced.

## Validation

Added `fastqc`, `#favorites`, and `unknown:term` to the existing mounted-component regression coverage and asserted both actual dropdown buttons are disabled. These three cases failed before the fix. After the fix, all **150 tests across nine focused/consumer suites passed**, including structured-tag application/removal and clearing the search to re-enable pickers. Used `NODE_OPTIONS=--no-experimental-webstorage` for the local Node/happy-dom setup. Prettier and `git diff --check` passed.

Pushed commit `2cc6fd033cb` to `bgruening/galaxy:tool_list_tag_list`. Repository pre-commit checks, including client ESLint, passed. The worktree is clean. This resolves the initial P2 finding and supersedes its unposted review draft. Risk remains low: a reversible correction to an existing UI guard, without new API or persistence behavior.
