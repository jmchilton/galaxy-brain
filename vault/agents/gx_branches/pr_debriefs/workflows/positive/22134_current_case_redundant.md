# #22134: Add API tests proving __current_case__ is redundant at execution time

https://github.com/galaxyproject/galaxy/pull/22134. Merged. +113/-0 in 1 file. Tests only.

## What happened

- **2026-03-16 14:42:** opened as a draft. The body has two parts:
  - two test cases (wrong `__current_case__`, which Galaxy corrects on import; missing `__current_case__`, which Galaxy
    recomputes);
  - a numbered **code walkthrough** with file and line citations (`DefaultToolState.decode()`,
    `params_from_strings()`, `Conditional.value_from_basic()` at grouping.py:791, `get_current_case()` at
    grouping.py:761), ending "The incoming __current_case__ from the .ga file is dead data."
- **18:29:** John marked it ready and linked the unrelated failing test to its own fix PR (#22138).
- **20:09:** mvdbeek approved with an empty body and a 🎉 on the PR. He merged it a minute later. Open to merge was
  about 5.5 hours; ready to merge about 1.7 hours.

## Why it landed well

- **It is a pure proof PR.** It changes no behavior and only pins down a fact. That fact unblocks later tool-state
  simplification (dropping `__current_case__` from formats) without arguing for the simplification here.
- **The walkthrough is process evidence the reviewer can check.** Each claim has a line number, and the tests confirm
  the reading at runtime.
- **The red CI was explained before review** by pointing to the PR that fixes it.

## Reusable signal

- **Land the proof first, as its own tests-only PR.** This is the clean form of "split proofs from arguments". The
  later argument can cite a merged test.
- A cited code walkthrough plus a test is the right shape for "the agent says X is dead code".
- **Praise tier: silent-positive.** The approval was empty, with only an emoji. Don't read it as enthusiasm for the
  direction, only as "obviously fine".
