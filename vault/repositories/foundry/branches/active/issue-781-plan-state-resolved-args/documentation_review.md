Run via Claude Opus 5.5 at high effort.

# Documentation review — issue-781-plan-state-resolved-args

Skill: `.agents/skills/foundry-documentation/SKILL.md`. Reviewed the authored Markdown in `df991d0d..32673995`. Fixes are in `6ee481d2` (content), `84f946b8` (casts regenerated with `make casts`, not hand-edited) and `52762228` (eval and scenario follow-ups from a self-check). The [domain review](domain_review.md) had already removed semicolons and self-justifying clauses, so this pass covered what it left.

## Changed

- **Broken line wraps and run-ons in two eval properties.**
  - summarize-nextflow "effective arguments follow Nextflow selector priority": rewrapped, the parenthetical rank ladder became a sentence, and the profile clause was split in two.
  - Template "source arguments reach `_plan_state` unchanged": rewrapped and split into sentences.
  - No clause was dropped or loosened. Each check was compared with the old text one clause at a time.
- **advance eval.** "then by validation the ledger holds…" now reads "the ledger holds, by the time validation runs, a record for each flag of every entry `_plan_state` listed. Each such record's `source_arg`…". The meaning is the same. A first rewrite attached `source_arg` to the entry, so it was re-checked and fixed in `52762228`.
- **summarize-nextflow profile clause.** "the root declaration keeps its position" now reads "the profile entry replaces only that selector's root entries, at the root declaration's position", which matches the Mold body and schema note.
- **One wording for the rank ladder.** "`withLabel` < `withName` on the process name < `withName` on the alias < `withName` on the whole call path" now appears the same way in the Mold body, eval, `changes.md` and schema note. Before, it alternated between "process `withName`", "on the process" and "whole path".
- **"Disposition" defined once.** The ledger's **Source arguments** opener now says a disposition is a `carried` or `not_applicable` decision, a `kind: dropped` entry, or a tie's open gap. The Molds use the word for all four, but the `disposition:` field covers only the first two. Which records are required is unchanged. "Open gap" was kept because `kind: gap` is the ledger's existing term.
- **Stale "free text" claims, outside the diff.** The skill requires checking related pages after a change. Three places said `_plan_state` is always free text, and each now notes the structured source arguments:
  - the draft-format note's `_plan_*` intro;
  - the opening of the template's `refinement.md`, where "currently emits free-text…" was also dropped;
  - the `galaxy-workflow-draft` schema note bullet. This one is a wording fix with no revision bump.
- **Template body.** The paragraph after the `_plan_state` bullets did three jobs, so it is now three paragraphs: the carrier format, the scope (config-set arguments only), and Resolved steps. "The flag is the source evidence" now reads "the flag wins, since it is source evidence", which matches implement's wording.
- **Smaller fixes.**
  - summarize-nextflow body: "Then the later declaration…" now reads "Among entries still level after that, the later declaration…", which makes the tiebreak order explicit.
  - `changes.md` rev 21: the garbled appositive "…, the legacy parser's order and a caveat under the strict parser, except…" was untangled.
  - Changeset: reordered so "for each call and `key`" attaches to `effective_args`.
  - implement: "every entry already takes effect" now reads "every listed entry takes effect". The scenario's imperative "Add the summary…" was rewritten as fixture text.
  - Template rnaseq scenario: an inline code span that wrapped across lines was rewritten.

## Not changed

- Archaeology in `changes.md` and the schema note's "Revision 14" section. These sections exist to record history.
- "convergence gate". This is a technical use of "gate", not a human approval step. The semicolon in the template's `description` was already on `main`.
- Revision numbers and dates. The revisions are unreleased, and earlier passes on this branch edited them in place. A new bump would only change `Dashboard.md`.
- Eval `assertion` fields stay as paragraphs. No eval in the repo nests bullets under `assertion`.
- Questions the domain review left open: the `_plan_state` string carrier, a CLI check for flag records, and the older abstract scenario cases.
- Generated casts were regenerated, never edited by hand.

## Gate

`make -k check` at `84f946b8`: 496 tests pass, and `check-generated` and `check-casts` are green. `52762228` only edits eval and scenario prose, which casts don't include. `make validate check-casts check-generated` is green on it. It is red only on `validate-roadmap`, from live roadmap drift that predates the branch, and on `check-vendored`, which fails only on this machine. Pushed to `jmchilton`.
