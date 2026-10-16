# Initial implementation

The branch is based exactly on upstream `dev` at `5ff1e46b8c38c704be8da75b4db05b3d56f93f3d`, as requested. Its [client CI run](https://github.com/galaxyproject/galaxy/actions/runs/38927523662) fails three tests in FormBoolean, FormCheck and FormOptionalText.

The GCheckbox migration made these inputs controlled. Each failing test assumes a toggle persists without the parent updating its value prop. Feed the already-asserted emission back into the prop before checking rendered state or performing the reverse toggle. Keep every emission assertion and the select-all checked assertion, and add DOM checks for the optional text field disappearing and returning empty.

Initial change: three test files, +10/-2 lines; no production change. Independent test challenge and normal review requested. Local red/green and broader client checks remain pending.
