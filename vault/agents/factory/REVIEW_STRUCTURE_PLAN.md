# Review Structure Plan

Move review findings from Markdown to one YAML file per round, render them on the record landing page with include checkboxes, and compose posted responses statically from that file plus John's notes. Trim stays an agent step, and runs only when the review branch must be rewritten or text must change.

## What the current records show

Measured on Galaxy records, 2026-11-07.

| Finding | Evidence | Consequence |
|---|---|---|
| John's edits are nearly always the top note | Most of the 25 active responses differ from their first commit by that one line | Separate note files fit real use |
| Findings do get reworded | #24745 "reword P1 1", in a session | The composer needs a rewording path that isn't hand-editing its output |
| Notes cite finding numbers | #23522 "P2 3 and P3 1 below"; #24635 "P3 3" | Renumbering on a toggle would silently break notes |
| Trim reasons are never given | 8 records have `Trimmed by John`; 0 entries have `Reason:`; several formats | Toggle-only is enough; no required reason |
| Other Actions text never appears in history | 0 committed cases, but trim blanks the section, so this is weak evidence | Replace it with launcher input instead of keeping a field |
| Finding-to-commit mapping is only prose | "Fixed on the review branch in…" in 53 responses | The gate needs this as data |
| Trims reuse branch numbers | 10 records have more than one `review_*_branch_details.md`; one has `round_1/` | Branch number and round are different things |
| Placeholder text survives | 24407, 24484 and 24635 still hold "(space for John's…)" | "Empty" can't mean whitespace only |
| Respond ignores the checklist | `PROCESS_RESPOND_TO_INITIAL_REVIEW.md` never reads it | Today, unchecked but untrimmed findings get posted |
| Findings can't be split mechanically | 458 findings in 96 files; about half are one run of paragraphs then provenance, with no issue/fix marker | No backfill |

YAML spike, on throwaway copies:

- A toggle through `parseDocument`, `setIn` and `toString` changed exactly 1 line in all 96 files when the YAML was machine-written. On agent-styled YAML it rewrote 14 lines. Splicing the value's byte range changed 1 line.
- The spike's lossless round trip proves only that YAML holds these strings. It doesn't show that the Markdown converts into the proposed slots.
- A dedented block scalar, a bare colon (`title: No E2E: test`) and tab indentation all fail to parse.
- One mistake parses cleanly: inside a block scalar, a dedented `Note: the guard…` ends the text and becomes a new key, truncating the finding silently. A closed schema turns this into an error. Reusing an existing key name is already a parse error.

## Target files

```
vault/repositories/<repo>/reviews/<status>/<pr>/
  review_<N>_findings.yml            verifier-written; John toggles include and actions
  johns_review_<N>_comment_note.md   John's words for the PR comment or review
  johns_review_<N>_pr_note.md        John's words for the review-branch PR body
  risks.md, *_review.md, *_debrief.md, human_review.md, follow-up issues: unchanged
```

`N` is the review round. A trim stays in the same round, so notes survive it. Reviewer reports for later rounds stay in `round_<N>/`, as #24635 does.

Both notes exist from the start: the coordinator creates the comment note every round, and the PR note whenever there's a review branch. They start empty, and the landing page previews the composed PR body beside them. Writing a PR description is then just editing a file, with no rework step.

Review branches name both the round and the revision: `pr_<pr>_round_<N>_rev_<m>`. A trim bumps `m`, and a new round starts at `rev_0`. Today `pr_<pr>_review_<m>` counts both, and nothing tells them apart; the fork has 251 `_review_0` and 32 `_review_1` branches. No code parses the name, only test fixtures, so this is a doc change. The YAML records `round` and `branch.revision` too, so code never parses names. Existing branches keep their names.

These go away for new rounds: `verified_review.md`, `filtered_findings.md`, `verified_findings_checklist.md`, `initial_review_response.md`, `initial_response_action.md`, `initial_review_agents.md`, `*_branch_details.md`, `initial_pr_description.md`.

