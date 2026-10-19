`pr_24262_review_0` sits on the reviewed commit `cece83167b7`. It moves the tag-save queue that `HistoryCard` and `WorkflowCard` each carried into one `useSerialTagSaves` composable, then simplifies the restore after the last save so it no longer needs `sameTags`. The PR's card and list tests are unchanged and pass (15/15) after each commit.

- `7cf62c963ca` Extract card tag-save queue into useSerialTagSaves — adds `client/src/composables/serialTagSaves.ts` and has both cards call it instead of keeping their own copy (P2 1).
- `73a590377f8` Always restore last saved tags after tag saves drain — drops the `sameTags` check, since writing back equal tags does no harm (P3 1).
