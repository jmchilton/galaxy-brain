# PR #790 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `a84e0df5ce5c8893c6569ed1ed1bfd1d11da2925`
- Scope: `git diff origin/main...HEAD` (7 commits, `packages/summarize-nextflow/src/resolver.ts`, tests, changeset)

The workflow fixtures (`workflow-fixtures/pipelines`) and `node_modules` are not present on this machine, so the rnaseq/sarek/bacass integration tests were not run. The findings below come from reading the code and probing the new helpers in isolation.

## Summary

The five fixes are small and targeted, and each comes with a synthetic unit test plus a real-pipeline assertion. Fixing brace matching at its root (`extractBlockAt` now skips comments) is the right call. The main concerns are two new pieces of logic that are broader than the bugs they fix. First, `stripTrailingLineComment` also runs on profile values whose comments were already masked, so it can cut real string content. Second, swapping the name-based test-input rule for a file-extension rule adds new false positives and false negatives. Both should be tightened before merge.

## Findings

### P2 1: `stripTrailingLineComment` truncates profile string values and duplicates `maskNextflowComments`

`parseNfTestParamValue` now calls `stripTrailingLineComment`, and `candidateParamData` also uses it for profile values (`delta[name] = parseNfTestParamValue(value)`, resolver.ts ~2589). Those values come from `resolveParamExpression`, which has already removed the quotes, and the profile config was already passed through `maskNextflowComments` in `expandedProfileConfig`. So a real comment can never reach this point. Any string that happens to contain a space followed by `//` gets truncated instead. For example, `multiqc_title = 'A // B'` yields `params_delta.multiqc_title === "A"`. The code comment ("Profile values arrive with quotes already removed, so only a spaced // is a comment") acknowledges the ambiguity but resolves it in the wrong direction.

The new 25-line scanner also re-implements quote-aware `//` detection, which `maskNextflowComments` (resolver.ts:513) already provides.

Suggested fix: keep `parseNfTestParamValue` a pure literal parser. In `parseParamsOverrides`, mask the raw nf-test block first, e.g. `extractNamedBlock(maskNextflowComments(text), "params")`. The masked comment becomes trailing whitespace, which the existing `(.+?)\s*$` regex already trims. Then delete `stripTrailingLineComment`. The three new nf-test comment/URL/null unit tests should still pass as they are.

### P2 2: Extension-only test-input rule drops the name signal and admits dotted non-path strings

`isCandidateInputParam` now reduces to "has a 1-8 character alphanumeric suffix after the last `.` that isn't a size or time unit." Probing `isPathOrUrlValue` directly:

- New false positives: `WBcel235.105` (snpEff db style), `GRCh38.p14`, `3.24.0`, `0.5` (when quoted), `user@example.com`, and `github.com` / `https://nf-co.re` all count as paths. Any quoted config param with such a value now becomes a test input, with `normalizeCandidatePath` accepting it because the value contains a `.`. Before this PR only params whose names matched the input regex were exposed. Now every name is, apart from the outdir/email/help denylist, which is anchored, so `email_on_fail` is not excluded.
- New false negatives: values without an extension are now always rejected, even for names the old rule matched by name, such as `input`, `*_db`, `database`, `reference_*` and `genome`. Examples are `https://…/kraken2_db/`, `s3://…/star_index` and other directory-valued references and URLs.

The rnaseq counts (9 → 11) look right on that pin, but the unit test only covers the positive case plus `aligner = 'star'`. Nothing pins the negative cases above.

Suggested fix: combine the signals instead of replacing one with the other. Accept a value if it looks like a path or URL (has a `/`, a URL scheme, `${projectDir}`, or a known data extension) **or** if the name matches the old input/fixture pattern. Reject bare dotted tokens that have no `/` and no known extension. Add unit cases for a version-like value, a genome key, and a directory URL.

### P3 1: The boolean guard in `isCandidateInputParam` is dead code

`/^(?:true|false)$/` can never matter: `isPathOrUrlValue("true")` already returns false because the value has no `.` suffix. Remove the guard, or keep it only if P2 2 brings back a name-based branch that needs it.

### P3 2: `main.nf` genome-attribute scan accepts non-`params.` assignments and hard-codes the entrypoint

`GENOME_ATTRIBUTE_CONFIG_CANDIDATES` adds `main.nf`, but the `params.` prefix in the pattern stays optional. That is fine inside config `params {}` blocks. In a `.nf` script, though, a local `def fasta = getGenomeAttribute('fasta')` or `ch_gtf = getGenomeAttribute('gtf')` would be recorded too, and the `else` branch would invent a new `file-path` param for it. The file is also not comment-masked, so a commented-out assignment counts as well.

There is a sibling inconsistency too: `pipelineDefaultParams` reads `selectEntrypoint(pipelineRoot)`, while this scan hard-codes `"main.nf"`.

Suggested fix: for `.nf` sources, require the `params.` prefix, run `maskNextflowComments` first, and use `selectEntrypoint`.

### P3 3: nf-test `null` clears a value but profile `null` does not

`candidateParamData` now deletes a value when an nf-test override is `null`. A profile assignment `x = null` is still ignored, though: `resolveParamExpression` returns `null`, and `parseAllParamAssignments` then `continue`s, so the pipeline default survives. nf-core test configs commonly null out cache params (e.g. `vep_cache = null`). The two override sources now disagree. This is pre-existing code, but the PR's rule ("null clears a profile value") is only half applied. Consider handling `null` in `parseAllParamAssignments` the same way, or note it as a follow-up.

### P3 4: `extractBlockAt` now duplicates the quote and comment state machine in `maskNextflowComments`

The fix itself is correct. But the two scanners now share nearly identical quote, triple-quote, escape, `//` and `/* */` handling. A small shared lexer helper would keep them from drifting, which is how this bug arose: `extractWorkflowBlocks` keeps inline comments with `maskNextflowComments(text, true)`, and `extractBlockAt` didn't know about them. This is optional.

## Notes (not findings)

- The integration assertions use exact counts (`toHaveLength(20)`, `56`, `11`). They are pinned to fixture revisions, so they will need updating whenever a pin moves. That is acceptable, since it is how drift gets noticed.
- The bacass test now expects `assets/test_config_dfast.py` as a local input. The PR description calls this out, and it follows from the new rule.
- The changeset is present and scoped as a patch.
- The primary workflow moving from `PREPARE_GENOME` to `NFCORE_RNASEQ` is called out as deferred to part 3. Not re-litigated here.
