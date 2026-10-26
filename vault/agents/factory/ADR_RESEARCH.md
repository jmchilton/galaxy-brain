# Critical Decision Points - Research

Idea: add a process step that builds a "critical decision points" doc for a branch. It would generalize what we already do for issue alternatives (`_shared/GX_ISSUE_DESCRIPTIONS.md`: one-paragraph verdict, detail in `<details>`) and scope alternatives (`_shared/GX_PROCESS_SCOPE_EVALUATION.md`).

## Existing skills

Nothing found handles the hard part, which is spotting which choices count as decisions. Most skills only write up a decision someone already named.

- **ADR skills (affaan-m/ECC, wshobson/agents, GitHub awesome-copilot):** claim to "auto-detect decision moments", then fill a template with context, alternatives, rationale and consequences. Detection is just a list of domains (security, testing, process). Ideas worth borrowing from ECC:
  - the planner suggests an ADR when it proposes an architecture change;
  - the reviewer flags PRs that change architecture without one.
- **Reversibility skills (decision-maker, "doors", ship-decisions):** classify decisions as one-way (hard to undo) or two-way (easy to undo) doors and scale the process to match.
- None of them is better than our current issue and scope patterns. Plan: write our own doc and borrow the criteria below.

## How to decide what counts

1. **Zimmermann's significance test.** Flag a choice if it:
   - affects business value or risk;
   - matters to a key stakeholder;
   - meets an unusual quality requirement;
   - depends on outside parties;
   - reaches across the whole system;
   - is new to the team;
   - touches an area with past trouble.
2. **Reversibility.** Ask "could this be undone in a sprint without heroics?" Treat it as a scale, not yes/no. The usual failure is treating a hard-to-undo choice as easy to undo, like a temporary schema that other code starts depending on. More questions:
   - How many things break if it's wrong?
   - Does it make outside promises (API, persisted data)?
   - Can it be rolled back?
3. **The "future engineer" test.** Would a future maintainer or a reviewer ask why it was done this way? Skip choices between equivalent options and local naming.
4. **Look where the evidence is.** Research: about 9-14% of review comments are about design, and classifiers can find them. For an agent, that means mining the places where a choice happened:
   - plan drafts and review-agent notes;
   - abandoned approaches (`earlier_drafts/`, `alts/`);
   - spots where the code departs from an existing pattern.

## Galaxy triggers (draft)

- **Reuse vs new abstraction:** extended an existing one, or added a new one? Always a candidate.
- **Hard-to-undo surfaces:** API or schema shape, database migrations, tool XML or workflow format, config options, persisted state.
- **Target branch and compatibility:** release vs dev, deprecation path.
- **Test layer:** unit, API or Selenium, and why.
- **Departures:** where the branch differs from the issue's proposed approach or a reviewer's suggestion.
- **Scope:** keep the scope evaluation as its own step; put its outcome in the doc as one entry.

## Possible doc shape

Same progressive disclosure as issue descriptions. Each entry gets:

- a one-line decision in Y-statement form: "In context X, facing Y, we chose A over B and C, to achieve Z, accepting W";
- a reversibility grade;
- a "reviewer should check" line;
- the alternatives inside `<details>`.

Rank the entries, keep only the top 3-7, and drop the rest.

## Open questions

- Which step creates it: plan, after implementation, or harden? Is it reviewed?
- Does it replace the issue's alternatives section and the scope eval, or link to them?
- Does it go in the PR body (collapsed) or stay only in the branch record?
- Cap on entries?

## Sources

- [tessl ADR skill review](https://tessl.io/registry/tdg-personal/architecture-decision-records/quality)
- [ECC ADR skill](https://claudemarketplaces.com/skills/affaan-m/everything-claude-code/architecture-decision-records)
- [wshobson ADR skill](https://vibeindex.ai/skills/wshobson/agents/architecture-decision-records)
- [awesome-copilot ADR skill](https://claudemarketplaces.com/skills/github/awesome-copilot/create-architectural-decision-record)
- [Zimmermann - Any Decision Records](https://ozimmer.ch/practices/2021/04/23/AnyDecisionRecords.html)
- [Zimmermann - AD adoption model](https://ozimmer.ch/practices/2023/04/21/ADAdoptionModel.html)
- [arc42 section 9](https://docs.arc42.org/section-9/)
- [hackernoon ADR guide](https://hackernoon.com/architecture-decision-records-adrs-a-beginners-guide)
- [practical.li ADR](https://practical.li/engineering-playbook/software-design/architecture/adr/)
- [Y-statements](https://medium.com/@docsoc/y-statements-10eb07b5a177)
- [Latent design info in PRs (TSE)](https://unpaywall.org/10.1109%2FTSE.2019.2924006)
- [Design discussions in code review](https://swag.uwaterloo.ca/publications/an-empirical-study-of-design-discussions-in-code-review.html)
- [Plannotator: why AI PRs are harder to review](https://docs.plannotator.ai/learn/code-review/why-ai-generated-pull-requests-are-harder-to-review)
- [thoughtbot one/two-way doors](https://thoughtbot.com/blog/one-way-vs-two-way-door-decisions)
- [Cleverence reversibility](https://www.cleverence.com/amp/articles/business-blogs/how-to-design-decisions-for-reversibility-6382/)
- [Source Allies](https://www.sourceallies.com/2025/08/run-the-experiment)
- [decision-maker skill](https://playbooks.com/skills/omer-metin/skills-for-antigravity/decision-maker)
- [doors skill](https://skills.cat/skills/askarzh/epistemator/doors)
