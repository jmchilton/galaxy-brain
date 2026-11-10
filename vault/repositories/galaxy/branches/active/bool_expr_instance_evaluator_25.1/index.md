---
upstream_base_branch: release_25.1
---

# bool_expr_instance_evaluator_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:bool_expr_instance_evaluator_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/bool_expr_instance_evaluator_25.1)

## Status

Implemented; awaiting fork CI. `BooleanExpressionEvaluator` binds its `TokenEvaluator` per instance instead of on the shared `BoolOperand` class.

Base: `release_25.1` (`de6cd44b812`); worktree: `~/projects/worktrees/galaxy/branch/bool_expr_instance_evaluator_25.1`.

## Decisions

- John: frame as a shared-state bug fix in commits, PR text and records; no issue report.
