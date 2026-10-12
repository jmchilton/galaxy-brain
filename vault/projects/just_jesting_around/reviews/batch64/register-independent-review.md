# RegisterForm — independent review, batch 64

Approve author commit `2508ae08e05d00b09e4e511dd1118ad320d917be` against pinned base `846fdc7466ed145ef8bab8fdf76a10bdb2c0476e`. Independent shuffled seed 640201 passes both original cases. All nine checks retain their original expectations, including request count, email/password payload values, and the operator warning's unsanitized HTML contract.

Native typed mounting installs the owned testing Pinia and fresh memory router through existing withPlugins. Automatic unmount precedes sanitizer call-history cleanup and Pinia disposal; mockClear retains the existing shared mock implementation. Required positive lookups improve failures, and emailField corrects the name to match the actual first input. The original commented-out login case remains inactive. No production changes, assertion weakening, unbounded helper, or evidenced new guidance gap found.
