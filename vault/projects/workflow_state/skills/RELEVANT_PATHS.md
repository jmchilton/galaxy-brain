
## Foundry repo

Local clone:
/Users/jxc755/projects/repositories/foundry

GitHub:
https://github.com/jmchilton/foundry

Design docs (in repo): `docs/ARCHITECTURE.md`, `docs/HARNESS_PIPELINES.md`, `docs/MOLDS.md`, `docs/COMPILATION_PIPELINE.md`, `docs/CORPUS_INGESTION.md`, `docs/GXY_SKETCHES_ALIGNMENT.md`, `docs/COMPONENT_ARCHON.md`.

Glossary (terminology, agent-loaded): `content/glossary.md`.

Originals before move (preserved): `vault/projects/workflow_state/old/`.

## Adjacent projects

gxy-sketches — corpus of routing/decision-aid sketches distilled from nf-core + IWC; consumed by gxy3 (chat-driven app). Owned by another contributor; field-name parity is the only entanglement. See `docs/GXY_SKETCHES_ALIGNMENT.md` in foundry.
/Users/jxc755/projects/repositories/gxy-sketches

## Galaxy-brain-local notes (not Foundry)

Galaxy-brain influence reference (kept here, not in Foundry):
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/COMPONENT_GALAXY_BRAIN.md

Galaxy / Nextflow workflow-testing background research (Foundry-relevant; pending conversion to `research/component` notes):
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/COMPONENT_GALAXY_WORKFLOW_TESTING.md
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/COMPONENT_NEXTFLOW_WORKFLOW_TESTING.md

Prior art (reference, not carried forward):
- /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/SKILLS_NF.md
- /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/skills/SKILLS_REPORTS.md

## Corpus

IWC workflow fixtures (cleaned `gxformat2` versions):
/Users/jxc755/projects/repositories/workflow-fixtures
(consume `iwc-format2/` subdirectory)

## Tooling worktrees

Skill Development Worktree:
/Users/jxc755/projects/worktrees/galaxy-skills/branch/wf_dev

Galaxy / Python version of gxwf R&D Branch:
/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state

gxformat2 R&D Branch:
/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications

TypeScript gxwf R&D Branch:
/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/skills

## Existing skills (prior art being replaced)

`find-shed-tool` skill design — feeds the `discover-shed-tool` Mold; the hand-authored skill form does not carry over:
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/old/PLAN_SEARCH_CLI.md

`gxwf-cli` skill (help-text dump) — to be replaced by the `gxwf-cli` Mold + `content/cli/gxwf/` manual pages:
~/.claude/skills/gxwf-cli

## Research notes

User Defined Tools (PR 19434):
/Users/jxc755/projects/repositories/galaxy-brain/vault/research/PR 19434 - User Defined Tools.md

gxformat2 parsing & syntax:
/Users/jxc755/projects/repositories/galaxy-brain/vault/research/Component - gxformat2 Parsing and Syntax.md

Collection Tool Execution Semantics:
/Users/jxc755/projects/repositories/galaxy-brain/vault/research/Component - Collection Tool Execution Semantics.md
