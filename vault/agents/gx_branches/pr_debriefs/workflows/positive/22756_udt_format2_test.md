# #22756: [26.1] Framework test for UDTs in Format 2 Workflows

https://github.com/galaxyproject/galaxy/pull/22756. Merged. +55/-8 across 9 files.

## What happened

- **2026-05-23:** opened. The body predicts its own red CI: "I think this will be red and will prove
  galaxyproject/gxformat2#218 is needed and should land and belongs in 26.1."
- The diff is one framework workflow fixture (an inline user-defined tool) plus gxformat2 pin bumps across packages.
- **2026-05-26:** mvdbeek posted "@jmchilton retargeted and gxformat2 PR merged". The reviewer retargeted the branch
  and merged the upstream PR himself.
- **2026-05-27:** John said it was ready.
- **2026-05-28:** mvdbeek approved with **"Very nice!"** and merged it. Open to merge was about 5 days, most of it
  waiting on upstream and the release branch.

## Why it landed well

- **A deliberately red test was used as evidence.** It turned "gxformat2 #218 belongs in 26.1" from an argument into
  a demonstration.
- It is tiny, a single fixture, and covers a feature (UDTs in Format 2) that mvdbeek also works on.
- The reviewer did the release logistics himself. That is a sign of buy-in, not mere tolerance.

## Reusable signal

- **"This test is red until upstream X lands" is a strong way to argue for a backport.** It shows the failing case
  first, which is the "lead with evidence" hypothesis in its purest form.
- **Praise tier: warm-routine** ("Very nice!"). His actions (retargeting, merging upstream) say more than the words.