### Schema

A strict, closed decoder in `review-factory/src/model.ts`: unknown keys are errors at every level. No JSON Schema file, because nothing on the TypeScript side bundles a validator, and compose and the landing page must refuse the silent dedent case too.

```yaml
round: 0
reviewed_commit: 5006c8fbfe3a91c7f12f628fdd543c478f1854fa
agents:
  - {profile: default, path: _shared/reviewers/default.md, model: Claude Opus 5.5, effort: medium}
verification: {model: Claude Opus 5.5, effort: medium}
followup_target: dev
branches:   # one entry per revision, latest last; earlier branches stay on the fork
  - name: pr_24706_round_0_rev_0
    revision: 0
    head: 52762db7f56
    commits:
      - {sha: 3bb64ff4f45, findings: [P2 1]}
      - {sha: 8741677b84e, findings: [P3 2]}
  - name: pr_24706_round_0_rev_1
    revision: 1
    head: f003e6c059e
    pr_title: Review fixes for history size sorting
    description: |
      One readable paragraph on what the branch does.
    commits:
      - sha: 8429fb00bf1
        subject: Add an E2E test for sorting the history list by storage used
        detail: Clicks the real button against the real server guard.
        findings: [P2 1]
actions:
  approve: false
  approve_and_merge: false
  comment: false
  review_comment: false
  request_changes: false
  pull_request: false
  push: false
  issue_refactor: false
  issue_galaxy_brain: false
findings:
  - id: P2 1
    include: true
    title: No E2E test for sorting by storage used
    summary: One line for John, never posted.
    implementation_verified: true
    issue: |
      Issue paragraph.
    issue_details: |
      Optional.
    evidence: |
      Optional.
    fix: |
      Suggested fix paragraph.
    fix_details: |
      Optional.
    discovered_by:
      - {profile: default, model: Claude Opus 5.5, effort: medium}
  - id: F1
    include: false
    filtered: {category: relitigates_pr, reason: One line.}
    title: Additive extraSortOptions prop instead of the ListHeader change
    summary: One line for John.
    discovered_by:
      - {profile: default, model: Claude Opus 5.5, effort: medium}
```

- `id` is assigned once and never renumbered: `P<priority> <n>` for candidates to post, `F<n>` for verifier-filtered items. Gaps in a posted review are fine; they show findings were filtered. Priority comes from the id. Changing a priority is a trim-agent rename that updates `branch.commits[].findings`; the citation gate catches notes still using the old id.
- `branch` elsewhere in this plan means the latest `branches` entry. Earlier entries keep each dropped finding's commit, so it can be restored.
- `include: false` with `filtered` means the verifier kept it out. Without `filtered`, John dropped it. A separate file wouldn't work, because a one-line toggle can't move a finding between files.
- `filtered.category` is one of: `disproved`, `not_actionable`, `relitigates_pr`, `pre_existing`, `comment_nit`, `doctest`, `prop_vitest`. These are the verifier's existing rules.
- Multi-line strings must be block scalars (enforced), and titles with `: ` or a leading backtick must be quoted. The verifier must pass `review-factory validate` before finishing.
- Models are display names (`Claude Opus 5.5`, `GPT-6.1`), never API ids; records mostly use display names already.
- Every `discovered_by.profile` must appear in `agents`, which supplies its link path.
- Short SHAs that look like numbers (`1234567`, `8e12345`) are read back as text.
- Findings render in the documented order: issue, issue details, evidence, fix, fix details, then the fix commit link and provenance. Most records follow it; #24706 puts evidence after the fix.

## Static tooling

A new top-level package, `review-factory/`, named after the process it runs. Its bin and build follow `differential-review/`, which stays about source review. `vault/agents/_shared/scripts/` doesn't fit: it holds shell and Python helpers, while this code is TypeScript that both plugins bundle. The pure modules have no Node imports.

What it reuses:

