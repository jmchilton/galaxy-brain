# #23426 [RFC] Subworkflow design bug report

https://github.com/galaxyproject/galaxy/pull/23426. Branch `subworkflow_mapping_per_step_semantics`,
which was the crash-fix half of the #23369 split. Draft. Opened 2026-09-01, closed by John
2026-09-03. Not merged. +256/-1 across 5 files.

## What happened

- John repurposed the stripped-down #23369 branch into an RFC. The editor treats a subworkflow as
  a function: every step maps over the input shape. The scheduler treats it as inlined: only steps
  the mapped input actually reaches get mapped. So `map_over(sub, list)` gives different output
  types in the two.
- mvdbeek engaged within ten minutes. He asked first about a stray `modules.py` change ("Does that
  affect the bug that the test is supposed to show?"). John answered: "That was fixing the bug
  down the path we don't want to implement… I'll strip it."
- Fixture naming confused him: `consume_*` read as "takes a list, produces an output", so it was
  renamed to `cat_*`.
- He then questioned the premise from first principles: "as a standalone, doesn't it produce
  `(list<dataset>, list<dataset>)`?" and "I think this is where I struggle to know what should
  happen."
- John admitted the test wasn't clear. The agent had "pushed it without me looking". The
  framework test "fails on the unrelated bug… so that actual framework test isn't even expressing
  this problem correctly."
- What worked was a two-row table setting editor semantics against scheduler semantics. It
  reached agreement within the day. mvdbeek: "The callable boundary model is probably easier to
  reason about… that's ultimately very much what we want… Maybe now is the time to fix that,
  though it does seem hard to very hard?"
- John closed the RFC to implement the fix. The implementation became #23676, now a draft whose
  description says "***I just don't understand this PR***" and which has serious performance
  constraints.

## Did it stall?

As an RFC, no: in two days it got a design decision from the right person. The stall comes
**after** it, in #23676. The cost is carried forward:

- the decision lives only in RFC comments;
- the acceptance criteria were never written down;
- the implementation is now too large to explain.

## What could have prevented the downstream stall

1. **Open with the table, not the test.** The table produced agreement; the test produced
   confusion. In an RFC, lead with the smallest statement of the disagreement:
   - signature;
   - inputs;
   - "editor says X, scheduler does Y".

   Add tests only as supporting evidence.
2. **Don't send unreviewed agent artifacts as evidence.** The stray `modules.py` fix, the
   misleading `consume_*` names and the test that failed for an unrelated reason each cost a
   review round. John hadn't looked at the test before pushing it. An RFC especially needs
   evidence the author has personally vetted.
3. **Make the test fail for the reason in the title.** If the framework test can't express the
   disagreement yet, use the editor terminal tests plus the table, and say plainly that the
   runtime test is blocked by bug Z.
4. **An RFC belongs in an issue or discussion, not a code PR.** A PR invites line comments on
   code that was never meant to merge. #22200 or a new issue would have kept the decision durable
   and linkable after the PR closed.
5. **Record the decision and the conditions attached to it before implementing.** mvdbeek agreed
   *conditionally*: "hard to very hard", plus the breakage worry John raised. Those should have
   become written acceptance criteria before #23676 began:
   - production workflows that change behaviour;
   - performance budget;
   - migration and flag strategy.

   Instead #23676 opened with those as open problems.
6. **Plan the implementation as a stack from the start.** "Callable boundary semantics" is a model
   change. The `mapping_axes_model` → #23676 split arrived later, as repair. Had the RFC ended
   with "foundation PR (axes model, no behaviour change), then behaviour PR, then perf", #23676
   might not have reached "I don't understand this PR".

## Signal

RFCs work with this reviewer when they are small, concrete and comparative; that part succeeded.
The failure is in carrying the decision across to implementation: agreement in a closed PR's
comments isn't a spec. Write down the decision and the conditions attached to it, then size the
implementation stack against them.
