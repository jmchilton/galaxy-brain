# galaxy #23866 — Coerce pattern-discovered extensions that are not datatypes to data

[PR #23866](https://github.com/galaxyproject/galaxy/pull/23866) · Status: active; open draft. GitHub state checked 2026-10-11.

[Review and history](review.md)

PR head at the migration: `cc0df330aff`. The migration refreshed tracking, not the code review.

Tracking: Draft; requested changes; ball with author.

Prior queue tracking: author converted to draft 10-03; user requested changes (pattern-captured unknown ext should match explicit tool-XML unknown format handling); ball with author

Morning check 2026-10-11: live HEAD `dbfcec59a427eb40a3d05ce13d93aa7f258fb58e`; still draft, 58 successful checks and 3 skipped. John [replied on 2026-10-10](https://github.com/galaxyproject/galaxy/pull/23866#issuecomment-6103113910) that falling back to `data` is acceptable if applied uniformly. No newer reply; ball with author. This refresh is not a re-review of the changed head.

Delivery check 2026-10-11: PR is now ready for review, live HEAD still `dbfcec59a427eb40a3d05ce13d93aa7f258fb58e`. Marius [reports that job messages identify the wrong extension and all finish modalities are covered](https://github.com/galaxyproject/galaxy/pull/23866#issuecomment-6110418028). Latest CI: 59 successful checks, 3 skipped. Follow-up verification is pending; the previous draft hold no longer applies.
