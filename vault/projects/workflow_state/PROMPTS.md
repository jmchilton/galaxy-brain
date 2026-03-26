
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/CURRENT_STATE.md is the state of what we're working on and /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/PROBLEM_AND_GOAL.md is what we're working toward.

Lets add a deliverable to PROBLEM_AND_GOAL. I want full support for gxformat2 in the IWC pipeline, CI, website, etc...

----


/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/CURRENT_STATE.md is the state of what we're working on and /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/PROBLEM_AND_GOAL.md is what we're working toward.
Commit 2179357eb14b75e264af67c815f1892b026bedb5 introduces some test cases for cases when artifacts are introduced when we round-trip convert from native workflow format -> format2 -> back. Commit 1a480a3ea4bd70964e167939ca485f55665cd6b1 introduced a taxonomy of what some mismatches look like. Do we have good coverage in the tests for the kinds of mismatches that we're seeing.  Can we update the mismatches to point at particular tests to prove they are benign? 

----

You with your current context is a pro at running the roundtrip native to gxformat2 to native code on workflows and native to gxformat2 conversion. I have another agent who I've used to create branches on my fork of the IWC, using the clean stale state stuff, and open pull requests. Can you give a blurb to give them about the two operations I listed there so I can have them build a general skill for this.

------

/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/CURRENT_STATE.md is the state of what we're working on and /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/PROBLEM_AND_GOAL.md is what we're working toward. Planemo will be the ultimate user-facing CLI application for all this work - but our CLIs are useful for debugging and developing the features we're going to expose there.

Can you look at Planemo workflow lint's source code - /Users/jxc755/projects/repositories/planemo/planemo/workflow_lint.py (mostly _lint_best_practices). I think everything about linting publication artifacts, the repository, etc... belong in Planemo but Planemo should not be parsing workflows - the best practices around workflow linting should be available via a CLI gxwf-lint that is a CLI wrapper around a linting module. Can you plan out this refactoring? I have a vague idea that we should create a pydantic model in this project and not have the linter stuff - since we don't depend on galaxy-tool-util - but then Planemo should adapt our pydantic model to the linting framework.

------

Abstractions:

We've implement gxformat2 and native workflows in gxformat2/schema. 

They are working well for validation - but I'd like to also use them in other contexts. I think this means having an abstraction that we can use to allow lax variants of these workflows. I'm imagining load_native(dict, strict: boolean) -> NativeGalaxyWorkflow.

By default it would just do a normal load to pydantic. But if strict is false - we can work around some bugs. One is https://github.com/galaxyproject/iwc/pull/1167/changes - allowing tags to be "" and convert that to [].

Looking over the code is there any place such an abstraction would be useful and would help have more typed, cleaner code? 

------------

/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/CURRENT_STATE.md is the state of what we're working on and /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/PROBLEM_AND_GOAL.md is what we're working toward. We've written just an unbelievable amount of code here - can you create some subagents to do some deep research on abstractions so we have a basis that we can use to start to think about refactoring across projects.

Have one subagent review gxformat2 and summarize its abstractions for dealing with workflows and write them out to ABSTRACTIONS_GXFORMAT2.md.
Have another subagent review the abstractions patterns we use in this workflow_state module to walk, edit, convert workflows, etc... and write this out to ABSTRACTIONS_WORKFLOW_STATE.md, finally have another subagent review workflow_state branch and start to generate ideas for converging the existing code into reusable abstractions. 


