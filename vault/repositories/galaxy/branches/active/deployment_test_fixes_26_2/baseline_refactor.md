No refactoring of the base branch was performed.

Fresh evaluation of the full expanded branch, `origin/release_26.2..9d5f0d32df8`, found no useful behavior-preserving refactoring to land before the fixes. The decorator return, exception propagation, capability guards, runner arguments, and documentation corrections directly restore or complete existing contracts.

The added typed `GalaxyTestSeleniumContext.register` override places the new-user runtime policy in the test framework and delegates browser behavior to the existing navigation implementation. Its forwarding is part of the guard's implementation; extracting or introducing a preparatory wrapper would add indirection without simplifying the fix. No shared navigation changes or prerequisite restructuring are needed.

The passing `Baseline tests` commit (`89b8cc3b93a`) remains first, followed by the fixes, test improvement, and registration guard. No code, commits, or branch history were changed during this evaluation.
