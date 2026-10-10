Recommendation: keep the implemented scope—an isolated accessibility prototype, audited legacy exceptions, viewport review tools, and a qualified visual-testing pitch. Treat a local visual pilot, component repairs, and upstream CI as separate follow-ups; none is needed to satisfy this request.

## As implemented: strict accessibility defaults with audited legacy exceptions

Fork `vitest_story_play`, add the matching accessibility addon, audit body-level teleports, retain the normal axe rulesets plus WCAG 2.2 AA, and provide desktop/panel/mobile viewport presets. Record the 121 observed failing stories as explicit `todo` exceptions while the remaining 115 retain strict checks; document visual options and migration value without adding screenshot baselines or changing the active conversion lanes.

| Pros | Cons |
| --- | --- |
| • Delivers the requested bells and whistles in an isolated branch.<br>• Gives clean and future stories a useful failure gate.<br>• Keeps observed debt visible and explains migration use. | • `todo` suppresses all CLI accessibility diagnostics for an excepted story.<br>• Presets do not create an automated viewport matrix.<br>• No upstream enforcement or demonstrated pixel comparison yet. |

<details>
<summary>Limits to preserve in the pitch and handoff</summary>

The 121 exceptions represent failing story states, not 121 distinct component defects. Automated axe checks cover only some accessibility issues and run against the final visible play state. New stories normally inherit `error`, but story spreads can inherit an existing exception; the README and audit explicitly explain resetting clean states. Keeping these limits visible is sufficient for this exploratory scope. A green browser run should not be presented as full accessibility coverage.

The user asked to explore what visual testing could have contributed to the BootstrapVue/Vue 3 migration before developing that sales point. The pitch therefore appropriately explains plausible protection, baseline timing, final-play capture, and hosted versus local options without claiming a historical bug would certainly have been prevented.
</details>

## Smaller: advisory accessibility everywhere

Install the addon and documentation but make every story advisory, avoiding the many inline exceptions. This would reduce the change surface but also remove the useful strict default that the current prototype has shown can catch an unnamed body-level control and a target-size violation.

| Pros | Cons |
| --- | --- |
| • Smaller source diff and fewer annotations to maintain.<br>• Existing stories remain runnable immediately. | • No failing CLI gate for new or previously clean stories.<br>• Makes accessibility easier to overlook.<br>• Gives up a concrete benefit already established by this experiment. |

## Different debt policy: preserve CLI visibility for legacy violations

Replace story-wide `todo` with a mechanism that records or compares legacy violations while still failing on newly introduced findings. This is a possible hardening effort if the prototype becomes a long-lived test system, rather than a prerequisite for demonstrating the standard addon.

| Pros | Cons |
| --- | --- |
| • Keeps legacy findings visible outside the UI.<br>• Could catch new regressions in excepted stories.<br>• Provides a clearer debt trend over time. | • Requires custom reporting or baseline machinery and a policy for unstable findings.<br>• Broadens infrastructure beyond the documented addon switches.<br>• Needs additional tests and maintenance ownership. |

<details>
<summary>Why this is a separate follow-up</summary>

The story-wide exception is the material compromise in the implemented scope: it is not a rule-level baseline. Adding a new defect to one of those states will not fail CLI accessibility checks until its exception is removed. For this prototype, an explicit audit and accurate documentation are adequate; an upstream rollout should deliberately decide whether that compromise remains acceptable. Globally disabling noisy rules would hide findings in clean stories too and is a weaker alternative.
</details>

## Larger: a small local visual-regression pilot now

Add deterministic screenshot comparisons for a few migration-critical states at desktop and narrow-panel widths, then demonstrate a CSS change failing pixels while behavior still passes. Use local Vitest screenshots to avoid requiring a hosted account or credentials.

| Pros | Cons |
| --- | --- |
| • Supplies the strongest visual sales artifact.<br>• Exercises real capture, baseline, and diff-review costs.<br>• Makes migration protection tangible. | • Adds baseline storage and capture-environment decisions.<br>• Requires deterministic state/viewport selection and screenshot review.<br>• Moves beyond the current request's emphasis on assessing possibilities first. |

<details>
<summary>Suggested next experiment</summary>

Start with a primitive and one real form, including a long label or validation error and an open overlay left visible after its play. Keep fonts, fixtures, browser and viewport fixed, and show a deliberate spacing or clipping regression. Create baselines before the implementation swap; screenshots created after a completed migration cannot reconstruct its earlier appearance.
</details>

## Larger: repair the accessibility backlog in this branch

Fix the shared controls and component markup that cause the observed failures, then remove the associated exceptions. Shared-control fixes could clear many stories at once, but their behavior and appearance deserve focused review independent of this infrastructure experiment.

| Pros | Cons |
| --- | --- |
| • Improves the actual user experience.<br>• Expands strict coverage as exceptions disappear.<br>• Repeated findings can guide high-impact fixes. | • Broadens into application and shared-library behavior changes.<br>• Mixes enablement with many independent defect fixes.<br>• Increases coordination risk with active conversion branches. |

## Larger: upstream CI and hosted visual review

Add a browser CI gate and, if selected separately, a Chromatic project with visual baselines and an accept/reject workflow. This is rollout work requiring repository policy, baseline ownership, and potentially an external account decision.

| Pros | Cons |
| --- | --- |
| • Makes checks enforceable on future changes.<br>• Provides repeatable visual artifacts and review.<br>• Converts a prototype into a shared maintenance workflow. | • Adds CI time, installation and artifact policy.<br>• Hosted visual review requires account/project setup and service decisions.<br>• The current branch intentionally has no PR or upstream rollout intent. |

## Review considerations

The supplied correctness and test review summary identified inherited MSW parameter overwrites, which were repaired within scope; preserving existing story behavior is ordinary implementation work, not a scope expansion. No reviewer-requested application fixes, cloud integration, or CI gate remain unaddressed by this scope assessment. Reported negative controls and addon screenshots support the usefulness of the chosen configuration; final suite/build results remain the implementation owner's validation responsibility.
