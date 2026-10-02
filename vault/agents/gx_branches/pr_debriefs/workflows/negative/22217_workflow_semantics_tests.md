# #22217 Expanded workflow tests for semantic clarification

https://github.com/galaxyproject/galaxy/pull/22217. Branch `workflow_semantics`. Closed by John
2026-03-23, about 23 hours after opening. Not merged. +631/-2 across 19 files.

## What happened

- The PR carried tests only: about 10 framework and API tests, written by an agent that compared
  "facts" from #22200 against existing tests. The real deliverable, the semantics doc, stayed
  in an external gist.
- mvdbeek reviewed the next morning and pointed at specific overlaps: a job-cache test that
  belongs with the tool tests, a format test that "seems like a tool test", and two tests already
  covered by named existing tests.
- His summary was: "most seem like (partial) duplicates of things we already test?" and "I am
  not sure the agents fully understand what is a duplicate?"
- John explained why the duplicate search was scoped to workflow tests only. He proposed putting
  "confirms tool behaviour inside workflows" tests in their own labelled file. mvdbeek agreed
  ("for sure that makes a lot of sense to me 👍") but repeated "I'd like to only test things
  once".
- John closed the PR the same day. Nothing replaced it. #22200 still has no PR.

## Why it stalled

1. **The PR was a by-product, not the deliverable.** #22200 asks for documentation of workflow
   semantics. The PR shipped the tests that fell out of that research and left the doc in a gist.
   With no doc in the tree, each test had to justify itself as a regression test, and several
   couldn't. (`projects/workflow_semantics/WORKFLOW_SEMANTICS_STATUS.md` §2 reaches the same
   conclusion.)
2. **The duplicate search was narrower than the reviewer's idea of a duplicate.** The agent
   searched workflow tests. mvdbeek's rule is "test the most direct route", which means the tool
   tests count too. The agent's search was never shown in the PR, so the reviewer couldn't check
   the claim "I looked for duplicates". He could only spot-check, and the spot checks failed.
3. **The PR asked the reviewer to judge test coverage, which is the one thing agents are worst at
   showing.** "Is this a duplicate?" turns on judgement. Without evidence (which existing tests
   were compared, and why each one differs), every test is a debate.
4. **It was closed before the agreed compromise was tried.** The labelled-file idea was approved
   in the thread, but the PR closed before anyone acted on it, and the whole effort went dormant
   for six months. It closed quickly mostly because the PR felt wrong, not because the review
   blocked it.

## What could have prevented it

- **Lead with the doc artifact** (the `workflow_semantics.yml` + `semantics.py` approach in the
  status note's PR-B). Each test should be cited from a semantic fact it pins. A test with no fact
  is visibly orphaned, and a fact with an existing test needs no new one.
- **Publish the duplicate search as evidence.** For each new test, list the closest existing
  tests across tool, API and framework tests, with a one-line reason it differs. That later became
  `scripts/workflow_test_similarity.py` (branch `workflow_test_similarity`). Had it existed before
  the PR, the reviewer's objection would have been answered in advance.
- **Apply the reviewer's venue rule before opening.** Ask whether each test could be a tool test.
  If yes, drop it, or file it as a deliberate "confirms in workflow context" test with a stated
  rationale.
- **Open smaller.** The first PR could have held only the 2–3 tests that are clearly
  workflow-only and new (for example the `visible`/`deleted` framework assertion support plus
  skipped-step outputs). That would have built trust in the method before the rest arrived.
- **Push the PR you've agreed on rather than closing it.** A reviewer's 👍 on a compromise is
  momentum. Converting it into a revised commit the same week costs less than restarting later.

## Signal

The PR left the reviewer to verify a claim about the agent's process ("we checked for
duplicates"), and nothing in the PR let him check it. When agent research produces the work, put
the research evidence in the PR, not only its output.