- **Record paths**: `site/src/lib/records.ts`.
- **Git helpers**: `differential-review-lib/src/cli/git.ts` (`tryGit`, `revParse`), imported as `capture.ts` does.
- **Plugin launch path**: `CLI_BIN_DIRS`. Herdr's detached runner gets generalized from capture to any CLI, rather than copied.

| Module | Job |
|---|---|
| `model.ts` | Parse, find the latest round, list included and excluded |
| `toggle.ts` | Byte-range splice of `include` or an action; parser injected, as `task-list.ts` does |
| `compose.ts` | Comment body and PR body as strings; carries the template now in `PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md` |
| `gates.ts` | Pure cross-field gates, run live on the landing page and by `validate` |
| `branch-gates.ts` | Git and `gh` gates, run at compose time |
| `cli.ts` | `validate`, `status`, `compose comment [--pr-url <url>]`, `compose pr` |

The landing page's status and preview use only the pure modules. Branch gates fetch from the fork and call `gh`, so a button that runs them goes through Herdr's detached runner, not a plain `exec` with its 30 s limit.

`compose` prints to stdout and writes nothing to the record, so there's no generated file to hand-edit. To change posted words, edit the note, or have the agent edit the YAML.

Validation has one home per kind of check: shape in `model.ts`, cross-field rules (unique ids, `F` ↔ `filtered`, profiles in `agents`, branch manifest ids) in `gates.ts`. `make validate` runs `review-factory validate vault/repositories`, building the bundle first if it's missing.

### Where findings go

| Checked | Comment or review body | PR body |
|---|---|---|
| A comment type only | Comment note, Human Review, agent details, risks, findings, branch block, follow-up | None |
| A comment type + Push | Same; fix links point at commits that now sit on the PR | None |
| A comment type + Pull request | Comment note, Human Review, link to the PR | PR note, agent details, risks, findings, branch block, follow-up |

With Pull request checked, the findings go only in the PR, so the comment on the reviewed PR stays short.

Pull request mode has two steps: `compose pr`, open the PR titled `branch.pr_title`, then `compose comment --pr-url <url>`. This replaces `PROCESS_REWORK_REVIEW_TO_PR.md`.

Human Review is filled in from `human_review.md` at compose time, into the comment, since it's about the reviewed PR. No process doc carries Human Review instructions any more.

### Gates

`compose` reports every failure at once and outputs nothing if any applies.

**Always:**

- The YAML parses and matches the schema.
- Exactly one comment type is checked.
- The comment note isn't empty after removing whitespace, HTML comments and the old placeholder text.
- Every included finding has a `P` id, `issue` and `discovered_by`.
- Each `P<n> <m>` cited in a note is an included finding.
- Agent-written text has no `@name` outside code spans. John's notes are exempt.
- The body is within GitHub's 65,536 character limit. The largest active response is 31.5 KB.
- `summary` and `filtered` never appear in output, enforced by test.

**Whenever the branch is mentioned or used:**

- `git rev-list <reviewed_commit>..<branch.head>` exactly matches `branch.commits`.
- `branch.head` is what John's fork has.
- No listed commit claims an excluded finding. A commit shared by an included and an excluded finding also refuses, with a pointer to trim.

**Pull request:** the PR note isn't empty and the branch has commits. Pull request and Push can't both be checked.

**Push:** the same branch checks, and the push must be a fast-forward. This gate matters most, since it stops dropped work reaching the author's branch.

**Warnings:**

- The PR head has moved past `reviewed_commit`.
- `human_review.md` names a different SHA.

## Landing page

Shown when the record has a `review_*_findings.yml`, in Obsidian's record strip and in Herdr's `record.ts`.

- **Status line**, from `status`, for example `Ready to comment` or `✂️ Trim needed: P3 2 is still on pr_24706_round_0_rev_0`.
- **Findings**: checkbox, id, title and summary, expanding to the full text. Filtered items are collapsed under their own heading, with the reason showing.
- **Notes**: links to both note files, each marked empty or not.
- **Actions**: checkboxes; ones that can't apply (no branch, no follow-up file) are hidden.
- **Previews** of the composed comment and, when there's a branch, the PR body, plus the existing launchers.
- **A parse error**, shown as an error rather than an empty list.

