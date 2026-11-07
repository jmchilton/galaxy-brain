# Polish debrief

Polished `issue_215_draft_port_edges` without code changes, so the branches stay at galaxy-tool-util-ts `c2e6868e` and gxformat2 `103fc22`. The strengthening round corrected several of the description's numbers. I reran each correction below before applying it.

## Steps

- **Descriptions.** Wrote [`pr_description.md`](pr_description.md) and the [gxformat2 one](../../../../gxformat2/branches/active/issue_215_draft_port_edges/pr_description.md). Before and after output comes from the same CLI, built at `main` `f5470fe5` and on this branch.
- **Strengthening round, one subagent, Claude Opus 5.5 at high effort.** It found no development that would strengthen the pitch. Applied:
  - **"Only place" overclaim.** `gxwf mermaid` shows step-level edges, so the headline now says "in the work list".
  - **Port counts.** 14,262 ports in 402 files became 14,197 in 337 real files (223 distinct). Still 0 unwired or default-only.
  - **`consumed by` count.** 193 of 302 became 192 of 303. The old count also matched a `_plan_context` line.
  - **Parity count.** 5,163 items became 51,943, because the old walker stopped at the first step on list-form `steps`. Still 0 Python and TS differences. Old and new match in both languages too, which removes a hedge.
  - **`$link`.** The old scan only walked `state`. None of the 337 real drafts has `$link` anywhere in a step. A `TODO_*` in port whose only value is `{$link: ...}` passed on `main` and now fails, which the description now says.
  - **New evidence.** None of the 303 results has an in port sourced from a `TODO_*` output, which shows why Foundry's proposed flag would never print.
- **Misreadings answered with new highlighted sentences:**
  - only `TODO_*` ports in `GalaxyWorkflowDraft` files are affected;
  - `draft-validate` already catches a dangling ref after the rename;
  - Foundry's drafty-source flag isn't here because it would never print;
  - why a gxformat2 reviewer sees this first.
- **Titles and tags.** In `pr_titles.md` and `pr_tags.md`, in both records.
- **Earlier debriefs.** Corrected the numbers in `implementation_debrief.md` and `thermo_nuclear_review.md`, marking each correction. `subagents/normal_review.md` keeps its "0 of 189" as that review's own result.

**Not applied:**

- Rerunning Codex on the final heads. It reviewed `7358147` and `d447be46`, so it hasn't seen its own fix or the refactor. The refactor's output is identical across the corpus, and the description says what Codex didn't see.
- "Recorded as a follow-up" for `$link`: no issue exists, and filing one is John's call, so I dropped the phrase.

## Checks at the final heads

- **galaxy-tool-util-ts:** `pnpm -r --no-bail --filter='!@galaxy-tool-util/gxwf-e2e' test` passes except 3 `integration-tests` failures (`validate_iwc_repeatmasking_stale_rejected`, `validate_legacy_encoding_skipped_2`, disconnected-optional RuntimeValue), the same 3 recorded on `origin/main` `f5470fe5`. Lint, format, typecheck, knip and sentinel checks passed in the thermo-nuclear round at this same head. gxwf-e2e wasn't run. CI runs on PRs only.
- **gxformat2:** `pytest` 954 passed, 8 skipped; `ruff check`, `black --check` and `mypy` on `draft.py` clean. **Fork CI has no result on any SHA:** runs have sat queued since 20:53 UTC, and each push cancelled the previous ones.

## Differential review snapshot

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy-tool-util-ts/branches/active/issue_215_draft_port_edges/differential-review/snapshots/20261106T235928Z-polishing-c2e6868e57a4.json
  polishing @ c2e6868e57a4 vs origin/main (merge-base f5470fe5ac3b)
  since 20261106T232458Z-hardening-c2e6868e57a4:
    commits: 4 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   21 carried, 0 changed, 0 new, 0 dropped
```

## Questions for John

- **`Fixes #215` and the survey count.** The issue says the survey "can" count ports sourced from a drafty output. I left it out, but the first TS commit says `Fixes #215`. Is the count wanted, or does #215 close without it?
- **Corpus wording.** Most of the real drafts are in the private `foundry-runs`, so outsiders can't rerun the numbers. The descriptions say "Foundry and its run archive". Is that acceptable in a public PR?
- **`$link`.** Should `consumed by`, ordering and validation follow it? A dangling `state` `$link` passes silently, though no real draft uses one. It would touch three call sites in two repos.
- **Foundry docs.** Should foundry#668 item 2c go up as its own PR?
- **"Has a default".** Validation requires non-null, while the extract cascade only checks the key is present. Which should win?
