Profile: `learning_galaxy` | Model: Claude Fable 5.2 | Effort: medium | Reviewed commit: `5bdf34ea9ad057d551ec1812c7745e8267097c45`

Not architecturally interesting.

The PR swaps `BFormInput` for the existing `GFormInput` in seven client components and adds unit tests. It is one step of the migration tracked in galaxyproject/galaxy#23812 and introduces no new framework, manager, API, or shared abstraction.