Writes:

- **Herdr**: a new `AppRequest` in `herdr-plugin/src/app-host.ts`, through `editNote` (a write loses to any change since the read) with a path guard like `isCrackFile`. This keeps the YAML parser out of the app's heap.
- **Obsidian**: built-in `parseYaml` gives no ranges, so `yaml` moves from devDependencies to dependencies and `main.js` (475 KB today) grows.
- **Agents**: the trim agent re-reads the file before writing and never sets `include` or `actions`, so John's toggles win.

## What a trim must change

`status` compares the `include` toggles with the latest branch manifest and prints the work:

- **Drop**: a commit on the latest branch whose findings are all excluded.
- **Restore**: an included finding with no commit on the latest branch, but one on an earlier revision. Cherry-pick that commit.
- **Ask John**: a commit shared by an included and an excluded finding.
- **Nothing**: an included finding with no commit anywhere. Not every finding gets a fix, since only fixes under about 200 lines do.

For example: `✂️ Trim: drop 3bb64ff4f45 (P3 2), restore 4d58215bb82 (P3 4)`. The trim agent follows that list, and then appends the new revision to `branches`, which empties the list. Drop and restore are mechanical, so a later script could do them, leaving the agent only conflicts, rewording and promoting `F` items.

Action checkboxes play no part in this. They say what Respond does, and Pull request and Push always use the latest revision, after the branch gates pass.

## Process changes

- **Initial review**: the verifier writes the YAML and validates it. The coordinator adds `agents` and creates the empty notes. The low-effort compose subagent goes away.
- **Toggle with no branch impact**: if the excluded findings have no commits on the branch, no agent is needed, because compose already leaves them out.
- **Trim**: runs when `status` says the branch must be rewritten, when John re-includes an `F` item, or when John wants rewording. The launcher takes free text through `<user_input_here>`, replacing Other Actions. It rebuilds the branch as the next `rev_<m>` and updates `branch`, with no renumbering.
- **Re-including an `F` item**: the toggle is allowed, but compose refuses until trim verifies it and gives it a `P` id and full text. Most filtered items are one line today.
- **Respond**: run `compose`, stop on any refusal, post the output unmodified. Posting stays an agent step at first.
- **Trim sweep**: reads `discovered_by` and `include` directly, with no git archaeology.

## Progress

**Phase 0, done 2026-11-08.** Items 1–8 below are in the process docs:
- Respond refuses unchecked checklist boxes and the placeholder.
- Branches are `pr_<pr>_round_<N>_rev_<m>`, with `round_<N>_rev_<m>_branch_details.md`; each commit names its finding, and trim keeps ids.
- Checklist lines carry a summary, and models use display names.
- Every launcher file has ✂️ Trim.
- `REVIEW_FACTORY.md` no longer says findings are renumbered.

**Phase 1, library done 2026-11-08.** `review-factory/` has 62 tests.
- Golden #24706: `src/fixtures/24706/expected_comment.md` has exactly the lines of the posted response. Only the evidence blocks move, and a test pins that.
- The closed decoder caught a real error in the hand conversion: an unquoted comma in a flow mapping split a reason into a bogus key.
- Not done: generalizing Herdr's detached runner. It moves to Phase 2, where the first button needs it.

