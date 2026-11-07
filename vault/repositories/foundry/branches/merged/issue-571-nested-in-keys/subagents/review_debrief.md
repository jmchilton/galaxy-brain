# Review debrief: `issue-571-nested-in-keys`

Reviewed `fd8662cc` against `origin/main` `7453431d`; fixed at `a0c22945`, pushed to `jmchilton`.

Two reviewers independently found that the note's map-form sentence was wrong, and I reproduced it. A map-form step whose `label` differs from its key has no reference that both validation and conversion accept, so I cut that case per the plan's stop rule and drafted [upstream issue text](../upstream_issue_gxformat2.md). I also added the repeat's `state` entry to the note, stated the nested key rule in step 3 of the Mold, narrowed the reference's trigger, added one eval property, and corrected the `step_id/output_id` phrase and the debrief. The branch can ship with that case left out.

**The ~4,000-line recast is acceptable.** It costs disk and diff noise, not context: `SKILL.md` gains two lines and the files load only when opened. Two reviewers said keep it and one said drop the reference. I kept it because step 5 already cites the note and needs it in the bundle. The domain review's real point, that a trigger firing on a third of steps is a poor way to deliver one rule, is met by moving the rule into step 3.

## Not acted on

- **Drop the reference entirely (domain).** Step 5's citation would need removing too, and the list-form rule would have no home in the cast.
- **Small companion-free stub note (domain fallback).** A new note for two sentences saves disk only.
- **Reword the note's opener about the companion (domain P3 1).** Pre-existing text, and the new trigger doesn't send agents to the schema.
- **Eval properties for nested keys and connection step names (default P2 2, partly).** I added only the repeat entry. Per the domain review, `draft-validate --concrete` already rejects wrong keys (I didn't rerun that check), and a step-name property should wait for the upstream resolvers to agree.
- **Change the `galaxy-workflow-draft-format` example.** Untouched by this branch; John's call alongside the upstream issue.
- **Live Galaxy import.** Not run by anyone. The issue text says to do it before filing.

## Disproved

- Default review, "Claims verified": `ortho_method|input` isn't in the workflow. It is, as an `input_connections` key on steps 5/6 through 5/9 (a subworkflow) at IWC `980fc00`. The plan was right and the debrief's correction was wrong. `input_type|i` is also there, so the note needs no change. I corrected the debrief; `skunkworks_plan_review.md:59` still repeats the error.

<details><summary>Verified findings</summary>

Full reports: [initial_review.md](initial_review.md), [domain_review.md](domain_review.md), [risks.md](risks.md).

### P1 1: The map-form sentence teaches a reference conversion rejects (implementation verified)

Raised by default and domain. The note said the step part is the map key "even when the step also carries `id` and `label`". `validate_draft` and `gxwf draft-validate` agree, but `python_to_workflow`, which Galaxy's import calls at `lib/galaxy/managers/workflows.py:857`, resolves that step by label.

My own runs, on 0.28.0 and 0.29.1, confirmed the converter half across list and map forms. On 0.28.0 (Galaxy's pin) `validate_draft` resolved the key and rejected the label; `gxwf` 1.15.0 did the same on my two map drafts. Reported by reviewers and not rerun by me: the `--concrete` and `gxwf convert` behaviour, and the failing `nf2g-demo-rerun-7-10` run workflow.

Fixed in `23786f05`: the note now states only the no-`label` map case.

### P2 1: The repeat's `state` entry was missing (implementation verified)

Raised by default. Without the entry the connection does nothing and the job can still succeed, which the pattern page states and `route_missing_pick_from` pins. My scan of IWC at `980fc00` found 917 repeat-instance connections and no missing entries. Fixed in `23786f05`, with an eval property in `a6266231`.

### P2 2: The rule sat behind a trigger firing on a third of tool steps

Raised by domain, and by default as P3 1. Domain's scan reports 1,157 of 3,258 IWC tool steps with a `|` key; I read the script but didn't rerun it. Fixed in `a6266231`: the rule is in step 3.

### P2 3: The trigger and purpose missed the note's other use

Raised by default and domain. Neither mentioned the `rename:` use step 5 cites. Fixed in `a6266231`. The map-plus-`label` part of domain's trigger is deliberately left out, because the note no longer answers that case.

### P3 1: `step_id/output_id` conflicted with the new paragraph

Raised by default and risk. Now `step/output`, fixed in `23786f05`.

### P3 2: The records were wrong or silent

The debrief's "isn't an upstream disagreement" and `ortho_method|input` claims are corrected, and the debrief and PR description now state the size of the recast.

</details>
