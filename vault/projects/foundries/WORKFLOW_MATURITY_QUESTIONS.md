
Please answer these seven questions; terse numbered answers are fine:

  1. Should the maturation pipeline finish at a green PR to iwc-lab—with
     humans responsible for merge—or own post-merge deployment
     verification too? Is later promotion to canonical IWC explicitly out
     of scope for v1?

Let's stop it at green PR for now.

  2. Should iwc-lab publish native .gxwf.yml as its primary artifact,
     which would require repairing its Format-2 deployment support, or
     should maturation convert the workflow to .ga for IWC compatibility?

We're going to try to make do with .gxwf.yml but we expect there may be Dockstore limitations here - we should work through those when encountered and decide if we need an auto-generated .ga next to the gxwf.yml workflow.

  3. Must every lab submission have passing Planemo runtime tests, or may
     genuinely experimental workflows merge with explicitly recorded test
     limitations or failures?

Let's say we do require green tests - but we have to have an escape hatch in case we need to skip this step. Not sure what that should look like though.

  4. How much may the maturation agent change? My default would be
     automatic packaging and mechanical corrections, while tool choices,
     topology, defaults, assertions, and scientific semantics require
     human approval.

Let's allow test assertion and presentational elements to change also. But tool choices, the defaults, and the science should not. 

  5. How should review run initially: locally on demand, through manually
     requested native Copilot review, or through a label/manual-dispatch
     GitHub review workflow? My default is a fork-safe, advisory, label-
     triggered review that cannot approve, modify, or merge.

We have brought the Claude and Co-pilot prompts in as linked upstream prompts. Certainly running through at least the Claude one should be a step - is it a proper superset of the Co-pilot prompt?

  6. Should the review policy mirror IWC verbatim and track upstream
     changes, or should iwc-lab deliberately extend it with Format-2,
     Foundry provenance, semantic data-flow, test-strength, and nearest-
     IWC-workflow comparison criteria?

iwc-lab should not have a dependency on the foundry. The foundry review process maybe should include additional details like foundry-provenance, test-strength, etc... I'm not sure here.

  7. Where should the two deep issues live? My default is two primary
     pipeline issues in galaxyproject/foundry, with explicit linked
     prerequisite work in galaxyproject/iwc-lab for Format-2 support,
     branch protection, Actions permissions, and CI parity.

Let's say the final issues live on galaxyproject/foundry.