**Phase 2, landing page built 2026-11-09.**
- `review-factory/src/landing.ts` `landing(ctx)` is the panel model both apps share, with `noteLabel` and `statusTone`. `review-factory/src/panel.ts` loads a record directory's panel and validates edits for both apps. Expanded finding text reuses compose's `findingBody`.
- `review-factory check --record <dir>` prints every refusal and warning compose would give for the checked actions, with git. Respond runs it first.
- Herdr: `herdr-plugin/src/detached.ts` is the generalized detached runner. Capture now uses it, and so does `findingsCheck`, which runs `review-factory check`. `herdr-app-mod/src/findings-panel.ts` draws the panel in `gb-record`, including a 🔍 Check before posting button.
- Obsidian: `obsidian-plugin/src/findings-strip.ts` draws the same panel in the record strip, desktop only, and toggles through `vault.process`. `yaml` is now a dependency. `main.js` grew from 475 KB to 743 KB, with one `yaml` copy.
- Site: a review record's page renders the comment that its findings YAML composes to.
- Pilot: #24794 ran its initial review and landing on YAML, but John merged it without Respond, so compose has never posted to a real PR. The first new round's Respond is the real pilot; preview it first.
- Not done: John's click-through in both apps.

**Phase 4, default flipped 2026-11-09.** New rounds write `review_<N>_findings.yml`.
- `PROCESS_INITIAL_REVIEW.md` absorbed the pilot overlay, `PROCESS_FINDINGS_YAML.md`.
- Trim and Respond lead with the YAML flow, and keep a "Rounds on Markdown" section for rounds already in progress.
- File Docs, `SUGGESTED_TASKS.md`, `SWEEP_REVIEW_TRIMS.md`, `AGENT_MARKERS.md` and `REVIEW_FACTORY.md` name the new files.
- All 12 `reviews/LAUNCHERS.md` lost 🔁 Rework, and their ✂️ Trim takes `<user_input_here>`.
- Phase 5 still deletes `PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md` and `PROCESS_REWORK_REVIEW_TO_PR.md`, and the "Rounds on Markdown" sections, once no active record needs them.

## Cutover

The switch is per round, based on whether `review_<N>_findings.yml` exists. There's no backfill, the same precedent as `FACTORY_LANDING_PAGES_PLAN.md`. Roughly ten unposted active records finish on the old flow, and a later round on an old record uses the new one.

### Phase 0: small changes first

See the next section.

### Phase 1: library

Build `review-factory/` with tests, without changing any process.

Red to green:

- Splice changes one line on hand-styled YAML, reusing the spike's fixture.
- Schema rejects a bad priority id, an unknown action, and an unknown key, including the dedented `Note:` line from the spike.
- `gates.ts` rejects duplicate ids and an included `F` item.
- `status` lists drop, restore and ask-John work for a two-revision manifest, and nothing once the latest revision matches the toggles.
- Golden compose: hand-convert #24706 (11 findings, 10 commits, filtered items) to YAML and compare with its `initial_review_response.md`, apart from the top note. Hand conversion is needed because issue and fix aren't marked in the Markdown. Reuse that real record as the fixture rather than inventing one.
- Golden compose: a no-findings record, covering the PR number mod 3 line.
- PR mode: both bodies, with the findings only in the PR.
- Every gate refuses when it should, using a temporary git repository as `differential-review-lib/src/cli/test-repo.ts` does: excluded commit on branch, manifest mismatch, unpushed head, empty and placeholder notes, empty PR note, stale citation, `@name`.
- `summary` and `filtered` text never reach output.

- Herdr's generalized detached runner still passes `review-host.test.ts`'s capture tests, and runs a second command.

Add `make review-factory-build` and `make review-factory-test`, and add `review-factory validate` to `make validate`.

### Phase 2: landing page

Add the panels to both plugins, with no record yet using them apart from a test copy. They use `parse.ts`, `toggle.ts`, `landing.ts` (status line) and `compose.ts` (previews). Generalize Herdr's detached runner here, and use it for the compose buttons' branch gates.

Tests: the rendering model in the pure layer (`render.test.ts` style for Obsidian, `record-page.test.ts` for Herdr), and the host request and path guard in `app-host.test.ts`. Then `make plugin-test herdr-plugin-test herdr-app-mod-test`.

John clicks through the #24706 copy in both apps, since agents can't drive the app windows.

### Phase 3: pilot

Update the process docs behind a one-round instruction and run one real review end to end, previewing before anything posts. Fix what the pilot exposes, especially verifier YAML errors and summary quality.

