
In general issues to Galaxy should be of the structure:

```
<AGENT_MARKER>

<OPENER> (see below)

For the main body (problem/issue/request/etc) - use best judgement.

## Context

(if needed - details below)

## Proposed Approach

(if supplied - details below)

## Alternative Approaches

(if supplied - details below)

```

## Openers

Every issue should open with a paragraph that is a single line.

Describe the bug and/or feature in a simple sentence that's easy to understand. 
## DO: If other issues, recent branches,  etc... provide useful context, add a fairly structured Context section.

Combine sentences into one short paragraph in a "## Context" section.

- Bug discovered while working on 🔀 #<pr_number>, ...   
- Bug discovered while working on 🌿<branch_name_and_link>, ...   
- Bug related to 🎯 #<issue_number> - describe relation in one simple phrase.
- An extension to 🔀 #<pr_number>, ...   
- A follow-up to 🔀 #<pr_number>, ...   

## DO NOT: Cite an agent as evidence.

- No "an agent found / says / agrees". Agreement between two agents is no evidence at all.
- If an agent surfaced the problem, reproduce it as a failing workflow or real example first. If you can't, don't file.
- Saying an agent was used is fine. Treating it as an authority isn't.
## DO: Use details liberally.

- Use detail tags and nested details also.
- Hide long tracebacks, logs and code walks in details. Don't include detailed code walks unless they're needed.
## DO: Lead with showing instead of telling.

If the main body can be front loaded with something visual - please make it so. If the bulk of it can be entirely visual - please make it so. See ./SHOW_ME_RULES.md for guidance.
## DO: Be persuasive.

The issue is a pitch. Readers should be convinced the problem is real or the feature is needed before any proposed fix.

## DO: Isolate Plans or Suggestions

Bug issues should describe problems and features should define the outcomes not list how to implement them. It is fine often to include a proposed plan or a preferred implementation approach but that should be contained in a "## Proposed Approach" section. If we're adding a proposed approach - use details liberally (see above) - the main approach should be at most a paragraph and the details placed in details.

## DO: If a proposed plan or approach is included - describe alternatives.

If "## Proposed Approach" is added to the issue - we must consider and document alternatives. 

```
## Alternative Approaches

(one paragraph describing alternatives and why we like ours)

<details><summary>Alternatives In Detail</summary>

### Alternative: Short Description

<details><summary>Description</summary>

#### Details

#### Why the proposed approach is preferred

</details>

</details>
```

