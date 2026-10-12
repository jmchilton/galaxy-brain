# Tool utilities — batch 65

All three original cases and seven assertions remain unchanged: one clipboard write, the tool ID and root boundary, space encoding and retained plus characters. Scoped beforeEach installs the clipboard stand-in and afterEach restores its exact original descriptor or absence. Direct writeText mock setup removes an unnecessary mock-type cast; module evaluation no longer permanently overwrites navigator.clipboard.

Pristine and final shuffled seed 650101 pass three cases. Covered source comparison retains the same eight files and 24 covered source locations. No UI is rendered; this suite exercises the clipboard/tool-link contract. No production, helper, supporting or guidance change. Existing guidance on owned global cleanup applies directly. Full client types and independent normal review remain driver gates.
