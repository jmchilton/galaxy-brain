Fix Tool Shed metadata reset so sample files cannot become executable tools or make historical revisions validate against the repository tip.

Resetting metadata should recover the tools a repository actually shipped. Two API regressions demonstrate where it currently changes that history:

| Repository contents | Before this fix, after reset | With this fix, after reset |
| --- | --- | --- |
| A `filter_tool.xml.sample`, followed by a real column-maker tool | The sample becomes an additional `Filter1` tool | Only the real column-maker tool is advertised |
| Tool versions 1.0 and 2.0 with different table definitions and `.loc.sample` files | Historical 1.0 tool metadata disappears | Both versions retain their revision-specific metadata |

***This repairs Tool Shed repository metadata generation; it does not change Galaxy dataset metadata or add an upload API.***

Sample copies now live in the existing validation context's temporary tool-data directory, outside the repository clone being scanned. Reset also reads samples from the revision currently checked out, rather than preferring files from the tip.

## Risks

Reset persists metadata, so repositories that relied on the old sample handling can receive different tool listings and validation results.

<details><summary>Risk Details</summary>

- Sample-only XML files stop appearing as executable tools after reset.
- Historical tools validate against their own samples; an ordinary root `.loc` file no longer substitutes for a required sample file.
- The shared metadata generator also serves installation/update paths. Those paths retain separate sample staging, with cleanup now owned by the existing validation context.
- No schema migration or API shape change is introduced. Reverting the code would not itself restore metadata already reset.

</details>

<details><summary>Risk Review Advice</summary>

Review the separation of repository paths from temporary validation paths, and the intentional revision-local sample selection. The API regressions cover the two observed reset failures; installed-repository paths also deserve attention because they share the generator.

</details>

## Context

Extracted from the [Tool Shed upload dry-run work](https://github.com/jmchilton/galaxy/tree/issue_24441_tool_shed_upload_dry_run) so this repair can target `release_26.1` independently. ***This covers sample staging and revision selection; upload-wide table-validation policy and preservation of every empty metadata row remain separate decisions.*** Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Retained the complete sample-isolation repair.</summary>

Both scan contamination and tip-sample selection belong to this repair. Broader upload policy and empty-row retention changes were left separate.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The existing validation context owns temporary samples and their cleanup.</summary>

Reviewed reset, installation/update callers, path conversion, and exception cleanup. No blocking findings or additional production changes.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Both regressions fail at metadata assertions with the release-base generator and pass with the fix.</summary>

Moved both scenarios to the public repository API suite and removed branch-only unit scaffolding. The complete repository API suite passed 40 tests; Tool Shed unit tests passed 99, with 12 skipped.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The behavior-preserving path and cleanup preparation precedes the fix.</summary>

The leading commit keys repository path handling on <code>files_dir</code>. The following fix separates that directory from sample staging; no further baseline refactor was needed.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Reset can advertise a sample-only tool or lose historical tool metadata despite completing.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Public API tests check tools and versions by changeset.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test coverage</summary>

The two regressions in <code>TestShedRepositoriesApi</code> exercise upload, metadata retrieval, and reset through existing API helpers. Both fail on their observable metadata comparisons with the original generator, without relying on branch-only APIs.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
