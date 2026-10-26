No refactoring of the base branch was performed.

The implementation contains no independently useful behavior-preserving refactor. `ToolOutputBaseModel` exists to hold the new parsed-only `filters` field across all six output variants; extracting an empty base ahead of the fix would add inheritance without serving an existing contract. The `filter_expressions` property similarly exists to convert filter elements for the three newly updated model-conversion paths; it has no baseline caller.

The history already keeps passing baseline tests first (`eb8e990c972`), followed by the cohesive serialization fix, regressions, and generated Tool Shed types (`90601b3bc4e`). No restructuring, implementation changes, or history rewrite was needed.
