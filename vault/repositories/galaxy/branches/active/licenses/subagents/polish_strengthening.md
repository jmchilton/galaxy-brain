Applied the one prose task: an above-fold highlight distinguishes wrapper SPDX metadata from the recorded account affirmation and states the limits of verification. No code task or new blocker was identified. The production-wrapper pilot and optional client cleanup remain companion work.

<details><summary>Full independent review</summary>

# Licenses polish strengthening review

The description makes the case for the feature without requiring the slides. No additional branch development is needed to support its current claims. One prose change would answer two likely scope misreadings before a reviewer opens the details sections. The production-wrapper pilot remains useful companion work, with its absence stated plainly rather than hidden.

Reviewed independently on 2026-10-25 against the draft at `/private/tmp/licenses-polish-20261025/pr_description.md` and the rebased `licenses` source over `origin/dev` `c93175dc985`. Source inspection covered declaration identity, binding precedence, acceptance persistence, tool execution preconditions, workflow discovery/pinning/scheduling, the asynchronous request path, the UI composable, and the corresponding lifecycle/API/browser tests. The coordinator owns the current test executions. This review does not claim to have run them again.

## Actionable task

1. Add a highlighted sentence above the details folds making two distinctions explicit: the existing wrapper SPDX `license` attribute remains independent, and this records the authenticated account's affirmation without verifying that the statement is true. Suggested wording: ***This records an account's affirmation of declared use terms. The wrapper's existing SPDX `license` metadata remains independent, and Galaxy does not verify the statement's truth.*** The current draft already explains these points in Context and Risk Review Advice, so this is a visibility improvement rather than a change of claim.

No code change is requested by this strengthening round.

## Likely misunderstandings

| Likely reading | Where the draft answers it | Highlight coverage |
|---|---|---|
| Every existing wrapper will start prompting | The first highlighted paragraph states tool-author opt-in and no new prompt for existing wrappers | Covered above folds |
| A workflow author's saved answer authorizes future runners | The problem example and first highlight explain each runner's own authorization | Covered above folds |
| The PR implements every licensing policy in #23261, including alternatives | The second highlight states unconditional, all-required scope and excludes input-dependent terms, OR entitlements and administrator acceptance | Covered above folds |
| This changes the wrapper's SPDX metadata or implements software-license classification | Context separates metadata/deployment policy, and the authoring guide distinguishes the existing `license` attribute | Add the suggested highlight |
| A stored record proves the statement is true or the terms legally adequate | Risk Review Advice states the limits of the recorded account action | Add the suggested highlight |
| Revocation cancels existing jobs or invalidates a one-time workflow affirmation | The behavior table and enforcement details explain submission lifetime, scheduled-step rechecks and preserved one-time authorization | Adequately explained in the behavior-specific details |
| A production wrapper has already been migrated | The screenshot caption names test wrappers, and risk/checklist text expressly says the pilot remains outstanding | Clear factual qualification beside the evidence |
| Slides are required reading to understand the feature | The draft contains its own problem, UI image, binding table, authoring example, failure behavior, risks and tests | The slides appear only as the line-two link |

## Claims checked against the implementation

- `tool_util/license_agreements.py` hashes canonical terms and affirmation with a versioned schema. Display metadata and `binds` are excluded. `stricter_declaration` makes submission binding win when identical wording uses both scopes.
- The acceptance manager only permits persistent acceptance for user-bound declarations, derives current state from acceptance/revocation events, and associates each job with its authorization kind. The UI composable excludes remembered hashes from one-time hashes and records persistent acceptance before submission.
- `check_workflow_license_agreements` gathers nested declarations, validates submitted hashes and returns them by declaring step id. `run_request.py` pins the hashes belonging to each invocation's own steps. `workflow/modules.py` reconstructs the context for scheduling and maps a failed license precondition to `license_not_accepted`.
- `services/workflows.py` now composes current dev's installed-tool and completion-action checks with license authorization before building run configs. It preserves the before-history-creation contract described in the draft.
- `tools/execute.py` checks before output collection creation, and the default action checks before creating each job. The asynchronous service carries hashes to the worker and preserves a typed refusal in failed state. The dedicated asynchronous integration and browser tests cover that different failure point.
- The integration cases explicitly cover refused new-history creation, map-over side effects, nested invocations, shared agreements, revocation between request and scheduling, one-time authorization across restart, skipped steps, and preserved authorization for paused/resubmitted jobs.
- The draft distinguishes recorded October 22–23 hardening results from current polish verification. It does not present the historical browser/PostgreSQL results as freshly rerun tests or claim all live CI is green.

## Further development and scope

- A real wrapper pilot with maintainer/operator-reviewed terms would replace the stated fixture-only validation gap with adoption evidence. That changes a production wrapper and introduces an external terms-review decision. Offer it to John as companion work, rather than treating it as a required code fix in this branch's polish.
- Sharing the three forms' remembered-acceptance/submission choreography could reduce maintenance duplication, but the current paths support the draft's behavior and have tests. This cleanup does not strengthen the feature's evidence enough to justify expanding this polishing pass.
- Planemo one-time workflow support and the gxwf acceptance default remain recorded integration decisions. The draft already bounds those claims accurately. Conditional terms, alternative entitlements, administrator acceptance and a public authorization view would broaden the feature design.

The remaining human read-through and explicit author license confirmation should remain unchecked.

</details>
