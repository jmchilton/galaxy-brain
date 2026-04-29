## Goal: Use gxwf to build validated workflows

We've spent months developing gxwf a toolkit for working with Galaxy native and "Format 2" workflows. Working with Galaxy workflows without the workflow editor and with the optimized "Format 2" workflow format should enable power users more easily develop workflows. As part of this project - we have a validation pipeline and JSON schemas for all tool steps and for the connections between them. Galaxy will reach near CWL levels of static validation and provides much more static validation than Nextflow, WDL, Snakemake, etc...

## Prior Art

The Galaxy skills directory has a Nextflow -> Galaxy workflow skill at /Users/jxc755/projects/worktrees/galaxy-skills/branch/wf_dev/nf-to-galaxy. We want to build a more decomposed set of skills that leverages gxwf to do static validation and to expose JSON schema for agents and enable more correct and more rapid creation of workflows. In addition to not taking advantage of static typing - I think this approach also doesn't leverage user defined tools.
## gxwf CLI

There is a TypeScript and a Python version of the CLI but we tried to give them the same interface. I'd like to develop against the TypeScript but ultimately prefer the Python version once the outstanding Galaxy PR can be merged. Both CLIs should be considered Greenfield - this is a primary application of the work, it should work cleanly.

## Deliverables

### Skills

A number of composable skills would be ideal.

#### find-shed-tool skill

We've added the relevant pieces to gxwf in both Python and TypeScript versions.

### Harness

#### Architecture

We'd like a architecture for building harnesses that leverage the skills we outline above. One possibility is Archon.

https://github.com/coleam00/archon

#### NextFlow -> Galaxy Harness

We'd like to build a a NextFlow to Galaxy Harness that converts NextFlow workflows into Galaxy workflows. 

#### NextFlow -> CWL Harness

#### CWL -> Galaxy Harness

We'd like to build a a NextFlow to Galaxy Harness that converts NextFlow workflows into Galaxy workflows. 

