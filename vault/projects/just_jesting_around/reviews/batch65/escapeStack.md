# Escape stack — batch 65

All five original cases and seven original checks remain. Existing fixtures and cleanup already read clearly, so no additional abstraction is introduced. The reopen scenario now closes the reopened layer and checks that the second layer becomes top, then closes it and checks that the first layer is absent. These two assertions establish removal of the old registration rather than merely moving a duplicate to the end.

A bounded source mutation removes closeEscapeLayer from openEscapeLayer: all five original cases pass, but the added check fails. Source and test are restored in finally; restored five cases pass. Both coverage runs retain the same four files and 20 covered source locations. No actual shared UI is rendered. No production/helper/support/guidance changes. Existing guidance suffices; independent normal review and integrated types remain driver gates.
