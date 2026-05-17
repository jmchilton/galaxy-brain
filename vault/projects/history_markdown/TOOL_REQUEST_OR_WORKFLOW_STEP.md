
We introduced tool requests "/Users/jxc755/projects/repositories/galaxy-brain/vault/research/Component - Tool State Specification.md" in large part to capture the concept that a single tool form submit in Galaxy could map to many jobs (which is all we captured before) but the abstract description of that execution is essential for reproducibility and traceability. We're working on two applications that leverage this: 

- "/Users/jxc755/projects/repositories/galaxy-brain/vault/research/PR 21932 - History Graph API.md"
- "/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/history_markdown/EXTRACT_TOOL_REQUEST_STATE_PLAN.md" (WIP right now by an agent in /Users/jxc755/projects/worktrees/galaxy/branch/graph_workflow_extract)

A big problem we immediately encountered is that workflow executions do not setup these ToolRequests. In some ways - you can imagine they don't really need to - the workflow step invocation maps back to the workflow step that captures very similar information.

I have a research question - I assume either way answer is viable but we need to pick one - should workflow invocations produce ToolRequests that mirror some of the work WorkflowInvocationStep does now or should we build abstractions that provide a layer that works across ToolRequests and WorkflowInvocationSteps. Both paths have some obvious design questions.

Some things to consider:
- ToolRequests already have a nice property that they are completely validated against our meta models. WorkflowInvocationSteps do not - but we're not going to just not run a workflowinvocationstep if the effective state is invalid. I guess either way we're going to need to somehow indicate whether the state is validated - but this can be done in either path.

Before I have you write up a whitepaper - can you do the research and assess the viability of both approaches. What are the big blockers, landmines we're going to hit in going both directions - if any. 