### Phase 4: flip the default

Everything that names the old files:

- `_shared/PROCESS_INITIAL_REVIEW.md`, `PROCESS_TRIM_FINDINGS.md`, `PROCESS_RESPOND_TO_INITIAL_REVIEW.md`, `AGENT_MARKERS.md`
- `_defaults/reviews/FILE_DOCS.md`, and the Galaxy one if needed
- `gx_reviews/SUGGESTED_TASKS.md`: Respond to Reviews and Needs Follow Ups, which can then read `actions` exactly
- `factory/SWEEP_REVIEW_TRIMS.md`
- All 12 `reviews/LAUNCHERS.md`: drop 🔁 Rework, add ✂️ Trim to the 11 without it
- `factory/REVIEW_FACTORY.md`, a public page whose diagram shows the checklist flow
- Site: `REPOSITORY_FILES_PATTERN` and `OPENABLE` are Markdown-only, so findings need a render or they vanish from the site

Run `make validate test site-test` afterwards.

### Phase 5: remove legacy

When no active record is on the old flow, delete `PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md` and `PROCESS_REWORK_REVIEW_TO_PR.md`, and move the old names into the "Older records use" line in File Docs.

## Small changes worth making before the cutover

Process-doc edits, each useful now, and each one tests an assumption above.

1. **Respond refuses unchecked findings.** Stop if `verified_findings_checklist.md` has unchecked boxes that weren't trimmed. This closes a real gap today, and it's the most valuable of these.
2. **Respond refuses a placeholder.** Stop if the response still has "(space for John's…)". 24407, 24484 and 24635 hold it now.
3. **Verifier names the finding on each commit** in `review_<n>_branch_details.md`. Helps today's trim, and shows whether commits really map cleanly to findings.
4. **Trim stops renumbering.** Decided: ids are permanent, and gaps are fine.
5. **Branches name round and revision**, as `pr_<pr>_round_<N>_rev_<m>`. Edit `PROCESS_INITIAL_REVIEW.md`, `PROCESS_TRIM_FINDINGS.md` and the File Docs. A round already in progress keeps its old names until it ends.
6. **Verifier adds a one-line summary** to each checklist line. Shows whether summaries help before tooling depends on them.
7. **Standardize provenance model names.** Three spellings exist now: `Opus 5.5`, `Claude Opus 5.5`, `claude-opus-5-5`. Display names chosen: 614 uses against 535 and 408.
8. **Add ✂️ Trim to the other 11 launcher files**, if non-Galaxy reviews will happen before Phase 4.

Not worth doing first: landing checkboxes against the old Markdown files. Much of that work would be thrown away, and the old files are on their way out.

## Later, out of scope

- Static posting, once Respond has proved it only runs commands. Its ordering and side effects deserve their own review.
- `anchors: [file:line]` on findings, linking to differential review hunks.
- Promoting John's differential review threads into findings.
- Structured `discovered_by` as the data for the "review awards" `TODO.md` item.
- Delivery state in the YAML instead of prose in `index.md`.

## Unresolved questions

Decided 2026-11-08:

- N is the round.
- Both notes are pre-created.
- With PR checked, the findings go only in the PR, and the comment stays short.
- Human Review is automated.
- IDs are permanent, with gaps allowed.
- The tooling is a new package, `review-factory`, not part of `differential-review`.
- Branches are named `pr_<pr>_round_<N>_rev_<m>`, starting in Phase 0.
- Filtered findings go in the same YAML.
- The manifest keeps every revision, so a trim can restore re-included findings.
- Action checkboxes live in the findings YAML's `actions:` and toggle from the landing page.
- A comment type is always required.
- Comment-only with a dropped finding still on the branch refuses until trim.
- A PR head that moved past the reviewed commit only ever warns.
- The site renders findings YAML through the composer.
- Notes are edited in Obsidian for now.

Still open:

1. Pilot on which PR? Recommend the next small Galaxy review.
