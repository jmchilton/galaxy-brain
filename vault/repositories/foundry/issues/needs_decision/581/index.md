# #581 gxwf validate --connections crashes: `step.in is not iterable`

[Issue](https://github.com/galaxyproject/foundry/issues/581)

## Proposed labels

- `roadmap/off`: bug in upstream gxwf (`@galaxy-tool-util/cli`), not Foundry backbone or a step of one. No parent. Alt: `roadmap/substep` under #318 (draft-loop coordination) if John wants the gate tracked there.
- `priority/mvp`: `galaxy-workflow.gxwf.yml` (draft loop terminal artifact) can't be connection-validated; a real wiring defect reached live Galaxy uncaught.
- `agent/human`: fix lives in galaxy-tool-util-ts (John's repo), not a Foundry PR. Alt: `agent/research` to file/confirm upstream issue.
- `upstream/gxwf`: blocked until gxwf fixes dialect detection / `step.in` normalization.

## Derived status

`blocked` (upstream/gxwf).

## Findings

- No open PR/branch addresses it. #554 (draft-validate type-dump gotcha) is unrelated.
- Body: `gxwf validate --json --connections` throws at `toNative.js:429`, no JSON emitted. Format2 dict `in:` hits array-expecting `_extractConnections`.
- Comment: real root cause is format detection from `inputs:` shape alone. `gxwf draft-extract` writes `inputs:` as a LIST and `in:` as MAPPING, so own output fails own validator. Second entry point: `draft-validate --concrete --connections` (`draft-validate.js:165`). Workaround: rewrite `inputs:` list to mapping.
- Not checked against code: the bug is in the gxwf npm package, not the foundry clone.

## Next

- Blocked on: upstream gxwf fix. No upstream issue linked yet; file one in galaxy-tool-util-ts (greenlisted? check) and link it here.
- Meanwhile consider a note in `validate-galaxy-workflow` SKILL.md about the workaround.
