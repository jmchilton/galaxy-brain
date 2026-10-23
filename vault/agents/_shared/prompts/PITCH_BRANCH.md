You will be given a branch and optionally extra context.

Come up with a pitch - probably this is ultimately targeted at a pull request but we're not there yet so stay a little higher level where it makes sense.

The work should be pitched as a cohesive whole - if the pitch contains branch archeology not explicitly asked for - probably it is wrong for the branch.

This is not a technical/instruction manual - if the branch lacks a clear source of documentation - note this as something that would help the pitch - do not add to the pitch.

Give a subagent this context and ../PITCH_ADVICE.md and write out the pitch to `<BRANCH_AS_UP_CASE>_PITCH.md`.

Next, give another subagent the pitch file and the implementation and ask for advice to strengthen the pitch and in particular what new development could be done to strengthen the pitch and how the development would strengthen the pitch. This subagent should write out `<BRANCH_AS_UP_CASE>_PITCH_REFINEMENT_PLAN.md` if it has ideas - if it doesn't that is fine also. Don't ask for work that won't strengthen the pitch. This subagent should not modify the original pitch but instead report back to you.

If that subagent has concrete suggestions for the current pitch - please modify it.

Report to the user: a summary of the pitch, the files created, and, if ideas were generated, possible next steps to refine it.

