Run via Claude Opus 5.5 (general-purpose review subagent).

**Coordinator:** acted on finding 1, and on finding 2 in the admin docs. The "Refusing tools with findings" section now says why each of Galaxy's own tools is exempt: each writes values Galaxy sets itself. It also gives the severity at which each would otherwise be refused (set metadata high, history tools medium, data fetch low, upload medium and low), and says tool patches can name only the upload tool. These changes are folded into the own-tools commit. The rebase onto the amended shared commit came first: the set metadata path now resolves through the real `lib/galaxy/tools` directory, a point the sibling branch's review raised.

Not acted on:
- **Finding 2, config wording.** The config description still says "unless a tool patch applies to them". It is true, and the docs carry the detail.
- **Finding 3, no re-populate within one Galaxy version.** Changing the exempt rule doesn't force a re-populate. This code is unreleased, so there are no deployed indexes built under the old rule. Correctness holds either way: the populator rejects a `None` review for a tool that is now reviewed.
- **Finding 4, two exempt rules between S and the last commit.** The decision stays in its own last commit.

# Review: shared plumbing rebase, `tool_patches_static_findings` `40ba66ef2a6` (from `4f54ef8c934`)

No MUST-FIX findings. No security issue.

## Findings

1. **SHOULD.** The "Refusing tools with findings" bullet said the upload tool was "the one the review would otherwise refuse". That is stale with the larger exempt set. `set_metadata_tool.xml` has a high `shell-injection` on the hidden `__SET_EXTERNAL_METADATA_COMMAND_LINE__`, so it would be refused at the default `high`. The history tools have medium `argument-injection`, and import also has `template-import`. upload1 has only medium and low findings, so it is refused only at `medium` or `low`.
2. **NIT.** "unless a tool patch applies to them" suggests any of the six tools can be patched. `REFUSED_LOCAL_PREFIXES = ("CONVERTER_", "__")` means only upload1 can.
3. **NIT.** The freshness token adds only `REVIEW_VERSION`, so changing the exempt rule within one Galaxy version does not force a re-populate. Correctness holds:
   - the populator fast path rejects `None` for tools that are now reviewed;
   - materialization with `kept=None` re-reviews.

   The cost is a re-review on each materialization until the next populate.
4. **NIT.** The commits between S and the last one still use the old `in_directory(lib/galaxy)` rule while S already ships `is_galaxy_own_tool`. This only matters for bisecting.

## Checked and fine

- `reviews_tool`, `with_static_review` and `static_review_is_current` agree on the populator, materialization and eager paths. The new exempt set is a subset of the old one, so no stored review becomes stale in the other direction.
- realpath is used on both sides, and the hidden-lib paths resolve from `__file__`. Copies are reviewed and links are exempt. A tool with `path=None` is reviewed.
- At `medium` or above, no collection operation, sample sheet tool or converter has a finding. At the default `high`, 26 bundled stock tools are refused, as intended.
- Dropping `replace(before)` is safe: nothing mutates a `Report` after it is built.
- Per commit, across all 48 commits from S to the head, there are none of these:
  - `galaxy.tools.security_review`, `security.codes`, `RefusalCode`, judge or `Assessment` references;
  - lost `stored_source_path` hunks;
  - import failures (each tree was extracted with `git archive` and its key modules imported);
  - ruff errors.
- The commit list differs from the old head only by the planned drops, the new S commit and the planned rewrites.
- Unit tests: 470 passed in the reviewer's run.
