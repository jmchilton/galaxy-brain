The review's deleted-role compatibility finding was fixed; nested/native/linked detection coverage and a passing real managed run were added.

Not acted on: direct TRS imports have no local workflow to inspect and remain outside this local-workflow change.

## Details

The review confirmed that Galaxy 26.1 already supports importing embedded user tools and exposes the required role APIs. No Galaxy core change is needed for the reported path.

Galaxy 26.1 includes deleted roles in the user-role response without their deletion state. Provisioning now intersects candidate role IDs with active roles before reusing permission.

The HTTP tests check the role type, assigned user, admin credentials, user credentials for workflow import, existing-role reuse, deleted-role replacement, and absence of provisioning for external engines and ordinary workflows. The real managed run against pristine Galaxy dev passed 1/1, including output assertion.
