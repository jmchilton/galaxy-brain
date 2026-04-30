## Goal: Use gxwf to build validated workflows

We've spent months developing gxwf a toolkit for working with Galaxy native and "Format 2" workflows. Working with Galaxy workflows without the workflow editor and with the optimized "Format 2" workflow format should enable power users more easily develop workflows. As part of this project - we have a validation pipeline and JSON schemas for all tool steps and for the connections between them. Galaxy will reach near CWL levels of static validation and provides much more static validation than Nextflow, WDL, Snakemake, etc...

## Prior Art

The Galaxy skills directory has a Nextflow -> Galaxy workflow skill at /Users/jxc755/projects/worktrees/galaxy-skills/branch/wf_dev/nf-to-galaxy. We want to build a more decomposed set of skills that leverages gxwf to do static validation and to expose JSON schema for agents and enable more correct and more rapid creation of workflows. In addition to not taking advantage of static typing - I think this approach also doesn't leverage user defined tools.
## gxwf CLI

There is a TypeScript and a Python version of the CLI but we tried to give them the same interface. I'd like to develop against the TypeScript but ultimately prefer the Python version once the outstanding Galaxy PR can be merged. Both CLIs should be considered Greenfield - this is a primary application of the work, it should work cleanly.

## Deliverables

### Skills

A number of composable skills would be ideal. /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/KNOWLEDGE_BASE.md describes the **Galaxy Workflow Foundry** (the knowledge base) and **Molds** (abstract templates that are *cast* into concrete skills).
#### discover-shed-tool Mold

We've added the relevant pieces to gxwf in both Python and TypeScript versions. The Mold wraps `gxwf tool-search` / `tool-versions` / `tool-revisions` and `galaxy-tool-cache`, encoding the heuristics that classify candidates (owner trust, version proximity, container availability, `+galaxyN` revision posture). Named for the *mechanism* (the Galaxy Tool Shed), not the goal — sibling Molds (`discover-tool-via-galaxy-api`, `discover-tool-on-github`) can slot in if other discovery sources are wrapped. Replaces the prior-art `find-shed-tool` skill design (`old/PLAN_SEARCH_CLI.md`) — that work feeds the Mold's content; the hand-authored skill form does not carry over. See `INITIAL_MOLDS.md`.

#### gxwf-cli and planemo-cli Molds

Whole-CLI Molds that roll up per-command **CLI manual pages** (under `content/cli/<tool>/`) into a structured runtime artifact (JSON manifest + thin procedural overview). Replaces the prior-art `~/.claude/skills/gxwf-cli` (a help-text dump). Per-action Molds (`discover-shed-tool`, `validate-with-gxwf`, `run-workflow-test`) reference individual manual pages directly; the whole-CLI cast is the standalone product for an agent that needs general competence with the CLI.
#### summarize-nextflow

Come up with a concrete, validatable format that pulls down all the nextflow files and links them. Describes the workflow test data. Describes tools, containers, etc... 
#### nextflow-summary-to-galaxy-data-flow

Output an abstract description of the data flow through a Galaxy workflow based on information in the skill.
#### nextflow-to-galaxy-template

Convert a nextflow summary and galaxy data flow analysis into a gxformat2 skeleton with TODOs for concrete steps.

#### nextflow-test-to-galaxy-tests

/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/COMPONENT_GALAXY_WORKFLOW_TESTING.md

#### summarize-galaxy-tool

Pull down the JSON schema for a tool, the containers, a description of the source, inputs, outputs, etc... This can be used to construct a step and isolate an agent consuming this output from "how to find the tool", "how to download the tool", "parse the XML", etc... 
#### implement-tool-step

Find a step in an abstraction gxformat2 workflow and convert it to a concrete step using the summarize-galaxy-tool.

### Knowledge Skills

I would hope progressive disclosure paired with content derived from the KB would let us design agents that have some specialities.
#### design-galaxy-tabular-manipulation

#### design-galaxy-collection-manipulation

#### design-galaxy-conditional-handling

#### design-custom-galaxy-tool

If we cannot find a matching Galaxy tool - Galaxy has user defined tools:

/Users/jxc755/projects/repositories/galaxy-brain/vault/research/PR 19434 - User Defined Tools.md
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/COMPONENT_NEXTFLOW_WORKFLOW_TESTING.md

### Harness

#### Architecture

We'd like a architecture for building harnesses that leverage the skills we outline above. One possibility is Archon.

https://github.com/coleam00/archon

#### NextFlow -> Galaxy Harness

We'd like to build a a NextFlow to Galaxy Harness that converts NextFlow workflows into Galaxy workflows. 

#### NextFlow -> CWL Harness

#### CWL -> Galaxy Harness

We'd like to build a a NextFlow to Galaxy Harness that converts NextFlow workflows into Galaxy workflows. 

