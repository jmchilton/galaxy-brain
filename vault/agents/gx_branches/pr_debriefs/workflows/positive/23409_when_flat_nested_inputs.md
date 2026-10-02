# #23409: Stop exposing flat nested inputs in workflow when expressions

https://github.com/galaxyproject/galaxy/pull/23409. Merged. +72/-18 across 4 files, 1 commit.

## What happened

- **2026-08-20:** John opened issue #23333 first. mvdbeek replied there: "Haha, i only saw this now. Thanks for the
  fix, that sure is/was a problem!"
- **2026-08-29 14:38:** the PR opened as a draft. The first paragraph:
  - explains the mechanism;
  - names the leaked spelling as "an implementation detail escaping into a public expression API";
  - **answers "seen in the wild?" up front**: it "appears nowhere in the public Galaxy, IWC, GTN, or gxformat2
    workflow corpora".
- The body then gives a three-line code block of spellings showing which one stops resolving, a list of what is
  preserved, a test description, the exact pytest command, and an explicit note on the compatibility break.
- **14:47 (9 minutes later):** mvdbeek approved while it was still a draft, with **"Looks great. What happens when you
  (or your agent, who look to invent stuff) upload a workflow like that, is the error message readable ?"**
- **15:22:** John answered frankly that there is no error on upload and runtime gives a silent "always run". He also
  laid out a three-PR sequence: block bad expressions → expression inference → editor logic. He proposed merging this
  one and doing validation later. mvdbeek gave it a 👍 and wrote **"Sounds good to me! Even just tracking this as a
  backlog item is fine to me."**
- **2026-09-01:** John filed tracking issue #23424, then marked the PR ready and merged it himself. Open to merge was
  about 3 days.

## Why it landed well

- **An issue came first and the reviewer agreed on the problem** before any code was reviewed.
- **The corpus search was in the description.** It pre-empted "is this hit in the wild?" with checkable scope (four
  named corpora).
- **The spelling table shows the change at a glance** and leaves no room for interpretation.
- **It is narrow and subtractive.** It removes one alias, keeps everything else, and names the compatibility break.
- **The readable-error follow-up was answered honestly and quickly**, then turned into an issue (#23424) before merge.
  That is pattern 6 ("turn agreement into artifacts") done right.

## Reusable signal

- This is the template the problem-PR checklist asks for: symptom first, a comparison table, "who hits this" with
  evidence, and a minimal scope.
- **Expect the readable-error question on any change that rejects or alters input.** Answer it in the description
  next time.
- **Contrast with #23816 and #23817, its own follow-ups:** the follow-ups stalled once the scope grew into
  support-policy questions. This first, narrow piece is the part that landed.
- **Praise tier: warm, not effusive.** "Looks great" was followed straight away by a probing question.
