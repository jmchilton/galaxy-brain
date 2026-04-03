
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/CURRENT_STATE.md is the state of what we're working on and /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/PROBLEM_AND_GOAL.md is what we're working toward.

Lets add a deliverable to PROBLEM_AND_GOAL. I want full support for gxformat2 in the IWC pipeline, CI, website, etc...

----

Read and follow directions in /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/MEMORY.md to get up and running. Please review doc/source/dev/wf_tooling.md for some understanding of why things are inconsistent. I think I'd like to rename the CLI methods:
- galaxy-workflow-validate -> gxwf-state-validate
- galaxy-workflow-clean-stale-state -> gxwf-state-clean
- galaxy-workflow-roundtrip-validate -> gxwf-roundtrip-validate
- galaxy-workflow-export-format2 -> gxwf-to-format2-stateful

Then I'd like to start with the gxformat2 and work on making the workflows cohesive in the sense that this work feels like taking that work and adding state to the mix.

* I'd like to converge gxwf-to-format2 and gxwf-to-format2-stateful in CLI options and structure, etc... to whatever degree possible (maybe this is tough though).
* I'd like to implement gxwf-to-native-stateful on this side of things to reflect gxwf-to-native in gxformat2. Obviously it would try to reuse and callback and the functionality developed for roundtrip validate - so if we could refactor that out for reuse.
* I'd also like to make a gxwf-lint-stateful  that extends the functionality in gxformat2 but to include the stateful validation (the functionality from gxwf-state-valdiate).

Can you do some research and draw up a large plan for all of this. None of the code on the galaxy side has ever reached release state so we don't have worry about backward compatibility and in fact we should work hard to get the best abstractions and cleanest code we can now while we have freedom. The planning can and probably should include developments on the gxformat2 side of things.








Can you review 35819900a2d0bfb0cf74f019f453d194a2bd2285 in /Users/jxc755/projects/worktrees/gxformat2/branch/docs. It has setup some declarative testing for the normalized versions of the two workflow models. I'd like to extend the models we added in 089442769db2100771cce5d4029079cefe43fa5c - with normalized versions that mirror what we did in gxformat2 and that can rerun the declarative tests we setup there.

Can you draw up a plan for this on this side and let me know if there is anything we can do on the gxformat2 side of things to improve the ease of reuse of those models here. We already are syncing artifacts from gxformat2 and I think we will just want to expand that for testing here.



Can you review the "validation" modules in /Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state - this project is trying to replicate a lot of Python functionality in TypeScript. My understanding of the workflow validation is something like

---

Dispatch on Type:

- If Native, validate against the native schema and then walk the steps and validate the "tool_state" in each step against a dynamic schema of type workflow_state_native

- If format2, validate against format2 schema then walk the steps and validate the the "state" against the workflow_step and then migrate connections into the state and validate that against workflow_step_linked tool state. 

---

I'd like to expand our validation CLI in here to do these operations also. Can you come up with a plan for this. We have a CLI that does the out workflow shape validation and we have the ability to generate these dynamic models, and we have tool cache reading code that can use the tool structures bridging the workflows and the dynamic models.

Point at particular workflows. 


So I think 
/Users/jxc755/projects/repositories/galaxy-hub/ (https://github.com/galaxyproject/galaxy-hub) -> galaxyproject.org  and  /Users/jxc755/projects/repositories/iwc/website (https://github.com/galaxyproject/iwc) -> https://iwc.galaxyproject.org/. Represent the most updated Galaxy documentation styling / design principles. Galaxy itself /Users/jxc755/projects/repositories/galaxy/client -> https://github.com/galaxyproject/galaxy  usegalaxy.org has a related styling that these are sort of derived from. Can you have three subagents research the styling pipelines, decisions, principles, colors, typing, etc... for each of these projects and write out three reports on the styling in DESIGN_IWC.md DESIGN_HUB.md, and DESIGN_CORE.md.